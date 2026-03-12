/**
 * Progress-aware exercise selection for study sessions.
 *
 * Priority order:
 *   1. Due for review (nextReviewAt has passed)
 *   2. Unseen exercises
 *   3. Remaining exercises (by targetPriority)
 *
 * Within each priority tier, exercises are sorted by targetPriority
 * descending. The result is a re-ordered exercise list that the
 * existing session builder can use directly.
 *
 * Difficulty balance and category balance are still enforced by
 * the downstream selectSessionExercises() function.
 */

import type { TrainingExercise } from "../exercises/types";
import type { ProgressStore } from "./types";

/**
 * Assign a selection priority based on progress state.
 *
 * Lower number = higher priority (selected first).
 *   0 = due_for_review
 *   1 = unseen
 *   2 = seen (shown but no result yet)
 *   3 = incorrect (recently wrong, not yet due)
 *   4 = correct (recently right, not yet due)
 */
function getSelectionPriority(
  exerciseId: string,
  store: ProgressStore
): number {
  const entry = store.exercises[exerciseId];
  if (!entry) return 1; // Unknown = treat as unseen

  switch (entry.status) {
    case "due_for_review":
      return 0;
    case "unseen":
      return 1;
    case "seen":
      return 2;
    case "incorrect":
      return 3;
    case "correct":
      return 4;
    default:
      return 5;
  }
}

/**
 * Re-order exercises based on progress state.
 *
 * Returns a new array with exercises sorted by:
 *   1. Selection priority (due > unseen > seen > incorrect > correct)
 *   2. Within same priority: targetPriority descending
 *
 * @param exercises  Full exercise corpus
 * @param store      Current progress store
 * @returns Exercises re-ordered for progress-aware selection
 */
export function prioritizeByProgress(
  exercises: TrainingExercise[],
  store: ProgressStore
): TrainingExercise[] {
  return [...exercises].sort((a, b) => {
    const priA = getSelectionPriority(a.positionId, store);
    const priB = getSelectionPriority(b.positionId, store);

    if (priA !== priB) return priA - priB;

    // Due tier: sort by reviewUrgency descending, then targetPriority
    if (priA === 0) {
      const urgA = store.exercises[a.positionId]?.reviewUrgency ?? 0;
      const urgB = store.exercises[b.positionId]?.reviewUrgency ?? 0;
      if (urgA !== urgB) return urgB - urgA;
    }

    // Within same priority tier, prefer higher targetPriority
    return b.targetPriority - a.targetPriority;
  });
}
