# Progress Tracking Runbook

## Prerequisites

1. Exercise corpus exists (`pnpm --filter worker run generate-exercises`)
2. At least one session generated previously, or run `generate-session`

## Generate a progress-aware session

```bash
pnpm --filter worker run generate-session
```

This will:
1. Load the exercise corpus
2. Load or initialize the progress store
3. Refresh due-for-review statuses
4. Prioritize exercises: due > unseen > seen > incorrect > correct
5. Generate a balanced session (3 easy + 4 medium + 3 hard)
6. Mark selected exercises as "seen"
7. Save progress store and append session history

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SESSION_SIZE` | `10` | Number of exercises per session |
| `SESSION_COUNT` | `1` | Number of sessions to generate |

## Record session results

```bash
RESULTS_FILE=path/to/results.json pnpm --filter worker run record-session
```

### Input format

```json
{
  "sessionId": "session-33cecce1",
  "results": [
    { "exerciseId": "game11:33", "result": "correct" },
    { "exerciseId": "game14:31", "result": "incorrect" },
    { "exerciseId": "game26:37", "result": "correct" }
  ]
}
```

### What happens

1. Each exercise's progress is updated (correct/incorrect counts)
2. Spaced repetition interval is computed
3. `nextReviewAt` is set based on the interval
4. Session completion is appended to session history

## Review scheduling

| Result | Interval change |
|--------|----------------|
| Correct (first time) | 0 → 1 day |
| Correct (interval=1) | 1 → 3 days |
| Correct (interval=3) | 3 → 7 days |
| Correct (interval=7) | 7 → 14 days |
| Correct (interval=14) | 14 → 30 days |
| Correct (interval=30) | stays at 30 days |
| Incorrect (any) | reset to 1 day |

## Artifacts

| File | Format | Description |
|------|--------|-------------|
| `out/progress/exercise-progress.json` | JSON | Persistent exercise state |
| `out/progress/session-history.jsonl` | JSONL | Append-only session log |

## Pipeline Integration

```
exercises → generate-session → study-session + progress store
                                    ↓
                            record-session → updated progress
                                    ↓
                            generate-session → prefers due/unseen
```
