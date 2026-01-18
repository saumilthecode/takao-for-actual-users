/**
 * ============================================================
 * 📄 FILE: app/api/chat/route.ts
 * 
 * 🎯 PURPOSE:
 *    Next.js API route for chat endpoint.
 *    Handles chat messages and returns LLM responses.
 * 
 * ============================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { ensureInitialized } from '@/src/init';
import { chatWithBot } from '@/src/services/llm';
import { buildProfileUpdateFromSignals, updateUserVector } from '@/src/services/vectorStore';

const ALLOWED_TOPICS = [
  'spontaneity',
  'planning',
  'social_energy',
  'study_style',
  'weekend_style',
  'comfort_zone',
  'group_dynamic',
  'conversation_depth',
  'curiosity',
  'nature_vs_city'
];

type SessionState = {
  asked_topics: string[];
  collected_signals: string[];
  stage: 'warmup' | 'preferences' | 'group-fit' | 'wrapup';
  turn_count: number;
};

const sessionStore = new Map<string, SessionState>();
const DEFAULT_ITINERARY = {
  wednesday_study: {
    theme: 'Focused study circle',
    location_hint: 'Campus library (main floor)',
    plan: ['7:00–7:10pm quick intros', '7:10–7:50pm study sprints', '7:50–8:00pm wrap-up']
  },
  friday_social: {
    theme: 'Optional casual hang',
    location_hint: 'Student union café',
    plan: ['6:30pm meet at the café', '6:30–7:45pm coffee/dessert + chat', 'Head out by 8pm'],
    optional: true as const
  }
};

function getSessionState(userId: string): SessionState {
  const existing = sessionStore.get(userId);
  if (existing) return existing;
  const initial: SessionState = {
    asked_topics: [],
    collected_signals: [],
    stage: 'warmup',
    turn_count: 0
  };
  sessionStore.set(userId, initial);
  return initial;
}

function coerceSessionState(value: unknown): SessionState | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<SessionState>;
  const asked_topics = Array.isArray(raw.asked_topics)
    ? raw.asked_topics.filter(item => typeof item === 'string').slice(-15)
    : [];
  const collected_signals = Array.isArray(raw.collected_signals)
    ? raw.collected_signals.filter(item => typeof item === 'string').slice(-15)
    : [];
  const stage =
    raw.stage === 'preferences' || raw.stage === 'group-fit' || raw.stage === 'wrapup'
      ? raw.stage
      : 'warmup';
  const turn_count = Number.isFinite(raw.turn_count ?? NaN)
    ? Math.max(0, Math.floor(raw.turn_count as number))
    : 0;
  return {
    asked_topics,
    collected_signals,
    stage,
    turn_count
  };
}

function updateStage(turnCount: number, done: boolean): SessionState['stage'] {
  if (done || turnCount >= 10) return 'wrapup';
  if (turnCount >= 6) return 'group-fit';
  if (turnCount >= 3) return 'preferences';
  return 'warmup';
}

function sanitizeNextTopic(nextTopic: string, state: SessionState): string {
  const normalized = nextTopic?.trim().toLowerCase();
  if (normalized && ALLOWED_TOPICS.includes(normalized) && !state.asked_topics.includes(normalized)) {
    return normalized;
  }
  return ALLOWED_TOPICS.find(topic => !state.asked_topics.includes(topic)) || '';
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getBigrams(text: string): string[] {
  const normalized = normalizeText(text);
  const tokens = normalized.split(' ').filter(Boolean);
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i += 1) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return bigrams;
}

function isRepeatQuestion(candidate: string, recentQuestions: string[]): boolean {
  const candidateBigrams = new Set(getBigrams(candidate));
  if (candidateBigrams.size === 0) return false;
  return recentQuestions.some(question => {
    const questionBigrams = new Set(getBigrams(question));
    let intersectionCount = 0;
    candidateBigrams.forEach(bigram => {
      if (questionBigrams.has(bigram)) intersectionCount += 1;
    });
    const overlap = intersectionCount / Math.max(candidateBigrams.size, 1);
    return overlap >= 0.5;
  });
}

function getRecentAssistantQuestions(
  history: { role: 'user' | 'assistant'; content: string }[]
): string[] {
  const questions = history
    .filter(msg => msg.role === 'assistant' && msg.content.includes('?'))
    .map(msg => msg.content)
    .slice(-3);
  return questions;
}

export async function POST(request: NextRequest) {
  await ensureInitialized();
  try {
    const body = await request.json();
    const { userId, message, history, sessionState: incomingState } = body;

    if (!userId || !message) {
      return NextResponse.json(
        { error: 'userId and message required' },
        { status: 400 }
      );
    }

    // Get response from LLM with structured profile extraction (with RAG)
    const sessionState = coerceSessionState(incomingState) ?? getSessionState(userId);
    sessionStore.set(userId, sessionState);
    const sessionContext = {
      asked_topics: sessionState.asked_topics,
      collected_signals: sessionState.collected_signals,
      stage: sessionState.stage,
      turn_count: sessionState.turn_count,
      allowed_topics: ALLOWED_TOPICS
    };

    const response = await chatWithBot(message, history || [], userId, sessionContext);
    const recentQuestions = getRecentAssistantQuestions(history || []);
    let finalResponse = response;

    const candidateQuestion = finalResponse.assistantMessages.find(msg => msg.includes('?')) || '';
    if (candidateQuestion && isRepeatQuestion(candidateQuestion, recentQuestions)) {
      finalResponse = await chatWithBot(
        message,
        history || [],
        userId,
        sessionContext,
        'You repeated yourself. Ask a different question about a different topic.'
      );
    }

    const shouldBeDone = finalResponse.confidence >= 0.75 || sessionState.turn_count >= 10;
    if (shouldBeDone && !finalResponse.itinerary) {
      finalResponse = await chatWithBot(
        message,
        history || [],
        userId,
        sessionContext,
        'You must set done=true and include itinerary. Stop asking questions.'
      );
    }

    if (shouldBeDone) {
      finalResponse.itinerary = finalResponse.itinerary || DEFAULT_ITINERARY;
      finalResponse.done = true;
    }

    const nextTopic = sanitizeNextTopic(finalResponse.nextTopic, sessionState);
    if (nextTopic) {
      sessionState.asked_topics = [...sessionState.asked_topics, nextTopic].slice(-15);
    }

    if (finalResponse.confidence >= 0.6) {
      const newSignals = Object.keys(finalResponse.signals || {});
      const collected = new Set(sessionState.collected_signals);
      newSignals.forEach(signal => collected.add(signal));
      sessionState.collected_signals = Array.from(collected).slice(-15);
    }

    sessionState.turn_count += 1;
    sessionState.stage = updateStage(sessionState.turn_count, finalResponse.done);

    const profileUpdate = await buildProfileUpdateFromSignals(
      userId,
      finalResponse.signals,
      finalResponse.confidence
    );

    // Update user's vector in the store if profile changed
    await updateUserVector(userId, profileUpdate, message);

    return NextResponse.json({
      assistantMessages: finalResponse.assistantMessages,
      nextTopic,
      profileUpdate,
      signals: finalResponse.signals,
      confidence: finalResponse.confidence,
      done: finalResponse.done || shouldBeDone,
      itinerary: finalResponse.itinerary || null,
      sessionState
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    );
  }
}

/**
 * ============================================================
 * 📄 FILE FOOTER: app/api/chat/route.ts
 * ============================================================
 * PURPOSE:
 *    Next.js API route for chat responses and signal extraction.
 * TECH USED:
 *    - Next.js App Router API routes
 *    - TypeScript
 * ============================================================
 */
