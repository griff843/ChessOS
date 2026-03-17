# Trend Tracking Runbook

## Prerequisites

1. Exercise corpus exists (`pnpm --filter worker run generate-exercises`)
2. At least one session generated and results recorded for trend data

## Generate a trend-aware adaptive session

```bash
pnpm --filter worker run generate-session
```

Trend-aware adaptive mode is **on by default**. To disable:

```bash
ADAPTIVE=false pnpm --filter worker run generate-session
```

### What happens (trend-aware adaptive mode)

1. Load exercise corpus and progress store
2. Refresh due-for-review statuses
3. Load session history from JSONL
4. **Build trend profile** (lifetime + recent stats per bucket)
5. **Determine trend directions** (improving / stable / worsening)
6. **Compute recency-weighted adaptive weights** (recent × 0.7 + lifetime × 0.3)
7. **Compute difficulty policy** (may adjust 3/4/3 mix gently)
8. Rank exercises using trend-aware weights
9. Generate session with policy-adjusted difficulty distribution
10. Write trend profile, difficulty policy, and learner summary
11. Mark exercises as "seen", save progress store, append session history

### Recency weighting formula

```
lifetimeMissRate     = min(lifetimeIncorrect / max(lifetimeSeen, 1), 1.0)
recentMissRate       = min(recentIncorrect / max(recentSeen, 1), 1.0)
weightedMissRate     = recentMissRate × 0.7 + lifetimeMissRate × 0.3
adaptiveWeight       = 1.0 + min(weightedMissRate × 1.5, 1.5)
```

Bounded: adaptiveWeight ∈ [1.0, 2.5]

### Recent window

Last **10 attempts** per bucket from completed sessions in session history.

### Trend direction

| Condition | Direction |
|-----------|-----------|
| recentAccuracy >= lifetimeAccuracy + 0.10 | improving |
| recentAccuracy <= lifetimeAccuracy - 0.10 | worsening |
| otherwise | stable |
| fewer than 3 recent attempts | insufficient_data |

### Difficulty auto-adjustment

| Condition | Mix | Reason |
|-----------|-----|--------|
| hard accuracy < 30% | 4/4/2 | Hard too difficult |
| easy > 80% AND hard > 60% | 2/4/4 | Increase challenge |
| medium < 30% | 2/5/3 | Medium reinforcement |
| otherwise | 3/4/3 | Default balanced |

Changes bounded to ±1 per tier.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADAPTIVE` | `true` | Enable adaptive weighting |
| `SESSION_SIZE` | `10` | Number of exercises per session |
| `SESSION_COUNT` | `1` | Number of sessions to generate |

## Artifacts

| File | Format | Description |
|------|--------|-------------|
| `out/progress/trend-profile.json` | JSON | Lifetime + recent stats per bucket |
| `out/progress/difficulty-policy.json` | JSON | Difficulty mix adjustment |
| `out/progress/learner-summary.md` | Markdown | Trend-aware learner overview |
| `out/progress/exercise-progress.json` | JSON | Persistent exercise state |
| `out/progress/session-history.jsonl` | JSONL | Append-only session log |

## Pipeline Integration

```
exercises + progress store + session history
    ↓
build trend profile → trend-profile.json
    ↓
determine trend directions + compute recency weights
    ↓
compute difficulty policy → difficulty-policy.json
    ↓
rank candidates (trend-aware adaptive)
    ↓
select session (policy-adjusted difficulty + category cap)
    ↓
study session + learner-summary.md
```
