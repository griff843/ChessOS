/**
 * Grading-aware exercise progress update (M7C).
 *
 * Extends binary correct/incorrect tracking with:
 *   - Rolling quality score (EMA, decay 0.7)
 *   - Eval loss averaging (EMA, decay 0.7)
 *   - Tier-aware interval scheduling
 *   - Mastery state derivation
 *   - Review urgency computation
 */

import type { ProgressStore, GradedExerciseResult } from "../progress/types.js";
import { computeNextReviewAt } from "../progress/schedule-next-review.js";
import { TIER_QUALITY_SCORES } from "../scheduling/review-policy.js";
import { computeNextIntervalByTier } from "../scheduling/compute-next-review.js";
import { computeReviewUrgency } from "../scheduling/compute-review-urgency.js";
import { deriveMasteryState } from "./derive-mastery-state.js";

/** EMA decay factor for quality score and eval loss averaging. */
const EMA_DECAY = 0.7;

/**
 * Record graded session results, updating all M7C fields.
 *
 * Performs the same binary updates as `recordExerciseResults` (lastResult,
 * timesCorrect/Incorrect, status) plus grading-aware updates.
 *
 * @param store     The progress store to update (mutated in place)
 * @param results   Array of graded exercise results
 * @param timestamp ISO timestamp of when results were recorded
 */
export function recordGradedResults(
  store: ProgressStore,
  results: GradedExerciseResult[],
  timestamp: string
): void {
  for (const { exerciseId, result, gradingTier, evalLossCp } of results) {
    const entry = store.exercises[exerciseId];
    if (!entry) continue;

    // ── Binary updates (same as recordExerciseResults) ──────────────
    entry.lastResult = result;
    entry.lastSeenAt = timestamp;

    if (result === "correct") {
      entry.timesCorrect++;
      entry.status = "correct";
    } else {
      entry.timesIncorrect++;
      entry.status = "incorrect";
    }

    // ── Grading-aware updates (M7C) ─────────────────────────────────

    // Track whether this is the first graded attempt (before updating tier)
    const isFirstGrading = entry.lastGradingTier === null;

    // Last grading tier
    entry.lastGradingTier = gradingTier;

    // Rolling quality score (EMA)
    const qualityScore = TIER_QUALITY_SCORES[gradingTier];
    entry.rollingQualityScore = isFirstGrading
      ? qualityScore // First graded attempt: use raw score
      : EMA_DECAY * entry.rollingQualityScore +
        (1 - EMA_DECAY) * qualityScore;

    // Eval loss averaging (EMA)
    entry.recentEvalLossCp = evalLossCp;
    if (evalLossCp !== null) {
      entry.averageEvalLossCp =
        entry.averageEvalLossCp === null
          ? evalLossCp
          : EMA_DECAY * entry.averageEvalLossCp +
            (1 - EMA_DECAY) * evalLossCp;
    }

    // Tier-aware interval scheduling
    const newInterval = computeNextIntervalByTier(
      entry.intervalDays,
      gradingTier
    );
    if (newInterval !== -1) {
      entry.intervalDays = newInterval;
      entry.nextReviewAt = computeNextReviewAt(timestamp, newInterval);
    }

    // Mastery state
    const totalAttempts = entry.timesCorrect + entry.timesIncorrect;
    entry.masteryState = deriveMasteryState(
      totalAttempts,
      entry.timesCorrect,
      entry.timesIncorrect,
      entry.rollingQualityScore,
      entry.intervalDays
    );

    // Review urgency
    entry.reviewUrgency = computeReviewUrgency(
      entry.nextReviewAt,
      timestamp,
      entry.lastGradingTier,
      entry.timesCorrect,
      entry.timesIncorrect
    );
  }

  store.lastUpdatedAt = timestamp;
}
