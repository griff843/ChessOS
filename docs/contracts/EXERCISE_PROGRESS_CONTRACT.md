# Exercise Progress Contract

## ExerciseStatus

```typescript
type ExerciseStatus =
  | "unseen"          // Never shown to the user
  | "seen"            // Shown in a session but no result recorded
  | "correct"         // Last attempt was correct
  | "incorrect"       // Last attempt was incorrect
  | "due_for_review"; // Review interval has elapsed
```

## ExerciseProgress

```typescript
interface ExerciseProgress {
  exerciseId: string;
  gameId: string;
  positionId: string;
  lessonCategory: LessonCategory;
  difficultyEstimate: DifficultyEstimate;
  status: ExerciseStatus;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  timesSeen: number;
  timesCorrect: number;
  timesIncorrect: number;
  lastResult: "correct" | "incorrect" | null;
  nextReviewAt: string | null;
  intervalDays: number;
}
```

## ProgressStore

```typescript
interface ProgressStore {
  totalExercises: number;
  exercises: Record<string, ExerciseProgress>;
  lastUpdatedAt: string;
}
```

## Artifact paths

| Artifact | Path |
|----------|------|
| Progress store | `out/progress/exercise-progress.json` |
| Session history | `out/progress/session-history.jsonl` |

## Status transitions

```
unseen → seen            (session generated)
seen → correct           (result recorded: correct)
seen → incorrect         (result recorded: incorrect)
correct → due_for_review (nextReviewAt has passed)
incorrect → due_for_review (nextReviewAt has passed)
due_for_review → correct (result recorded: correct)
due_for_review → incorrect (result recorded: incorrect)
```

## Spaced repetition schedule

Interval progression on correct answers:

```
0 → 1 → 3 → 7 → 14 → 30 (days)
```

On incorrect answer: reset interval to 1 day.

`nextReviewAt = lastSeenAt + intervalDays`

## Session selection priority

When generating a session, exercises are prioritized:

1. `due_for_review` (highest priority)
2. `unseen`
3. `seen`
4. `incorrect`
5. `correct` (lowest priority)

Within each priority tier, exercises are sorted by `targetPriority` descending.

## Rules

- Progress store is file-based and deterministic
- All timestamps are ISO 8601
- exerciseId = positionId (e.g., "game11:33")
- The store auto-merges with new exercises on load
- Single-user local system (no multi-user support)
