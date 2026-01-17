Project checklist status (checked against current codebase)

Legend:
✓ done
→ in progress
☐ not done

# 0) Project rules (must be true)

☐ No swipe/face-based matching
☐ No collaborative filtering
☐ LLM does not rank/match/cluster people
☐ Matching is algorithmic + explainable
☐ “Quantum/latent space” is developer-facing (but you show it in demo)
☐ Group matching is circles of 5, not 1-on-1

# 1) Frontend app (Next.js + shadcn/ui)

## 1.1 Base UI

✓ Next.js + TypeScript project runs
✓ shadcn/ui installed + theme works
☐ Single demo page exists (`/demo`)
☐ Layout contains:
  ✓ Chat panel
  ✓ Social Space panel (3D)
  ☐ Inspector panel (vectors / circle / plan)

## 1.2 Shared UI components (no custom from scratch)

✓ Cards (for profile/circle/plan)
✓ Tabs (e.g., Space / Plan / Metrics)
✓ ScrollArea (chat transcript)
✓ Buttons (Send, Simulate, Generate Plan, Send to 5)
☐ Toasts (Sent ✅, Updated ✅)

# 2) Chat layer (live + simulate)

## 2.1 Chat UX

✓ User can send messages
✓ Assistant replies appear in chat
✓ “Simulate chat” button exists and works
☐ Chat is session-based (uses `sessionId`)

## 2.2 Backend integration

✓ `POST /chat/simulate` returns:
  ✓ `assistantMessage`
  ✓ `profileUpdate` (traits+interests+confidence)
☐ Optional: `POST /chat/turn` (LLM live mode) returns same shape
☐ Frontend switches seamlessly between Live and Simulate

## 2.3 Guardrails

☐ Assistant never references embeddings/vectors/clusters
☐ Assistant never suggests specific people
☐ Assistant only asks questions + captures signals

# 3) Structured profile extraction (hard contract)

## 3.1 Output schema exists and is enforced

✓ `profileUpdate.traits` contains 5 trait values in [0,1]
✓ `profileUpdate.interests` contains weighted tags in [0,1]
✓ `profileUpdate.confidence` exists in [0,1]
☐ Backend validates with zod (or equivalent)

## 3.2 Incremental update behavior

✓ Each chat turn adjusts values gradually (no wild jumps)
✓ If uncertain → small update + low confidence

# 4) Canonical vector pipeline

## 4.1 Vector construction

✓ A fixed mapping from profileUpdate → numeric vector
✓ Vector normalization (unit norm / L2 normalize)
✓ Text embeddings for messages or interests
✓ Interest embeddings averaged into the user vector

## 4.2 State update

☐ There is a special user (e.g., `"you"`) whose vector updates after chat
✓ Updated vector is persisted in-memory (MVP) or DB (optional)

# 5) Social embedding space (“quantum space” dev view)

## 5.1 Core math

✓ Similarity metric implemented (cosine/dot)
✓ k-nearest-neighbor retrieval implemented (even brute force OK for MVP)

## 5.2 Developer-only display (shown in demo)

✓ The graph shows where users “sit” in the space
✓ The space updates when `"you"` updates (even just new edges is fine)

# 6) Candidate retrieval & compatibility edges

## 6.1 Candidate retrieval

→ Retrieve top-N candidates for `"you"` (e.g., N=30)
→ Compute similarity scores to candidates

## 6.2 Graph edges

→ Build links from `"you"` to strongest candidates
✓ Link `strength` is included and used for visuals (opacity/width)

# 7) Pod-of-5 formation (core differentiator)

## 7.1 Pod definition

☐ Pod = group of 5 users (IDs) including `"you"`

## 7.2 Pod algorithm (group cohesion, not pairwise only)

☐ Pod selection considers compatibility between all members
☐ Avoids “hub-only” group (everyone close to you but not each other)
☐ Outputs:
  ☐ `circleMembers: [5 ids]`
  ☐ `cohesionScore`

## 7.3 Pod visualization

→ Pod members are highlighted together
☐ Edges between circle members are shown/highlighted

# 8) Explainability (judge-proofing)

## 8.1 Why circle?

☐ Inspector shows:
  ☐ similarity score(s)
  ☐ cohesion score
  ✓ top contributing trait/interest dimensions
  ✓ shared interest tags / overlaps

## 8.2 “Not AI sorting” proof

☐ UI can show deterministic scoring logic (even simplified)
☐ Matching decisions are reproducible from vectors

# 9) 3D visualization (your “pretty technicality”)

## 9.1 Must-have interactions

✓ Hover node → show tooltip summary
✓ Click node → select + highlight neighbors/circle
✓ Camera controls work

## 9.2 Styling (minimum polish)

☐ Dark background / clean aesthetic
✓ Strength-based edge styling (opacity/width)
✓ Cluster coloring if clusterId exists

## 9.3 Optional toggle

✓ Toggle: Force layout vs Embedding layout (UMAP) (optional)

# 10) Clustering (optional but on-brand)

✓ Clustering run exists (DBSCAN/HDBSCAN or placeholder)
✓ `clusterId` assigned to each node
✓ Nodes colored by `clusterId`
☐ Optional: cluster bonus used in circle cohesion scoring

# 11) Fixed Pod Plan (generated once, then mostly static)

## 11.1 Plan generation (deterministic template-based)

☐ `POST /circle/plan` returns a structured plan object:
  ☐ title, summary
  ☐ steps (3–5)
  ☐ roles (optional)
  ☐ messageTemplate
☐ Plan is generated once per circle (not re-generated every time)

## 11.2 Plan UI

✓ Plan rendered in a shadcn Card
☐ Steps shown (accordion/list)
☐ “Send to 5” button exists
☐ “Sent ✅” state shown with message previews (simulated ok)

# 12) Post-plan assistant (limited: late/FAQ only)

☐ A plan-support chat exists (can be same chat UI)
☐ Allowed intents:
  ☐ “I might be late”
  ☐ “Where/when are we meeting?”
  ☐ “What do I bring?”
  ☐ “Can we reschedule?” (suggest options, user chooses)
☐ Disallowed:
  ☐ changing the circle
  ☐ recommending different members
☐ Optional: generates a “broadcast message” to the group (simulated)

# 13) Demo reliability (hackathon critical)

✓ Demo works without any API key (simulate path)
☐ If live LLM used:
  ☐ JSON parsing failure → automatic fallback to simulate
✓ Seed dataset exists (100+ users) so graph looks full
☐ “One-click demo path” exists:
  ☐ simulate → circle formed → plan generated → sent

# 14) Optional systems flex: self-optimizing index tuner

☐ Parameter sweep exists (e.g., ANN knobs)
→ Measures:
  → recall@k
  → p95 latency
☐ Picks “best config under latency budget”
→ UI shows a small results table + best config badge

# Super quick “am I done?” test

☐ 2.1 (chat works)
☐ 3.1 (structured profileUpdate exists)
☐ 7 (circle-of-5 works)
☐ 9 (3D graph renders + highlights circle)
☐ 11 (plan generated + sent)
☐ 13 (simulate fallback works)

# Core skills & algorithms (official names)

## Core skills

- Conversational signal extraction (LLM structured output)
- Semantic text embeddings (OpenAI embeddings)
- Vector representation & normalization (L2 normalization)
- Similarity search (cosine similarity / kNN retrieval)
- Graph visualization (3D force‑directed graph)
- Clustering (DBSCAN)
- Dimensionality reduction (UMAP)

## Algorithms & methods

- **Cosine Similarity** (Salton & Buckley, 1988)
- **k‑Nearest Neighbors (kNN)** (Cover & Hart, 1967)
- **DBSCAN (Density‑Based Spatial Clustering of Applications with Noise)** (Ester et al., 1996)
- **UMAP (Uniform Manifold Approximation and Projection)** (McInnes, Healy & Melville, 2018)
- **Force‑directed layout (ForceAtlas‑style)** (Fruchterman & Reingold, 1991)
- **L2 Normalization** (Salton & Buckley, 1988)
- **Text Embeddings (OpenAI text‑embedding‑3‑small)** (Neelakantan et al., 2022)


https://artsmart.ai/blog/top-embedding-models-in-2025/
https://www.nature.com/articles/s41562-024-02089-y
https://pmc.ncbi.nlm.nih.gov/articles/PMC11612277/