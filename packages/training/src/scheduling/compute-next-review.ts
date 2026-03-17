/**
 * Tier-aware next-review interval computation.
 *
 * Uses the grading tier's IntervalAction to determine how the
 * interval should change, then delegates date computation to
 * computeNextReviewAt from schedule-next-review.
 */

import type { GradingTier } from "../grading/eval-loss-bands.js";
import {
  TIER_INTERVAL_ACTION,
  INTERVAL_PROGRESSION,
} from "./review-policy.js";

/** Widened to number[] so indexOf(number) works without literal type errors. */
const progression: readonly number[] = INTERVAL_PROGRESSION;

/**
 * Compute the next review interval based on the current interval
 * and the grading tier of the latest attempt.
 *
 * @param currentInterval  Current interval in days (0 if never reviewed)
 * @param gradingTier      The grading tier from the latest attempt
 * @returns The new interval in days, or -1 for no_change (don't reschedule)
 */
export function computeNextIntervalByTier(
  currentInterval: number,
  gradingTier: GradingTier
): number {
  const action = TIER_INTERVAL_ACTION[gradingTier];

  switch (action) {
    case "reset":
      return progression[0]; // 1 day

    case "hold":
      // Stay at current interval; if 0 (never reviewed), use first step
      return currentInterval === 0 ? progression[0] : currentInterval;

    case "step_back": {
      const currentIndex = progression.indexOf(currentInterval);
      if (currentIndex <= 0) {
        // Already at minimum or not in progression
        return progression[0];
      }
      return progression[currentIndex - 1];
    }

    case "advance": {
      const currentIndex = progression.indexOf(currentInterval);
      if (currentIndex === -1) {
        // Not in standard progression — find closest step above
        const nextStep = progression.find(
          (d) => d > currentInterval
        );
        return (
          nextStep ?? progression[progression.length - 1]
        );
      }
      // Advance to next step, cap at max
      const nextIndex = Math.min(
        currentIndex + 1,
        progression.length - 1
      );
      return progression[nextIndex];
    }

    case "no_change":
      return -1; // Sentinel: don't reschedule
  }
}
