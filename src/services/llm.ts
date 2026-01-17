/**
 * ============================================================
 * 📄 FILE: backend/src/services/llm.ts
 * ============================================================
 * 
 * 🎯 PURPOSE:
 *    Handles all OpenAI API interactions for the chatbot.
 *    Uses structured output to extract conversational signals from chat.
 *    The LLM is just a "friendly UI" - it doesn't decide matches.
 * 
 * 🛠️ TECH USED:
 *    - OpenAI SDK v4 (official Node.js client)
 *    - GPT-4 with JSON mode for structured extraction
 *    - System prompt engineering for consistent output
 * 
 * 📤 EXPORTS:
 *    - chatWithBot() → sends message, returns response + profile update
 * 
 * ⚠️ REQUIRES:
 *    - openaikey or OPENAI_API_KEY in .env file
 * 
 * ============================================================
 */

import OpenAI from 'openai';
import { getKNearestNeighbors } from './vectorStore';
import { getUserById, getAllUsers } from '../data/users';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.openaikey || process.env.OPENAI_API_KEY || ''
});

const EMBEDDING_DIM = 16;
const embeddingCache = new Map<string, number[]>();

// Type definitions
export interface ProfileUpdate {
  traits: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  interests: Record<string, number>;
  confidence: number;
}

export interface Itinerary {
  wednesday_study: { theme: string; location_hint: string; plan: string[] };
  friday_social: { theme: string; location_hint: string; plan: string[]; optional: true };
}

export interface SignalResponse {
  assistantMessages: string[];
  nextTopic: string;
  signals: Record<string, number>;
  confidence: number;
  done: boolean;
  itinerary?: Itinerary;
}

function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!norm) return vector;
  return vector.map(value => value / norm);
}

function hashEmbedding(text: string): number[] {
  const clean = text.toLowerCase().trim();
  const values = new Array(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < clean.length; i += 1) {
    const code = clean.charCodeAt(i);
    values[i % EMBEDDING_DIM] += (code % 31) / 31;
  }
  return normalizeVector(values);
}

export async function getTextEmbedding(text: string): Promise<number[]> {
  const key = text.toLowerCase().trim();
  if (!key) return new Array(EMBEDDING_DIM).fill(0);
  const cached = embeddingCache.get(key);
  if (cached) return cached;

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: key
    });
    const embedding = response.data[0]?.embedding?.slice(0, EMBEDDING_DIM) ?? [];
    const normalized = embedding.length ? normalizeVector(embedding) : hashEmbedding(key);
    embeddingCache.set(key, normalized);
    return normalized;
  } catch (error) {
    const fallback = hashEmbedding(key);
    embeddingCache.set(key, fallback);
    return fallback;
  }
}

export interface SessionContext {
  asked_topics: string[];
  collected_signals: string[];
  stage: 'warmup' | 'preferences' | 'group-fit' | 'wrapup';
  turn_count: number;
  allowed_topics: string[];
}

// Base system prompt for the onboarding chatbot
const BASE_SYSTEM_PROMPT = `You are a friendly onboarding buddy for a university social app.
You are NOT a therapist and NOT an AI companion.
You have one job: chat naturally and extract structured signals.

Core behavior:
- Feel like a slightly playful peer (not therapist, not chatbot).
- Ask follow-up questions naturally based on the user's last answer.
- Probe how someone thinks, not just what they think.
- Keep the conversation flowing (not "Q1, Q2, Q3").
- Never decide matches.
- Never reference embeddings, vectors, clustering, or matching logic.

Tone:
- Friendly, warm, slightly playful.
- Curious without interrogating.
- Short replies (1–4 sentences).
- No emojis, no slang overload.

Conversation rules:
- Do NOT ask a fixed list of questions.
- Let each question emerge from the user's previous answer.
- Ask unconventional, open-ended questions that reveal how they think and socialize.
- Avoid sensitive personal data (finances, medical, exact address, etc).

Your task each turn:
1) Respond naturally to the user.
2) Extract soft semantic signals from what the user said.

You must ALWAYS output a single JSON object and nothing else:
{
  "assistantMessages": [
    "Oh that's interesting.",
    "Btw-what do you think about XYZ?"
  ],
  "nextTopic": "planning",
  "signals": {
    "<signal_name>": number
  },
  "confidence": number
}

Signal rules:
- Values are in [-0.5, +0.5].
- Only include signals clearly implied.
- If uncertain, include fewer signals with smaller magnitudes.
- If nothing meaningful can be extracted, return an empty signals object and low confidence.
- Each turn extracts max 3 signals.
- Keep deltas small and gradual across turns.
- Limit the overall signal vocabulary to 8-10 total (for example: spontaneity, planning_preference, social_energy, curiosity, introspection, nature_orientation, novelty_seeking).

Return 1-3 short assistantMessages; each should be 1 sentence.
The first message should react to the user.
If you include a question, put it in the last message.

Anti-repeat rule:
- You will be given asked_topics and collected_signals.
- Do NOT ask about any topic already in asked_topics.
- Prefer questions that target signals not in collected_signals.
- If the user already answered something, acknowledge it and move forward.

You must include "nextTopic" chosen from the allowed list.
Never repeat a nextTopic that is already in asked_topics.

Hard boundaries (must follow):
- You are NOT a therapist and must not provide mental-health counseling.
- If the user asks for therapy, diagnosis, or emotional crisis support, respond briefly:
  acknowledge + say you can't help with that + suggest they talk to a trusted person or campus support services.
- Do NOT ask for or encourage sharing of sensitive personal data (exact address, phone number, finances, medical info, immigration status, etc).
- If the user shares sensitive info, do not repeat it; gently steer back to safe topics.
- No romance/dating framing; this is strictly friend-making.

University-only + safety context:
- Assume meetups are within university communities.
- Default meetup location is on-campus public spaces.
- Avoid suggesting private residences.

Scheduling model (fixed cadence; no complex planning):
- The app only forms circles of 5 and proposes two recurring meetup types:
  1) Wednesday night: on-campus study session (default)
  2) Friday night: optional drinks / casual hangout outside campus (only if they are comfortable)
- Do not ask for exact availability or negotiate times; instead ask preference questions like:
  "Are you more into a quiet study session or a social hang after?"
  "Would you prefer Friday to be drinks, dessert, or just a chill chat?"

Itinerary output behavior:
- When you have enough confidence (confidence >= 0.75) OR after ~8-12 user messages, you must return an "itinerary" field
  describing the two default meetups for the user's circle of 5.
- The itinerary must be high-level and safe: only general locations (e.g., "campus library", "student lounge", "near campus").
- The itinerary must NOT include addresses or personal contact info.
{
  "assistantMessages": ["...","..."],
  "nextTopic": "planning",
  "signals": { "spontaneity": 0.1 },
  "confidence": 0.78,
  "done": true,
  "itinerary": {
    "wednesday_study": { "theme": "...", "location_hint": "...", "plan": ["...","..."] },
    "friday_social": { "theme": "...", "location_hint": "...", "plan": ["...","..."], "optional": true }
  }
}

Goal:
Help the user feel understood through conversation while producing structured, explainable signals.`;

/**
 * Retrieve similar users for RAG context
 */
async function getSimilarUsersContext(userId: string, k: number = 3): Promise<string> {
  try {
    const user = await getUserById(userId);
    if (!user) {
      // New user, return examples from all users
      const allUsers = await getAllUsers();
      const examples = allUsers.slice(0, k).map(u => ({
        name: u.name,
        age: u.age,
        uni: u.uni,
        interests: u.interests.slice(0, 5).join(', ')
      }));
      
      return `Here are examples of user profiles in the community:
${examples.map((ex, i) => `${i + 1}. ${ex.name} (${ex.age}, ${ex.uni}) - Interests: ${ex.interests}`).join('\n')}`;
    }

    // Retrieve similar users
    try {
      const neighbors = await getKNearestNeighbors(userId, k);
      const fetched = await Promise.all(neighbors.map(n => getUserById(n.id)));
      const similarUsers = fetched
        .filter((u): u is NonNullable<typeof u> => u !== null)
        .slice(0, k)
        .map(u => ({
          name: u.name,
          age: u.age,
          uni: u.uni,
          interests: u.interests.slice(0, 5).join(', '),
          similarity: neighbors.find(n => n.id === u.id)?.similarity || 0
        }));

      if (similarUsers.length === 0) {
        // Fallback to examples
        const allUsers = await getAllUsers();
        const examples = allUsers.slice(0, k).map(u => ({
          name: u.name,
          age: u.age,
          uni: u.uni,
          interests: u.interests.slice(0, 5).join(', ')
        }));
        
        return `Here are examples of user profiles in the community:
${examples.map((ex, i) => `${i + 1}. ${ex.name} (${ex.age}, ${ex.uni}) - Interests: ${ex.interests}`).join('\n')}`;
      }

      return `Here are similar users in the community that share interests/traits:
${similarUsers.map((u, i) => `${i + 1}. ${u.name} (${u.age}, ${u.uni}) - Interests: ${u.interests}`).join('\n')}

Use these as context to understand what kinds of people exist in the community, but don't mention specific names to the user.`;
    } catch (neighborError) {
      // User might not be in vector index yet, fallback to examples
      const allUsers = await getAllUsers();
      const examples = allUsers.slice(0, k).map(u => ({
        name: u.name,
        age: u.age,
        uni: u.uni,
        interests: u.interests.slice(0, 5).join(', ')
      }));
      
      return `Here are examples of user profiles in the community:
${examples.map((ex, i) => `${i + 1}. ${ex.name} (${ex.age}, ${ex.uni}) - Interests: ${ex.interests}`).join('\n')}`;
    }
  } catch (error) {
    console.error('Error retrieving similar users:', error);
    // Final fallback: return empty string if everything fails
    return '';
  }
}

/**
 * Send a message to the chatbot and get structured response (with RAG)
 */
export async function chatWithBot(
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  userId?: string,
  sessionContext?: SessionContext,
  extraSystemPrompt?: string
): Promise<SignalResponse> {
  
  // Retrieve similar users for RAG context
  let ragContext = '';
  if (userId) {
    ragContext = await getSimilarUsersContext(userId, 3);
  }

  // Build system prompt with RAG context
  const systemPrompt = ragContext 
    ? `${BASE_SYSTEM_PROMPT}\n\n## Community Context (for your reference only)\n${ragContext}\n\nRemember: Don't mention specific user names, but use this context to understand what interests and personalities exist in the community.`
    : BASE_SYSTEM_PROMPT;

  // Build messages array
  const contextBlock = sessionContext
    ? `\n\n## Session Context (do not reveal to user)\n${JSON.stringify(sessionContext)}`
    : '';

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: `${systemPrompt}${contextBlock}` }
  ];

  if (extraSystemPrompt) {
    messages.push({ role: 'system', content: extraSystemPrompt });
  }

  messages.push(
    ...history.map(h => ({
      role: h.role as 'user' | 'assistant',
      content: h.content
    })),
    { role: 'user', content: userMessage }
  );

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 500
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const parsed = JSON.parse(content) as SignalResponse;

    const sanitizedSignals: Record<string, number> = {};
    if (parsed.signals && typeof parsed.signals === 'object') {
      for (const [key, value] of Object.entries(parsed.signals)) {
        if (typeof value === 'number') {
          sanitizedSignals[key] = clamp(value, -0.5, 0.5);
        }
      }
    }

    const topSignals = Object.entries(sanitizedSignals)
      .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
      .slice(0, 3)
      .reduce<Record<string, number>>((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});

    const assistantMessages = Array.isArray(parsed.assistantMessages)
      ? parsed.assistantMessages.filter(msg => typeof msg === 'string' && msg.trim().length > 0).slice(0, 3)
      : [];

    const normalizedMessages = assistantMessages.length > 0
      ? assistantMessages
      : ["Tell me more about that."];

    return {
      assistantMessages: normalizedMessages,
      nextTopic: parsed.nextTopic || '',
      signals: topSignals,
      confidence: clamp(parsed.confidence ?? 0, 0, 1),
      done: Boolean(parsed.done),
      itinerary: parsed.itinerary
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Return fallback response
    return {
      assistantMessages: ["I'd love to hear more about that.", "What tends to make you say yes to plans?"],
      nextTopic: '',
      signals: {},
      confidence: 0.1,
      done: false
    };
  }
}

/**
 * Clamp a number between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * ============================================================
 * 📄 FILE FOOTER: backend/src/services/llm.ts
 * ============================================================
 * PURPOSE:
 *    OpenAI chat + structured signal extraction.
 * TECH USED:
 *    - OpenAI SDK
 *    - TypeScript
 * ============================================================
 */
