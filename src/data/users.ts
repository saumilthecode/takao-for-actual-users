import { getSupabase } from '@/src/services/supabase';

export interface User {
  id: string;
  name: string;
  age: number;
  uni: string;
  vector: number[];
  traits: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  interests: string[];
  confidence: number;
}

type UserRow = {
  id: string;
  name: string | null;
  age: number | null;
  uni: string | null;
  vector: number[] | null;
  traits: User['traits'] | null;
  interests: string[] | null;
  confidence: number | null;
};

export const DEFAULT_TRAITS: User['traits'] = {
  openness: 0.5,
  conscientiousness: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  neuroticism: 0.5
};

function normalizeUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name ?? 'Student',
    age: row.age ?? 20,
    uni: row.uni ?? 'University',
    vector: row.vector ?? [],
    traits: row.traits ?? DEFAULT_TRAITS,
    interests: row.interests ?? [],
    confidence: row.confidence ?? 0.3
  };
}

export async function getAllUsers(): Promise<User[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('id,name,age,uni,vector,traits,interests,confidence');

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return (data || []).map(row => normalizeUser(row as UserRow));
}

export async function getUserById(id: string): Promise<User | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('id,name,age,uni,vector,traits,interests,confidence')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  return data ? normalizeUser(data as UserRow) : null;
}

export async function upsertUser(user: User): Promise<void> {
  const supabase = getSupabase();
  const payload = {
    id: user.id,
    name: user.name,
    age: user.age,
    uni: user.uni,
    vector: user.vector,
    traits: user.traits,
    interests: user.interests,
    confidence: user.confidence
  };

  const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
  if (error) {
    throw new Error(`Failed to upsert user: ${error.message}`);
  }
}
