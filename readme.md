# 🎯 TAKOA - Social Space Matching Platform

> University friend-matching app with 3D vector visualization, vector search, and LLM onboarding.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- Supabase project (URL + service role key)

### Setup

```bash
# 1. Set up environment
# Create .env file in project root:
cat <<'EOF' > .env
openaikey=your-openai-api-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EOF

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
# App runs on http://localhost:3000
```

### Quick Test

```bash
# Test API health
curl http://localhost:3000/api/health
# Should return: {"status":"ok","timestamp":...}

# Test chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","message":"Hello!","history":[]}'
```

## 📁 Project Structure

```
takoa/
├── .env                  ← Your OpenAI API key (create this)
├── app/                  ← Next.js App Router
│   ├── api/              ← API routes (/api/chat, /api/graph, etc.)
│   └── page.tsx          ← Main page component
├── components/           ← React components (SocialGraph, ChatInterface)
├── src/                  ← Shared TypeScript services
│   ├── services/         ← Business logic (vector, UMAP, LLM)
│   └── data/             ← User data access (Supabase)
├── lib/                  ← Client-side utilities (API client)
├── scripts/ralph/        ← Ralph automation scripts
└── prd.json              ← Product requirements document
```

## 🛠️ Development Commands

```bash
npm run dev               # Start Next.js dev server (port 3000)
npm run build             # Build for production
npm start                 # Run production build
npm run lint              # Run ESLint
```

## 📡 API Endpoints

All endpoints are under `/api/`:

- `GET /api/health` - Health check
- `POST /api/chat` - Chat with onboarding bot (with RAG)
  - Retrieves similar users from vector store for context-aware responses
  ```json
  {
    "userId": "string",
    "message": "string",
    "history": [{"role": "user|assistant", "content": "string"}]
  }
  ```
- `POST /api/users` - Create a user profile
- `GET /api/graph` - Get social graph data
- `GET /api/graph/match/:id1/:id2` - Get match explanation

## 🔑 Environment Setup

Create a `.env` file in the project root:

```bash
openaikey=sk-your-openai-api-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get your API key from: https://platform.openai.com/api-keys

**Note:** The key is named `openaikey` (not `OPENAI_API_KEY`) to match your setup.

## 🧱 Database (Supabase)

Create a `users` table with at least these columns:

```sql
create table if not exists public.users (
  id text primary key,
  name text,
  age int,
  uni text,
  vector float8[],
  traits jsonb,
  interests text[],
  confidence float
);
```

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router) with API Routes
- **Frontend**: shadcn/ui, react-force-graph-3d, recharts
- **Backend**: Next.js API Routes, TypeScript, Supabase, density-clustering, umap-js
- **LLM**: OpenAI GPT-4 with **RAG (Retrieval-Augmented Generation)**
  - Retrieves similar users from vector store before generating responses
  - Uses HNSW vector search for fast similarity matching

## 🚀 Deployment

The app is ready for deployment on **Vercel**:

1. Push to GitHub
2. Import to Vercel
3. Add environment variables `openaikey`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` in Vercel dashboard
4. Deploy!

All API routes are automatically handled by Next.js API Routes.

## 🤖 Ralph - Autonomous Development

Ralph is set up for autonomous development of the graph visualization features.

**Quick Start:**
```bash
# Run Ralph to implement PRD stories automatically
./scripts/ralph/ralph.sh [max_iterations]
```

See `RALPH_SETUP.md` for detailed instructions.

**Current PRD:** `prd.json` contains 6 user stories for:
- 3D graph visualization with ForceGraph3D
- Hover tooltips (name, age, uni)
- Click interactions (highlight edges, show top matches)
- Match explanation panel (similarity scores + top dimensions)
- Chat integration (graph refresh on updates)
