# Trend Profile Contract

## TrendDirection

```typescript
type TrendDirection = "improving" | "stable" | "worsening" | "insufficient_data";
```

## TrendBucket

```typescript
interface TrendBucket {
  lifetimeSeen: number;
  lifetimeCorrect: number;
  lifetimeIncorrect: number;
  lifetimeAccuracy: number;
  lifetimeMissRate: number;
  recentSeen: number;
  recentCorrect: number;
  recentIncorrect: number;
  recentAccuracy: number;
  recentMissRate: number;
  trendDirection: TrendDirection;
  recencyWeightedMissRate: number;
  adaptiveWeight: number;
  dueCount: number;
}
```

## TrendProfile

```typescript
interface TrendProfile {
  generatedAt: string;
  recentWindowSize: number;
  totalExercises: number;
  totalSeen: number;
  totalCorrect: number;
  totalIncorrect: number;
  overallAccuracy: number;
  byCategory: Record<string, TrendBucket>;
  byDifficulty: Record<string, TrendBucket>;
}
```

## DifficultyPolicy

```typescript
interface DifficultyPolicy {
  generatedAt: string;
  reason: string;
  baseline: { easy: number; medium: number; hard: number };
  adjusted: { easy: number; medium: number; hard: number };
  sessionSize: number;
}
```

## Axes

| Axis | Keys | Source |
|------|------|--------|
| Category | `critical_defense`, `endgame_technique`, `material_loss`, `opening_inaccuracy`, `calculation_error`, `tactical_miss`, `positional_error` | `ExerciseProgress.lessonCategory` |
| Difficulty | `easy`, `medium`, `hard` | `ExerciseProgress.difficultyEstimate` |

## Recent window

The recent window for each bucket is the **last 10 attempts** (correct or incorrect results) that fall into that bucket, extracted from session history in chronological order.

- Source: `out/progress/session-history.jsonl` (completed sessions only)
- Window size: 10 per bucket
- Minimum for trend detection: 3 attempts

## Recency-weighted miss rate

```
lifetimeMissRate = min(lifetimeIncorrect / max(lifetimeSeen, 1), 1.0)
recentMissRate   = min(recentIncorrect / max(recentSeen, 1), 1.0)
weightedMissRate = recentMissRate × 0.7 + lifetimeMissRate × 0.3
adaptiveWeight   = 1.0 + min(weightedMissRate × 1.5, 1.5)
```

Bounded: adaptiveWeight ∈ [1.0, 2.5]

## Trend direction rules

Requires at least 3 recent attempts in the bucket.

```
improving:  recentAccuracy >= lifetimeAccuracy + 0.10
worsening:  recentAccuracy <= lifetimeAccuracy - 0.10
stable:     otherwise
```

If fewer than 3 recent attempts: `insufficient_data`.

## Difficulty auto-adjustment policy

Default mix: 3 easy / 4 medium / 3 hard (session size 10).

Rules applied in order (first match wins):

| Condition | Adjusted mix | Reason |
|-----------|-------------|--------|
| hard recentAccuracy < 0.30 AND recentSeen ≥ 3 | 4 / 4 / 2 | Hard exercises too difficult |
| easy recentAccuracy > 0.80 AND hard recentAccuracy > 0.60 AND both recentSeen ≥ 3 | 2 / 4 / 4 | Strong performance, increase challenge |
| medium recentAccuracy < 0.30 AND recentSeen ≥ 3 | 2 / 5 / 3 | Medium exercises need reinforcement |
| otherwise | 3 / 4 / 3 | Default balanced mix |

Changes are bounded to ±1 per tier from the baseline. The total always equals sessionSize.

## Artifact paths

| Artifact | Path |
|----------|------|
| Trend profile | `out/progress/trend-profile.json` |
| Difficulty policy | `out/progress/difficulty-policy.json` |
| Learner summary | `out/progress/learner-summary.md` |

## Rules

- Profile is deterministic: same progress store + session history → same profile
- Profile is regenerated on every `generate-session` run
- Adaptive mode is on by default; disable with `ADAPTIVE=false`
- All timestamps are ISO 8601
- Single-user local system
