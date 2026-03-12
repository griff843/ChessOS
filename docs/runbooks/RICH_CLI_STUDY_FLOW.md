# Rich CLI Study Flow Runbook (M8A)

## Prerequisites

1. Exercise corpus exists: `out/datasets/training-exercises.jsonl`
2. At least one study session generated: `out/sessions/<sessionId>/study-session.json`
3. Progress store exists (recommended): `out/progress/exercise-progress.json`

## Solve a Session

```bash
# Latest session
pnpm --filter worker run solve-session

# Specific session
SESSION_ID=session-abc123 pnpm --filter worker run solve-session
```

## Enhanced Display

### Exercise Prompt

Each exercise shows:
- ASCII board with coordinates
- Side to move
- Lesson category, difficulty, phase
- Source game and ply number
- Position eval before the critical move

### Attempt Feedback

After each move:
- Boxed grade banner (EXACT MATCH / ACCEPTABLE / INACCURACY / MISTAKE / BLUNDER)
- User move and best move on separate lines
- Lesson category

For incorrect answers:
- Eval before and after the move
- Eval swing
- Principal variation (PV)
- Reason codes

### Running Progress

After each exercise:
- Progress bar with completion count
- Running accuracy (percentage and fraction)
- Grade distribution (inline)
- Current streak (consecutive correct/incorrect)

### Session Recap

After all exercises:
- Session overview (ID, duration, total, accuracy)
- Grade distribution bar chart
- Eval loss statistics (average, median, max)
- Hardest misses (top 3 with details)
- Mastery state changes (transitions like learning → improving)
- Review attention (highest urgency items)
- Weak spots (worst category and difficulty by miss rate)

## Artifacts

| Artifact | Path | New? |
|----------|------|------|
| Results | `out/results/<sessionId>/results.json` | No |
| Session results | `out/results/<sessionId>/session-results.json` | No |
| Analytics (JSON) | `out/results/<sessionId>/session-analytics.json` | No |
| Analytics (MD) | `out/results/<sessionId>/session-analytics.md` | No |
| Session recap | `out/results/<sessionId>/session-recap.md` | Yes (M8A) |
| Review queue | `out/progress/review-queue.json` | No |
| Review queue (MD) | `out/progress/review-queue.md` | No |
| Progress store | `out/progress/exercise-progress.json` | No |
| Session history | `out/progress/session-history.jsonl` | No |

## Quit Early

Type `q` or `quit` at any move prompt to abort without saving results.
