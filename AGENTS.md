# AGENTS.md - Project Patterns & Learnings

This file documents patterns, conventions, and gotchas discovered during development. Ralph and other agents automatically read this file for context.

## Project Overview

Takoa is a university friend-matching app with:
- **Framework**: Next.js 14 (App Router) with API Routes
- **Frontend**: React + TypeScript (port 3000 in dev)
- **3D Visualization**: react-force-graph-3d
- **Vector Search**: HNSW via hnswlib-node
- **LLM**: OpenAI GPT-4 for chat onboarding
- **Deployment**: Ready for Vercel (single port)

## Code Patterns

### API Routes
- Routes are in `app/api/`
- Use Next.js API Route handlers (GET, POST, etc.)
- All routes return JSON via `NextResponse.json()`
- Error handling: return `NextResponse.json({ error: '...' }, { status: 500 })`

### Frontend Components
- Components in `components/`
- Use shadcn/ui components from `components/ui/`
- Client components use `'use client'` directive
- API calls via `lib/api.ts` (uses relative `/api/` paths)

### Graph Data Structure
- Nodes have: `id`, `name`, `age`, `uni`, `x`, `y`, `z`, `clusterId`, `vector`, `traits`, `interests`
- Links have: `source`, `target`, `strength`
- Graph endpoint: `GET /api/graph?mode=force|embedding&k=5`

### Vector Operations
- Vectors are arrays of numbers (personality traits + interests)
- Cosine similarity used for matching
- Vector store in `services/vectorStore.ts`

## Gotchas

- **API Routes**: All endpoints are under `/api/` prefix
- **Environment**: `.env` file should be in project root, Next.js automatically loads it
- **TypeScript**: Both API routes and frontend use strict mode
- **Ports**: Single port 3000 in dev, Vercel handles production
- **Initialization**: Services auto-initialize on first API call via `src/init.ts`

## Future Enhancements

- UMAP embedding view toggle (after MVP)
- Index tuner dashboard (after MVP)
- Real-time graph updates via WebSocket (optional)
