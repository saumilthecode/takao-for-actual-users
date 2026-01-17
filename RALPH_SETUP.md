# Ralph Setup Guide

Ralph is configured and ready to use for autonomous development of the graph visualization features.

## Quick Start

1. **Ensure prerequisites are installed:**
   ```bash
   # Install jq if not already installed
   brew install jq
   
   # Ensure Amp CLI is installed and authenticated
   # Visit https://amp.build for installation
   ```

2. **Run Ralph:**
   ```bash
   ./scripts/ralph/ralph.sh [max_iterations]
   ```
   
   Default is 10 iterations. Ralph will:
   - Create/switch to the feature branch (`graph-visualization-mvp`)
   - Work through PRD stories one by one
   - Run quality checks after each story
   - Commit changes when complete
   - Update `progress.txt` with learnings

## PRD Structure

The PRD (`prd.json`) contains 6 user stories:

1. **Create SocialGraph component** - Basic 3D graph rendering
2. **Add hover tooltips** - Show name, age, uni on hover
3. **Click node interactions** - Highlight edges and show top matches
4. **Match explanation panel** - Display similarity score
5. **Top contributing dimensions** - Show which vector dimensions matter most
6. **Chat integration** - Ensure graph refreshes after chat updates

## Files Created

- `scripts/ralph/ralph.sh` - Main Ralph loop script
- `scripts/ralph/prompt.md` - Instructions for each Amp instance
- `prd.json` - Product requirements document with user stories
- `progress.txt` - Append-only log of learnings
- `AGENTS.md` - Project patterns and conventions

## How It Works

1. Ralph reads `prd.json` and finds the highest priority story where `passes: false`
2. Spawns a fresh Amp instance with `prompt.md` + `progress.txt` context
3. Amp implements the story
4. Quality checks run (TypeScript compilation)
5. If checks pass, story is marked `passes: true` and changes are committed
6. Process repeats until all stories pass or max iterations reached

## Manual Execution

You can also work on stories manually:

1. Edit `prd.json` to mark a story as `"passes": true` when done
2. Or run Ralph to let it handle the automation

## Customization

- **Change stories**: Edit `prd.json` to add/modify user stories
- **Change behavior**: Edit `scripts/ralph/prompt.md` to adjust Amp instructions
- **Add quality checks**: Modify `ralph.sh` to add tests, linting, etc.

## Notes

- Ralph creates commits automatically (you can squash later)
- Each iteration is a fresh Amp context (only git history + progress.txt persist)
- Stories should be small enough to complete in one context window
- The `AGENTS.md` file is automatically read by Amp for project context
