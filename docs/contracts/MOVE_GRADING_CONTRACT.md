# Move Grading Contract

## GradingTier

```typescript
type GradingTier =
  | "exact"       // user played the engine's best move
  | "acceptable"  // eval loss < 50cp
  | "inaccuracy"  // eval loss 50–149cp
  | "mistake"     // eval loss 150–299cp
  | "blunder"     // eval loss ≥ 300cp
  | "illegal";    // move failed validation (pre-grading)
```

## Eval Loss Bands

| Tier | Centipawn Loss | Description |
|------|---------------|-------------|
| exact | 0 | Matches engine best move |
| acceptable | < 50 | Minor deviation, no real damage |
| inaccuracy | 50–149 | Noticeable loss of advantage |
| mistake | 150–299 | Significant positional or material cost |
| blunder | ≥ 300 | Severe loss, likely game-altering |
| illegal | N/A | Failed move validation |

Bands are tighter than classifier MISTAKE_THRESHOLDS (100/200/350) because
user attempt grading compares directly against the best move with no
side-to-move tempo artifact.

## Eval Loss Computation

| User Move | evalLossCp | Source |
|-----------|-----------|--------|
| Matches best move | 0 | Exact match |
| Matches original game move | exercise.evalSwing | Known from corpus |
| Any other legal move | null | Unknown without engine |

When `evalLossCp` is null, the default tier is `"inaccuracy"` (configurable
via `DEFAULT_UNKNOWN_TIER` constant).

## MoveQualityResult

```typescript
interface MoveQualityResult {
  gradingTier: GradingTier;
  evalLossCp: number | null;
  isExact: boolean;
  isGameMove: boolean;
}
```

## Extended PuzzleAttempt

```typescript
interface PuzzleAttempt {
  exerciseId: string;
  exerciseIndex: number;
  fen: string;
  sideToMove: ChessColor;
  lessonCategory: LessonCategory;
  difficultyEstimate: DifficultyEstimate;
  playedMoveSan: string;
  userMove: string;
  userMoveUci: string;
  engineMove: string;
  engineMoveUci: string;
  isCorrect: boolean;       // backward compat: gradingTier === "exact"
  gradingTier: GradingTier;  // M7B
  evalLossCp: number | null; // M7B
  timestamp: string;
}
```

## SessionAnalytics

```typescript
interface SessionAnalytics {
  sessionId: string;
  totalExercises: number;
  generatedAt: string;
  gradeDistribution: Record<GradingTier, number>;
  evalLossStats: {
    count: number;
    total: number;
    average: number | null;
    median: number | null;
    max: number | null;
  };
  byCategoryMissRate: Record<string, BucketMissRate>;
  byDifficultyMissRate: Record<string, BucketMissRate>;
  hardestMissed: HardMiss[];
}
```

## Artifacts

| File | Format | Description |
|------|--------|-------------|
| `out/results/<sessionId>/results.json` | JSON | PuzzleResult with graded attempts |
| `out/results/<sessionId>/session-results.json` | JSON | Binary correct/incorrect (unchanged) |
| `out/results/<sessionId>/session-analytics.json` | JSON | SessionAnalytics |
| `out/results/<sessionId>/session-analytics.md` | Markdown | Human-readable analytics report |

## Backward Compatibility

- `isCorrect` maps to `gradingTier === "exact"`
- `session-results.json` uses binary `"correct" | "incorrect"` for progress tracking
- `recordExerciseResults()` still receives binary results
- Progress tracking, spaced repetition, and adaptive sessions are unaffected

## Grading Functions

```
gradeAttempt(exercise, index, userSan, userUci) → PuzzleAttempt
classifyMoveQuality(userUci, bestUci, playedUci, evalSwing) → MoveQualityResult
tierFromEvalLoss(evalLossCp) → GradingTier
buildSessionAnalytics(sessionId, attempts, topN) → SessionAnalytics
```

## CLI Command

```bash
pnpm --filter worker run solve-session
```

Grading is automatic — no additional flags needed.
