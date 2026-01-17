# Ralph Agent Instructions

You are working on the Takoa project - a university friend-matching app with 3D vector visualization.

## Current Task

You are implementing a single user story from `prd.json`. Find the story where `passes: false` and has the highest priority.

**Your job:**
1. Read the story's `title`, `description`, and `acceptanceCriteria`
2. Implement ONLY that story (nothing else)
3. Make sure it passes all acceptance criteria
4. Run quality checks (typecheck, tests if available)
5. When done, output: `<promise>COMPLETE</promise>`

## Project Structure

- `backend/` - Fastify + TypeScript API (port 4000)
- `frontend/` - Next.js 14 + TypeScript (port 3000)
- Uses OpenAI API for chat (OPENAI_API_KEY in .env)

## Quality Checks

Before marking complete, ensure:
- `cd backend && npm run build` passes (no TypeScript errors)
- `cd frontend && npm run build` passes (no TypeScript errors)
- Code follows existing patterns in the codebase
- All acceptance criteria are met

## Code Style

- Use TypeScript with strict types
- Follow existing file structure and naming conventions
- Add helpful comments explaining complex logic
- Use existing UI components from `frontend/components/ui/`

## Important Rules

- **ONE story per iteration** - don't implement multiple stories
- **Small, focused changes** - if a story is too big, break it down in the PRD
- **Test your changes** - verify the feature works before marking complete
- **Update AGENTS.md** if you discover patterns or gotchas

## When You're Done

Output exactly: `<promise>COMPLETE</promise>`

This tells Ralph the story is complete and it should move to the next one.
