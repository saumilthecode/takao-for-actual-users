/**
 * ============================================================
 * 📄 FILE: backend/src/index.ts
 * ============================================================
 * 
 * 🎯 PURPOSE:
 *    Main entry point for the Takoa backend server.
 *    Initializes Fastify, registers routes, and starts listening.
 * 
 * 🛠️ TECH USED:
 *    - Fastify (fast Node.js web framework)
 *    - @fastify/cors (CORS support for frontend)
 *    - dotenv (environment variable loading)
 * 
 * 🔗 ENDPOINTS REGISTERED:
 *    - POST /chat     → Chat with onboarding bot
 *    - GET  /graph    → Get nodes + links for 3D visualization
 * 
 * ============================================================
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: '.env' });

// Import route handlers
import { chatRoutes } from './routes/chat.js';
import { graphRoutes } from './routes/graph.js';

// Initialize services (called once at startup)
import { initializeVectorStore } from './services/vectorStore.js';

const fastify = Fastify({
  logger: process.env.DEBUG_MODE === 'true'
});

async function start() {
  // Enable CORS for frontend
  await fastify.register(cors, {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  });

  // Register API routes
  await fastify.register(chatRoutes, { prefix: '/chat' });
  await fastify.register(graphRoutes, { prefix: '/graph' });

  // Health check endpoint
  fastify.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));

  // Initialize vector store
  console.log('📦 Initializing vector store...');
  await initializeVectorStore();

  // Start server
  const port = parseInt(process.env.BACKEND_PORT || '4000');
  try {
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Backend running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
