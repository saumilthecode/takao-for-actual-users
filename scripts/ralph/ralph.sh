#!/bin/bash

# Ralph - Autonomous AI agent loop
# Runs Amp repeatedly until all PRD items are complete

set -e

MAX_ITERATIONS=${1:-10}
PRD_FILE="prd.json"
PROGRESS_FILE="progress.txt"
BRANCH_NAME=$(jq -r '.branchName // "ralph-feature"' "$PRD_FILE" 2>/dev/null || echo "ralph-feature")

# Check prerequisites
if ! command -v amp &> /dev/null; then
    echo "❌ Error: Amp CLI not found. Install from https://amp.build"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq not found. Install with: brew install jq"
    exit 1
fi

# Archive previous run if different branch
if [ -f "$PRD_FILE" ]; then
    OLD_BRANCH=$(jq -r '.branchName // "ralph-feature"' "$PRD_FILE" 2>/dev/null || echo "ralph-feature")
    if [ "$OLD_BRANCH" != "$BRANCH_NAME" ]; then
        ARCHIVE_DIR="archive/$(date +%Y-%m-%d)-${OLD_BRANCH}"
        mkdir -p "$ARCHIVE_DIR"
        [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_DIR/"
        [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_DIR/"
        echo "📦 Archived previous run to $ARCHIVE_DIR"
    fi
fi

# Create feature branch
if ! git rev-parse --verify "$BRANCH_NAME" &>/dev/null; then
    git checkout -b "$BRANCH_NAME"
    echo "🌿 Created branch: $BRANCH_NAME"
else
    git checkout "$BRANCH_NAME"
    echo "🌿 Switched to branch: $BRANCH_NAME"
fi

# Initialize progress file if needed
[ -f "$PROGRESS_FILE" ] || touch "$PROGRESS_FILE"

echo "🚀 Starting Ralph loop (max $MAX_ITERATIONS iterations)"
echo "📋 PRD: $PRD_FILE"
echo "📝 Progress: $PROGRESS_FILE"
echo ""

ITERATION=0

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔄 Iteration $ITERATION/$MAX_ITERATIONS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Find highest priority story where passes: false
    STORY=$(jq -r '.userStories[] | select(.passes == false) | "\(.id)|\(.title)|\(.priority // 0)"' "$PRD_FILE" 2>/dev/null | \
            sort -t'|' -k3 -rn | head -1)
    
    if [ -z "$STORY" ]; then
        echo "✅ All stories complete!"
        echo "<promise>COMPLETE</promise>"
        exit 0
    fi
    
    STORY_ID=$(echo "$STORY" | cut -d'|' -f1)
    STORY_TITLE=$(echo "$STORY" | cut -d'|' -f2)
    
    echo "📌 Working on: $STORY_ID - $STORY_TITLE"
    echo ""
    
    # Read prompt
    PROMPT=$(cat "$(dirname "$0")/prompt.md")
    
    # Add context from progress file
    if [ -f "$PROGRESS_FILE" ] && [ -s "$PROGRESS_FILE" ]; then
        PROGRESS_CONTEXT=$(cat "$PROGRESS_FILE")
        PROMPT="$PROMPT\n\n## Previous Learnings\n$PROGRESS_CONTEXT"
    fi
    
    # Run Amp with the prompt
    echo "🤖 Running Amp..."
    RESPONSE=$(echo -e "$PROMPT" | amp --stdin 2>&1 || true)
    
    # Check if response contains COMPLETE
    if echo "$RESPONSE" | grep -q "<promise>COMPLETE</promise>"; then
        echo "✅ Story marked complete by Amp"
        
        # Update PRD to mark story as passed
        jq --arg id "$STORY_ID" '(.userStories[] | select(.id == $id) | .passes) = true' "$PRD_FILE" > "$PRD_FILE.tmp" && mv "$PRD_FILE.tmp" "$PRD_FILE"
        
        # Run quality checks
        echo "🔍 Running quality checks..."
        
        # Typecheck backend
        if [ -d "backend" ]; then
            cd backend
            if npm run build 2>&1 | grep -q "error"; then
                echo "❌ Typecheck failed"
                cd ..
                continue
            fi
            cd ..
        fi
        
        # Typecheck frontend
        if [ -d "frontend" ]; then
            cd frontend
            if npm run build 2>&1 | grep -q "error"; then
                echo "❌ Typecheck failed"
                cd ..
                continue
            fi
            cd ..
        fi
        
        # Commit if checks pass
        if git diff --quiet && git diff --cached --quiet; then
            echo "ℹ️  No changes to commit"
        else
            git add -A
            git commit -m "Ralph: Complete $STORY_ID - $STORY_TITLE" || true
            echo "✅ Committed changes"
        fi
        
        # Append learnings to progress
        echo "" >> "$PROGRESS_FILE"
        echo "## Iteration $ITERATION - $STORY_ID" >> "$PROGRESS_FILE"
        echo "$(date +%Y-%m-%d\ %H:%M:%S)" >> "$PROGRESS_FILE"
        echo "$RESPONSE" | tail -20 >> "$PROGRESS_FILE"
        
    else
        echo "⚠️  Story not marked complete. Continuing..."
    fi
    
    echo ""
    sleep 2
done

echo "⏱️  Reached max iterations ($MAX_ITERATIONS)"
echo "📊 Remaining stories:"
jq -r '.userStories[] | select(.passes == false) | "  - \(.id): \(.title)"' "$PRD_FILE" 2>/dev/null || echo "  (none)"
