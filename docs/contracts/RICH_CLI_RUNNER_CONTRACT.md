# Rich CLI Runner Contract (M8A)

Extends [PUZZLE_RUNNER_CONTRACT.md](./PUZZLE_RUNNER_CONTRACT.md). All M7A/M7B/M7C behavior is preserved.

## New Types

```typescript
interface MasteryChange {
  exerciseId: string;
  before: MasteryState;
  after: MasteryState;
  changed: boolean;
}

interface SessionRecapInput {
  result: PuzzleResult;
  analytics: SessionAnalytics;
  masteryChanges: MasteryChange[];
  topReviewItems: ReviewQueueEntry[];
}
```

## New Functions

```
formatSessionProgress(attempts, total) → string
buildMasteryChanges(beforeSnapshot, afterStore, exerciseIds) → MasteryChange[]
formatSessionRecap(input) → string
formatSessionRecapMd(input) → string
```

### formatSessionProgress

Pure function. Shows running progress after each exercise:
- Progress bar with completion fraction
- Running accuracy (percentage + fraction)
- Grade distribution (inline, non-zero tiers only)
- Current streak (consecutive correct/incorrect)

### buildMasteryChanges

Pure function. Diffs mastery states before/after `recordGradedResults`. Takes a snapshot map (captured before recording) and the updated store.

### formatSessionRecap / formatSessionRecapMd

Pure functions. Render the end-of-session recap for CLI (ASCII) and markdown (artifact) respectively.

Sections:
1. Session overview (ID, duration, exercises, accuracy)
2. Grade distribution (bar chart with counts and percentages)
3. Eval loss statistics (average, median, max)
4. Hardest misses (top 3, with user/best move, eval loss, category)
5. Mastery changes (grouped by transition, omitted if none)
6. Review attention (top items by urgency, omitted if none)
7. Weak spots (worst category + difficulty by miss rate)

## Enhanced Functions

### formatExercisePrompt (enhanced)

- Double-line top border for visual separation
- Added: game source (gameId + ply)
- Added: position eval before the move

### formatAttemptResult (enhanced)

- Boxed grade banner (double-line box drawing)
- User move and best move on separate labeled lines
- Added: lesson category
- Added: eval before/after (incorrect only)
- PV, eval swing, reason codes shown only on incorrect
- Clean minimal feedback for exact matches

## CLI Display Flow

```
Exercise prompt → User input → Validation → Grade → Attempt result → Running progress
    ↓ (repeat for each exercise)
End-of-session recap (with mastery changes + review attention)
```

## Artifacts

| File | Format | Description |
|------|--------|-------------|
| `out/results/<sessionId>/session-recap.md` | Markdown | Rich session recap |

All M7A/M7B/M7C artifacts unchanged.

## Backward Compatibility

- `formatSessionSummary` remains exported (no longer called by CLI)
- No type changes to PuzzleAttempt, PuzzleResult, EnrichedExercise
- All existing artifacts unchanged
- Progress store schema unchanged
