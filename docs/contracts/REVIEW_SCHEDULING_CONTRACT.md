# Review Scheduling Contract (M7C)

## GradedExerciseResult

```typescript
interface GradedExerciseResult {
  exerciseId: string;
  result: "correct" | "incorrect";
  gradingTier: GradingTier;
  evalLossCp: number | null;
}
```

## MasteryState

```typescript
type MasteryState = "unseen" | "learning" | "unstable" | "improving" | "mastered";
```

| State | Condition |
|-------|-----------|
| unseen | totalAttempts === 0 |
| learning | totalAttempts < 3 |
| mastered | totalAttempts >= 5 AND accuracy >= 0.8 AND intervalDays >= 14 |
| unstable | accuracy < 0.5 OR rollingQualityScore < 0.3 |
| improving | accuracy >= 0.5 AND rollingQualityScore >= 0.5 |
| learning | fallback (quality 0.3–0.5 gap) |

## Review Policy

### Interval Actions by Tier

| GradingTier | IntervalAction | Effect |
|-------------|---------------|--------|
| exact | advance | +1 step in [1,3,7,14,30] |
| acceptable | advance | +1 step in [1,3,7,14,30] |
| inaccuracy | hold | reschedule at same interval |
| mistake | step_back | -1 step in progression |
| blunder | reset | reset to 1 day |
| illegal | no_change | don't reschedule |

### Quality Scores

| GradingTier | Quality Score |
|-------------|--------------|
| exact | 1.0 |
| acceptable | 0.8 |
| inaccuracy | 0.5 |
| mistake | 0.3 |
| blunder | 0.1 |
| illegal | 0.0 |

Rolling quality uses EMA with decay factor 0.7.

## Review Urgency

```
urgency = overdueFactor × 0.4 + tierFactor × 0.3 + historyFactor × 0.3
```

| Factor | Formula | Range |
|--------|---------|-------|
| overdueFactor | clamp(daysOverdue / 7, 0, 1) | [0, 1] |
| tierFactor | 1 - qualityScore(lastGradingTier) | [0, 1] |
| historyFactor | 1 - accuracy | [0, 1] |

## Review Queue

Includes exercises that are:
- **overdue**: past their `nextReviewAt` date
- **unstable**: `masteryState === "unstable"`
- **due_soon**: `nextReviewAt` within 24 hours

Sorted by review urgency descending.

## Extended ExerciseProgress Fields

| Field | Type | Default |
|-------|------|---------|
| lastGradingTier | GradingTier \| null | null |
| rollingQualityScore | number | 0 |
| averageEvalLossCp | number \| null | null |
| recentEvalLossCp | number \| null | null |
| reviewUrgency | number | 0 |
| masteryState | MasteryState | "unseen" |

## Adaptive Session Integration

- **Due tier**: exercises sorted by `reviewUrgency` descending (tiebreaker before targetPriority)
- **Non-due**: exercises with `masteryState === "unstable"` get +0.3 additive boost to adaptive score

## Artifacts

| File | Format | Description |
|------|--------|-------------|
| `out/progress/exercise-progress.json` | JSON | Enhanced with M7C fields |
| `out/progress/review-queue.json` | JSON | ReviewQueue |
| `out/progress/review-queue.md` | Markdown | Human-readable review queue report |

## Backward Compatibility

- `recordExerciseResults` is untouched — binary callers still work
- `computeNextInterval` in schedule-next-review.ts is untouched
- Pre-M7C stores are backfilled with defaults in `mergeProgressStore`
- Urgency tiebreaker is no-op when urgency=0 (pre-M7C data)
- Unstable boost is no-op when masteryState is absent

## Functions

```
recordGradedResults(store, results: GradedExerciseResult[], timestamp) → void
deriveMasteryState(totalAttempts, timesCorrect, timesIncorrect, rollingQualityScore, intervalDays) → MasteryState
computeNextIntervalByTier(currentInterval, gradingTier) → number
computeReviewUrgency(nextReviewAt, now, lastGradingTier, timesCorrect, timesIncorrect) → number
buildReviewQueue(store, now) → ReviewQueue
formatReviewQueueMd(queue) → string
```
