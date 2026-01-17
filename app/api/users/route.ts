import { NextRequest, NextResponse } from 'next/server';
import { ensureInitialized } from '@/src/init';
import { upsertUserVector } from '@/src/services/vectorStore';
import { DEFAULT_TRAITS, User } from '@/src/data/users';

export async function POST(request: NextRequest) {
  await ensureInitialized();
  try {
    const body = await request.json();
    const name = String(body?.name || '').trim();
    const age = Number(body?.age);
    const uni = String(body?.uni || '').trim();

    if (!name || !Number.isFinite(age) || age <= 0 || !uni) {
      return NextResponse.json(
        { error: 'name, age, and uni are required' },
        { status: 400 }
      );
    }

    const user: User = {
      id: crypto.randomUUID(),
      name,
      age,
      uni,
      vector: [],
      traits: { ...DEFAULT_TRAITS },
      interests: [],
      confidence: 0.2
    };

    await upsertUserVector(user);

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
