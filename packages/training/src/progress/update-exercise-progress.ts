/**
 * Update exercise progress state based on session results.
 *
 * Handles:
 *   - Marking exercises as seen
 *   - Recording correct/incorrect results
 *   - Updating counts
 *   - Scheduling next review via spaced repetition
 *   - Transitioning to due_for_review when interval elapses
 */

import type {
  ExerciseProgress,
  ProgressStore,
  SessionExerciseResult,
} from "./types";
import {
  computeNextInterval,
  computeNextReviewAt,
} from "./schedule-next-review";

/**
 * Mark exercises as seen (when a session is generated).
 *
 * @param store        The progress store to update (mutated in place)
 * @param exerciseIds  IDs of exercises included in the session
 * @param timestamp    ISO timestamp of when the session was created
 */
export function markExercisesSeen(
  store: ProgressStore,
  exerciseIds: string[],
  timestamp: string
): void {
  for (const id of exerciseIds) {
    const entry = store.exercises[id];
    if (!entry) continue;

    if (entry.status === "unseen") {
      entry.status = "seen";
    }
    if (!entry.firstSeenAt) {
      entry.firstSeenAt = timestamp;
    }
    entry.lastSeenAt = timestamp;
    entry.timesSeen++;
  }

  store.lastUpdatedAt = timestamp;
}

/**
 * Record session results (correct/incorrect) for exercises.
 *
 * @param store     The progress store to update (mutated in place)
 * @param results   Array of exercise results
 * @param timestamp ISO timestamp of when results were recorded
 */
export function recordExerciseResults(
  store: ProgressStore,
  results: SessionExerciseResult[],
  timestamp: string
): void {
  for (const { exerciseId, result } of results) {
    const entry = store.exercises[exerciseId];
    if (!entry) continue;

    entry.lastResult = result;
    entry.lastSeenAt = timestamp;

    if (result === "correct") {
      entry.timesCorrect++;
      entry.status = "correct";
    } else {
      entry.timesIncorrect++;
      entry.status = "incorrect";
    }

    // Update spaced repetition schedule
    entry.intervalDays = computeNextInterval(entry.intervalDays, result === "correct");
    entry.nextReviewAt = computeNextReviewAt(timestamp, entry.intervalDays);
  }

  store.lastUpdatedAt = timestamp;
}

/**
 * Refresh the status of all exercises based on current time.
 *
 * Exercises whose nextReviewAt has passed transition to "due_for_review".
 *
 * @param store  The progress store to update (mutated in place)
 * @param now    Current ISO timestamp
 */
export function refreshDueStatus(
  store: ProgressStore,
  now: string
): void {
  const nowTime = new Date(now).getTime();

  for (const entry of Object.values(store.exercises)) {
    if (
      entry.nextReviewAt &&
      (entry.status === "correct" || entry.status === "incorrect") &&
      new Date(entry.nextReviewAt).getTime() <= nowTime
    ) {
      entry.status = "due_for_review";
    }
  }
}

/**
 * Get summary counts from the progress store.
 */
export function getProgressSummary(store: ProgressStore): {
  unseen: number;
  seen: number;
  correct: number;
  incorrect: number;
  due_for_review: number;
  total: number;
} {
  const counts = { unseen: 0, seen: 0, correct: 0, incorrect: 0, due_for_review: 0, total: 0 };

  for (const entry of Object.values(store.exercises)) {
    counts[entry.status]++;
    counts.total++;
  }

  return counts;
}
