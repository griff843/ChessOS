# Weakness Profile Contract

## PerformanceBucket

```typescript
interface PerformanceBucket {
  seenCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  missRate: number;
  dueCount: number;
  adaptiveWeight: number;
}
```

## WeaknessProfile

```typescript
interface WeaknessProfile {
  generatedAt: string;
  totalExercises: number;
  totalSeen: number;
  totalCorrect: number;
  totalIncorrect: number;
  overallAccuracy: number;
  overallMissRate: number;
  byCategory: Record<string, PerformanceBucket>;
  byDifficulty: Record<string, PerformanceBucket>;
  byPhase: Record<string, PerformanceBucket>;
}
```

## Axes

| Axis | Keys | Source |
|------|------|--------|
| Category | `critical_defense`, `endgame_technique`, `material_loss`, `opening_inaccuracy`, `calculation_error`, `tactical_miss`, `positional_error` | `ExerciseProgress.lessonCategory` |
| Difficulty | `easy`, `medium`, `hard` | `ExerciseProgress.difficultyEstimate` |
| Phase | `opening`, `middlegame`, `endgame` | `TrainingExercise.phase` |

## Bucket computation

For each bucket (set of exercises sharing the same axis value):

```
seenCount     = count of exercises where timesSeen > 0
correctCount  = Σ timesCorrect
incorrectCount = Σ timesIncorrect
accuracy      = correctCount / max(correctCount + incorrectCount, 1)
missRate      = min(incorrectCount / max(seenCount, 1), 1.0)
dueCount      = count of exercises where status === "due_for_review"
adaptiveWeight = 1.0 + missRate    // bounded [1.0, 2.0]
```

## Adaptive weighting formula

Per exercise, the combined adaptive weight is:

```
categoryWeight   = byCategory[exercise.lessonCategory].adaptiveWeight  ?? 1.0
difficultyWeight = byDifficulty[exercise.difficultyEstimate].adaptiveWeight ?? 1.0
combinedWeight   = (categoryWeight + difficultyWeight) / 2
adaptiveScore    = targetPriority × combinedWeight
```

## Session selection priority (adaptive)

```
1. due_for_review  → sorted by targetPriority descending (unchanged)
2. unseen          → sorted by adaptiveScore descending
3. seen            → sorted by adaptiveScore descending
4. incorrect       → sorted by adaptiveScore descending
5. correct         → sorted by adaptiveScore descending
```

Downstream constraints still enforced:
- Difficulty balance: 3 easy / 4 medium / 3 hard
- Category cap: max 40% from any single category

## Artifact paths

| Artifact | Path |
|----------|------|
| Weakness profile | `out/progress/weakness-profile.json` |
| Learner summary | `out/progress/learner-summary.md` |

## Rules

- Profile is deterministic: same progress store + exercises → same profile
- Profile is regenerated on every `generate-session` run
- Adaptive mode is on by default; disable with `ADAPTIVE=false`
- All timestamps are ISO 8601
- Single-user local system (no multi-user support)
