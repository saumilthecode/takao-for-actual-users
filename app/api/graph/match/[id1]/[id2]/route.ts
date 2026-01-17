/**
 * ============================================================
 * 📄 FILE: app/api/graph/match/[id1]/[id2]/route.ts
 * 
 * 🎯 PURPOSE:
 *    Next.js API route for match explanation.
 *    Returns detailed match analysis between two users.
 * 
 * ============================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { ensureInitialized } from '@/src/init';
import { getUserById } from '@/src/data/users';
import { cosineSimilarity, getSemanticVectorForUser } from '@/src/services/vectorStore';

export async function GET(
  request: NextRequest,
  { params }: { params: { id1: string; id2: string } }
) {
  await ensureInitialized();
  try {
    const { id1, id2 } = params;
    
    const [user1, user2] = await Promise.all([getUserById(id1), getUserById(id2)]);

    if (!user1 || !user2) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate overall similarity
    const similarity = cosineSimilarity(user1.vector, user2.vector);

    // Calculate contribution of each trait dimension
    const dimensions = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
    const traitContributions = dimensions.map((dim, idx) => {
      const diff = Math.abs(user1.vector[idx] - user2.vector[idx]);
      const contribution = (1 - diff) * user1.vector[idx] * user2.vector[idx];
      return { dimension: dim, contribution: parseFloat(contribution.toFixed(3)) };
    });

    // Semantic interest contributions (from interest embeddings)
    const semantic1 = await getSemanticVectorForUser(user1.id, user1.interests);
    const semantic2 = await getSemanticVectorForUser(user2.id, user2.interests);
    const semanticContributions = semantic1.map((value, idx) => {
      const diff = Math.abs(value - (semantic2[idx] ?? 0));
      const contribution = (1 - diff) * value * (semantic2[idx] ?? 0);
      return { dimension: `interest_embedding_${idx + 1}`, contribution: parseFloat(contribution.toFixed(3)) };
    });

    // Find shared interests
    const sharedInterests = user1.interests.filter(i => user2.interests.includes(i));
    const interestContributions = sharedInterests.map(tag => ({
      dimension: `interest:${tag}`,
      contribution: 0.15
    }));

    return NextResponse.json({
      user1: { id: user1.id, name: user1.name },
      user2: { id: user2.id, name: user2.name },
      similarity: parseFloat(similarity.toFixed(3)),
      topContributors: [...traitContributions, ...semanticContributions, ...interestContributions]
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 5),
      sharedInterests
    });
  } catch (error) {
    console.error('Match explanation error:', error);
    return NextResponse.json(
      { error: 'Failed to compute match explanation' },
      { status: 500 }
    );
  }
}
