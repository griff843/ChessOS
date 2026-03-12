# Puzzle Runner Contract

## PuzzleAttempt

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
  isCorrect: boolean;
  timestamp: string;
}
```

## PuzzleResult

```typescript
interface PuzzleResult {
  sessionId: string;
  startedAt: string;
  completedAt: string;
  totalExercises: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  attempts: PuzzleAttempt[];
}
```

## Move validation

1. Load FEN into chess.js Chess instance
2. Try user input as SAN: `chess.move(input)`
3. If SAN fails, try as UCI: `chess.move({ from, to, promotion })`
4. If both fail → invalid move, prompt again
5. Extract UCI from the validated move: `from + to + (promotion ?? "")`

## Correctness

A move is correct if:

```
userMoveUci === engineAnswer.bestMoveUci
```

## Result artifact

Written to: `out/results/<sessionId>/results.json`

Structure:

```json
{
  "sessionId": "session-33cecce1",
  "startedAt": "2026-03-07T...",
  "completedAt": "2026-03-07T...",
  "totalExercises": 10,
  "correctCount": 7,
  "incorrectCount": 3,
  "accuracy": 0.7,
  "attempts": [...]
}
```

## Record-session integration

A companion file compatible with `record-session` is written to:

`out/results/<sessionId>/session-results.json`

Structure:

```json
{
  "sessionId": "session-33cecce1",
  "results": [
    { "exerciseId": "game26:37", "result": "correct" },
    { "exerciseId": "game24:46", "result": "incorrect" }
  ]
}
```

Progress is automatically updated after solving.

## CLI command

```bash
pnpm --filter worker run solve-session
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SESSION_ID` | latest | Session ID to solve (omit for most recent) |

## Rules

- Runner is deterministic: same inputs → same outputs
- Move validation uses chess.js (via chess-core)
- Runner logic lives in `packages/training/src/runner/`
- Worker (`apps/worker/src/solve-session.ts`) handles CLI I/O only
- Results integrate with existing progress tracking pipeline
