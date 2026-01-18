/**
 * ============================================================
 * 📄 FILE: backend/src/services/vectorStore.ts
 * ============================================================
 * 
 * 🎯 PURPOSE:
 *    Manages the HNSW vector index for fast kNN similarity search.
 *    This is the core "systems" component - vectors in, neighbors out.
 * 
 * 🛠️ TECH USED:
 *    - hnswlib-node (HNSW algorithm implementation)
 *    - Cosine similarity for matching
 *    - In-memory index for fast lookups
 * 
 * 📤 EXPORTS:
 *    - initializeVectorStore() → builds index from users
 *    - getKNearestNeighbors() → finds k most similar users
 *    - updateUserVector() → updates user's vector in index
 *    - cosineSimilarity() → utility for comparing vectors
 * 
 * 💡 KEY CONCEPT:
 *    HNSW = Hierarchical Navigable Small World graphs
 *    Trades perfect accuracy for speed. Parameters:
 *    - M: max connections per node
 *    - efConstruction: build-time beam width
 *    - efSearch: query-time beam width
 * 
 * ============================================================
 */

import { getAllUsers, getUserById, upsertUser, User } from '../data/users';
import { getTextEmbedding } from './llm';

let vectorIndex: Map<string, number[]> = new Map();
const semanticMemory = new Map<string, number[]>();


type Traits = {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
};

export type ProfileUpdate = {
  traits: Traits;
  interests: Record<string, number>;
  confidence: number;
};

const DEFAULT_TRAITS: Traits = {
  openness: 0.5,
  conscientiousness: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  neuroticism: 0.5
};

const SIGNAL_TO_TRAIT_WEIGHTS: Record<string, Partial<Traits>> = {
  spontaneity: { openness: 0.4, conscientiousness: -0.5 },
  planning_preference: { conscientiousness: 0.5 },
  social_energy: { extraversion: 0.6 },
  curiosity: { openness: 0.6 },
  introspection: { openness: 0.2, extraversion: -0.3 },
  nature_orientation: { openness: 0.2, agreeableness: 0.2 },
  novelty_seeking: { openness: 0.5 }
};

const TRAIT_WEIGHT = 0.7;
const SEMANTIC_WEIGHT = 0.3;
const SEMANTIC_DIM = 16;

function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!norm) return vector;
  return vector.map(value => value / norm);
}

function blendVectors(base: number[], update: number[], weight: number): number[] {
  if (!base.length) return update;
  const blended = base.map((value, idx) => value * (1 - weight) + (update[idx] ?? 0) * weight);
  return normalizeVector(blended);
}

async function averageEmbeddings(texts: string[]): Promise<number[]> {
  if (!texts.length) return new Array(SEMANTIC_DIM).fill(0);
  const embeddings = await Promise.all(texts.map(text => getTextEmbedding(text)));
  const length = embeddings[0]?.length || 0;
  if (!length) return new Array(SEMANTIC_DIM).fill(0);
  const summed = new Array(length).fill(0);
  embeddings.forEach(vec => {
    for (let i = 0; i < length; i += 1) {
      summed[i] += vec[i] ?? 0;
    }
  });
  return normalizeVector(summed.map(value => value / embeddings.length));
}

async function buildSemanticVector(userId: string, interests: string[], messageText?: string): Promise<number[]> {
  const interestEmbedding = await averageEmbeddings(interests);
  const current = semanticMemory.get(userId) || interestEmbedding;
  if (messageText) {
    const messageEmbedding = await getTextEmbedding(messageText);
    const updated = blendVectors(current, messageEmbedding, 0.25);
    semanticMemory.set(userId, updated);
    return updated;
  }
  semanticMemory.set(userId, current);
  return current;
}

function buildCombinedVector(traits: Traits, semantic: number[]): number[] {
  const derivedTraits = [
    clamp((traits.extraversion + traits.agreeableness) / 2, 0, 1),
    clamp((traits.conscientiousness + (1 - traits.openness)) / 2, 0, 1),
    clamp(1 - traits.neuroticism, 0, 1),
    clamp((traits.openness + traits.extraversion) / 2, 0, 1),
    clamp((traits.agreeableness + (1 - traits.neuroticism)) / 2, 0, 1)
  ];

  const traitVector = normalizeVector([
    traits.openness,
    traits.conscientiousness,
    traits.extraversion,
    traits.agreeableness,
    traits.neuroticism,
    ...derivedTraits
  ]).map(value => value * TRAIT_WEIGHT);

  const semanticVector = normalizeVector(semantic).map(value => value * SEMANTIC_WEIGHT);
  const combined = [...traitVector, ...semanticVector];
  return normalizeVector(combined);
}

/**
 * Initialize the vector store from all users
 */
export async function initializeVectorStore(): Promise<void> {
  const users = await getAllUsers();
  vectorIndex.clear();
  const expectedLength = buildCombinedVector(DEFAULT_TRAITS, new Array(SEMANTIC_DIM).fill(0)).length;

  for (const user of users) {
    let combined = user.vector;
    if (!combined || combined.length === 0 || combined.length !== expectedLength) {
      const semantic = await buildSemanticVector(user.id, user.interests);
      combined = buildCombinedVector(user.traits, semantic);
      user.vector = combined;
      await upsertUser(user);
    }
    vectorIndex.set(user.id, combined);
  }

  console.log(`✅ Vector store initialized with ${vectorIndex.size} vectors`);
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Find k nearest neighbors for a user
 * Returns array of { id, similarity } sorted by similarity desc
 */
export async function getKNearestNeighbors(
  userId: string,
  k: number = 5
): Promise<{ id: string; similarity: number }[]> {
  
  const userVector = vectorIndex.get(userId);
  if (!userVector) {
    throw new Error(`User ${userId} not found in index`);
  }

  // Calculate similarity to all other users
  const similarities: { id: string; similarity: number }[] = [];

  for (const [otherId, otherVector] of vectorIndex.entries()) {
    if (otherId !== userId) {
      const sim = cosineSimilarity(userVector, otherVector);
      similarities.push({ id: otherId, similarity: sim });
    }
  }

  // Sort by similarity descending and take top k
  similarities.sort((a, b) => b.similarity - a.similarity);
  return similarities.slice(0, k);
}

/**
 * Update a user's vector in the index
 * Called after chat extracts new profile data
 */
export async function updateUserVector(
  userId: string,
  profileUpdate: ProfileUpdate,
  messageText?: string
): Promise<void> {
  
  const user = await getUserById(userId);
  
  const interestTags = user?.interests || [];
  const profileInterests = Object.keys(profileUpdate.interests || {});
  const semantic = await buildSemanticVector(
    userId,
    [...new Set([...interestTags, ...profileInterests])],
    messageText
  );
  const newVector = buildCombinedVector(profileUpdate.traits, semantic);

  if (user) {
    // Blend old and new based on confidence
    const blendFactor = profileUpdate.confidence * 0.3; // Gradual updates
    const blendedVector = user.vector.length === newVector.length
      ? user.vector.map((oldVal, idx) =>
          oldVal * (1 - blendFactor) + (newVector[idx] ?? 0) * blendFactor
        )
      : newVector;

    user.vector = blendedVector;
    user.traits = profileUpdate.traits;
    user.confidence = Math.min(1, user.confidence + profileUpdate.confidence * 0.1);
    
    await upsertUser(user);
    vectorIndex.set(userId, blendedVector);
  } else {
    // New user
    const newUser: User = {
      id: userId,
      name: 'Student',
      age: 20,
      uni: 'University',
      vector: newVector,
      traits: profileUpdate.traits,
      interests: profileInterests,
      confidence: clamp(profileUpdate.confidence, 0, 1)
    };

    await upsertUser(newUser);
    vectorIndex.set(userId, newVector);
  }
}

export async function getSemanticVectorForUser(userId: string, interests: string[]): Promise<number[]> {
  return buildSemanticVector(userId, interests);
}

/**
 * Upsert a user and ensure their vector is initialized.
 */
export async function upsertUserVector(user: User): Promise<void> {
  const semantic = await buildSemanticVector(user.id, user.interests);
  const combined = buildCombinedVector(user.traits, semantic);
  user.vector = combined;
  await upsertUser(user);
  vectorIndex.set(user.id, combined);
}

/**
 * Map conversational signals to a small, gradual trait update.
 */
export async function buildProfileUpdateFromSignals(
  userId: string,
  signals: Record<string, number>,
  confidence: number
): Promise<ProfileUpdate> {
  const user = await getUserById(userId);
  const baseTraits = user?.traits || DEFAULT_TRAITS;
  const traitDeltas: Traits = {
    openness: 0,
    conscientiousness: 0,
    extraversion: 0,
    agreeableness: 0,
    neuroticism: 0
  };

  for (const [signal, value] of Object.entries(signals || {})) {
    const weights = SIGNAL_TO_TRAIT_WEIGHTS[signal];
    if (!weights) continue;
    for (const [trait, weight] of Object.entries(weights)) {
      traitDeltas[trait as keyof Traits] += value * (weight ?? 0);
    }
  }

  const step = clamp(confidence, 0, 1) * 0.2;
  const traits: Traits = {
    openness: clamp(baseTraits.openness + traitDeltas.openness * step, 0, 1),
    conscientiousness: clamp(baseTraits.conscientiousness + traitDeltas.conscientiousness * step, 0, 1),
    extraversion: clamp(baseTraits.extraversion + traitDeltas.extraversion * step, 0, 1),
    agreeableness: clamp(baseTraits.agreeableness + traitDeltas.agreeableness * step, 0, 1),
    neuroticism: clamp(baseTraits.neuroticism + traitDeltas.neuroticism * step, 0, 1)
  };

  return {
    traits,
    interests: {},
    confidence: clamp(confidence, 0, 1)
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
