# Web Study Session Contract

## Overview

Interactive browser-based study sessions. The user sees a chessboard, makes a move, receives graded feedback, and repeats through all exercises. On completion, results are persisted through the canonical engine/training pipeline.

## Architecture Rules

1. **No grading logic in the frontend.** All move validation and grading flows through `@chess-os/training` functions on the server.
2. **Thin server adapter pattern.** `lib/study-server.ts` wraps canonical engine functions — it does not reimplement them.
3. **Server Actions only.** Client components call `submitMove()` and `completeSession()` — never import engine/training code directly.
4. **Canonical artifact persistence.** Session results, progress updates, mastery state changes, and review queue updates all flow through `recordGradedResults()` from `@chess-os/training`.

## Data Flow

```
Browser (StudyPlayer)
  → Server Action: submitMove(sessionId, exerciseIndex, moveInput)
    → validateMove(fen, moveInput)          [chess-core]
    → gradeAttempt(exercise, userMoveUci)    [training/grading]
    ← GradeResult { tier, isCorrect, evalLoss, attempt }
  → Server Action: completeSession(sessionId, rawAttempts, startedAt)
    → buildPuzzleResult()                    [training/runner]
    → buildSessionAnalytics()                [training/analytics]
    → recordGradedResults()                  [training/mastery]
    → refreshDueStatus() + buildReviewQueue()
    → Write artifacts to disk
    ← CompletionResult { accuracy, grades, hardestMisses, masteryChanges }
```

## Key Files

| File | Role |
|---|---|
| `apps/web/src/lib/study-server.ts` | Server adapter — wraps engine functions |
| `apps/web/src/lib/study-types.ts` | Study-specific TypeScript types |
| `apps/web/src/app/study/actions.ts` | Server Actions (submitMove, completeSession, loadSessionData) |
| `apps/web/src/app/study/[sessionId]/page.tsx` | Study route (server component) |
| `apps/web/src/components/study/study-player.tsx` | Main client orchestrator |
| `apps/web/src/components/study/study-board.tsx` | Chessboard wrapper (react-chessboard v5) |
| `apps/web/src/components/study/feedback-panel.tsx` | Grade feedback + continue |
| `apps/web/src/components/study/progress-rail.tsx` | Progress dots + stats |
| `apps/web/src/components/study/completion-recap.tsx` | Session complete recap |
| `apps/web/src/components/study/exercise-info.tsx` | Exercise metadata display |

## Grading Tiers

| Tier | Color | Meaning |
|---|---|---|
| exact | green/success | User played the engine's top move |
| acceptable | blue/accent | Close to best, small eval loss |
| inaccuracy | yellow/warning | Noticeable eval loss |
| mistake | red/danger | Significant eval loss |
| blunder | red/danger | Critical eval loss |

## Artifacts Written on Completion

- `out/progress/exercise-progress.json` — Updated mastery states
- `out/progress/session-history.jsonl` — Appended completion record
- `out/progress/review-queue.json` — Refreshed review queue

## Bundler Configuration

- **Build:** `next build --webpack` (webpack supports `resolve.extensionAlias` for `.js` → `.ts` mapping)
- **Dev:** `next dev --webpack` (same reason)
- `next.config.js` has both `webpack` and `turbopack` configs; Turbopack's `resolveExtensions` is set but `.js` → `.ts` aliasing requires webpack
