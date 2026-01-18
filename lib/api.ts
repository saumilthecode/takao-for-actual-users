/**
 * ============================================================
 * 📄 FILE: frontend/lib/api.ts
 * ============================================================
 * 
 * 🎯 PURPOSE:
 *    API client for communicating with the backend.
 *    All fetch calls to backend go through here.
 * 
 * 🛠️ TECH USED:
 *    - Native fetch API
 *    - TypeScript interfaces for type safety
 * 
 * ============================================================
 */

// Use relative paths for API calls (works with Vercel deployment)
// Empty string means relative to current origin, which works for both dev and production
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface GraphNode {
  id: string;
  name: string;
  age: number;
  uni: string;
  x: number;
  y: number;
  z: number;
  clusterId: number;
  vector: number[];
  traits: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  interests: string[];
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  strength: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  mode: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

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

export interface SessionState {
  asked_topics: string[];
  collected_signals: string[];
  stage: 'warmup' | 'preferences' | 'group-fit' | 'wrapup';
  turn_count: number;
}

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  uni: string;
}

export interface ChatResponse {
  assistantMessages: string[];
  nextTopic?: string;
  profileUpdate: ProfileUpdate;
  signals?: Record<string, number>;
  confidence?: number;
  done?: boolean;
  itinerary?: {
    wednesday_study: { theme: string; location_hint: string; plan: string[] };
    friday_social: { theme: string; location_hint: string; plan: string[]; optional: true };
  };
  sessionState?: SessionState;
}

export interface MatchExplanation {
  user1: { id: string; name: string };
  user2: { id: string; name: string };
  similarity: number;
  topContributors: { dimension: string; contribution: number }[];
  sharedInterests: string[];
}


// ============================================================
// API FUNCTIONS
// ============================================================

/**
 * Fetch the social graph data
 */
export async function fetchGraph(mode: 'force' | 'embedding' = 'force'): Promise<GraphData> {
  const res = await fetch(`${API_BASE}/api/graph?mode=${mode}`);
  if (!res.ok) throw new Error('Failed to fetch graph');
  return res.json();
}

/**
 * Send a chat message and get response
 */
export async function sendChatMessage(
  userId: string,
  message: string,
  history: ChatMessage[],
  sessionState?: SessionState | null
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, message, history, sessionState: sessionState || undefined })
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export async function createUser(payload: {
  name: string;
  age: number;
  uni: string;
}): Promise<{ user: UserProfile }> {
  const res = await fetch(`${API_BASE}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to create user');
  return res.json();
}

/**
 * Get match explanation between two users
 */
export async function fetchMatchExplanation(
  id1: string,
  id2: string
): Promise<MatchExplanation> {
  const res = await fetch(`${API_BASE}/api/graph/match/${id1}/${id2}`);
  if (!res.ok) throw new Error('Failed to fetch match explanation');
  return res.json();
}

// Intentionally no tuner/demo API in production client

/**
 * ============================================================
 * 📄 FILE FOOTER: frontend/lib/api.ts
 * ============================================================
 * PURPOSE:
 *    Client-side API wrappers and shared response types.
 * TECH USED:
 *    - Fetch API
 *    - TypeScript
 * ============================================================
 */
