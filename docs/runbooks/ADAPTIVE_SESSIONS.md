# Adaptive Sessions Runbook

## Prerequisites

1. Exercise corpus exists (`pnpm --filter worker run generate-exercises`)
2. At least one session generated and results recorded

## Generate an adaptive session

```bash
pnpm --filter worker run generate-session
```

Adaptive mode is **on by default**. To disable:

```bash
ADAPTIVE=false pnpm --filter worker run generate-session
```

### What happens (adaptive mode)

1. Load exercise corpus and progress store
2. Refresh due-for-review statuses
3. **Build weakness profile** from progress data
4. **Compute adaptive weights** per category and difficulty
5. **Rank exercises** using adaptive scores (weakness-weighted)
6. Generate balanced session (3 easy + 4 medium + 3 hard)
7. Write weakness profile and learner summary artifacts
8. Mark selected exercises as "seen"
9. Save progress store and append session history

### Adaptive weighting formula

Per bucket (category or difficulty):

```
missRate       = min(incorrectCount / max(seenCount, 1), 1.0)
adaptiveWeight = 1.0 + missRate    // bounded [1.0, 2.0]
```

Per exercise:

```
categoryWeight   = byCategory[lessonCategory].adaptiveWeight
difficultyWeight = byDifficulty[difficultyEstimate].adaptiveWeight
combinedWeight   = (categoryWeight + difficultyWeight) / 2
adaptiveScore    = targetPriority × combinedWeight
```

### Session selection priority

```
1. due_for_review  → by targetPriority (no adaptive boost)
2. unseen          → by adaptiveScore (weak areas boosted)
3. seen            → by adaptiveScore
4. incorrect       → by adaptiveScore
5. correct         → by adaptiveScore
```

Downstream constraints still enforced:
- Difficulty balance: 3 easy / 4 medium / 3 hard
- Category cap: max 40% from any single category

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADAPTIVE` | `true` | Enable adaptive weighting |
| `SESSION_SIZE` | `10` | Number of exercises per session |
| `SESSION_COUNT` | `1` | Number of sessions to generate |

## Artifacts

| File | Format | Description |
|------|--------|-------------|
| `out/progress/weakness-profile.json` | JSON | Performance by category/difficulty/phase |
| `out/progress/learner-summary.md` | Markdown | Strengths/weaknesses overview |
| `out/progress/exercise-progress.json` | JSON | Persistent exercise state |
| `out/progress/session-history.jsonl` | JSONL | Append-only session log |

## Pipeline Integration

```
exercises + progress store
    ↓
build weakness profile → weakness-profile.json
    ↓
compute adaptive weights
    ↓
rank candidates (adaptive or basic)
    ↓
select session (difficulty balance + category cap)
    ↓
study session + learner-summary.md
```
