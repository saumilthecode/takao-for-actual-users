/**
 * ============================================================
 * 📄 FILE: src/init.ts
 * 
 * 🎯 PURPOSE:
 *    Initialize services on server startup for Next.js.
 *    Ensures users and vector store are ready before API calls.
 * 
 * ============================================================
 */

import { initializeVectorStore } from './services/vectorStore';

let initialized = false;

export async function ensureInitialized(): Promise<void> {
  if (initialized) return;

  try {
    console.log('📦 Initializing vector store...');
    await initializeVectorStore();
    
    initialized = true;
    console.log('✅ Services initialized');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    throw error;
  }
}
