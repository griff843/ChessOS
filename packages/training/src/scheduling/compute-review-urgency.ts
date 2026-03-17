/**
 * Review urgency scoring.
 *
 * Base formula (3-factor, backward compatible):
 *   - How overdue the exercise is (40%)
 *   - How poor the last grading tier was (30%)
 *   - Historical accuracy (30%)
 *
 * Enhanced formula (6-factor, when options provided):
 *   - Overdue (25%), tier (15%), history (15%),
 *     severity (15%), recurrence (15%), mastery gap (15%)
 */

import type { GradingTier } from "../grading/eval-loss-bands.js";
import { TIER_QUALITY_SCORES } from "./review-policy.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Severity scores for the enhanced urgency formula. */
const SEVERITY_SCORES: Record<string, number> = {
  critical: 1.0,
  moderate: 0.6,
  minor: 0.3,
};

/**
 * Options for the enhanced 6-factor urgency formula.
 * When omitted, the original 3-factor formula is used.
 */
export interface ReviewUrgencyOptions {
  /** Severity from pattern intelligence for this exercise's category. */
  categorySeverity?: "critical" | "moderate" | "minor" | null;
  /** Recurrence score for this exercise's category [0, 1]. */
  categoryRecurrence?: number;
  /** Mastery gap: higher = further from mastered [0, 1]. */
  masteryGap?: number;
}

/**
 * Compute a review urgency score in [0, 1].
 *
 * Higher values mean the exercise needs review more urgently.
 *
 * @param nextReviewAt     ISO date string of next scheduled review (null if never scheduled)
 * @param now              Current timestamp as ISO string
 * @param lastGradingTier  Last grading tier (null if never attempted)
 * @param timesCorrect     Total correct attempts
 * @param timesIncorrect   Total incorrect attempts
 * @param options          Optional enhanced scoring parameters
 */
export function computeReviewUrgency(
  nextReviewAt: string | null,
  now: string,
  lastGradingTier: GradingTier | null,
  timesCorrect: number,
  timesIncorrect: number,
  options?: ReviewUrgencyOptions
): number {
  // Overdue factor: how many days past the review date (capped at 7 days)
  let overdueFactor = 0;
  if (nextReviewAt) {
    const daysOverdue =
      (new Date(now).getTime() - new Date(nextReviewAt).getTime()) /
      MS_PER_DAY;
    overdueFactor = clamp(daysOverdue / 7, 0, 1);
  }

  // Tier factor: inverse of quality score (worse tier → higher urgency)
  const tierFactor = lastGradingTier
    ? 1 - TIER_QUALITY_SCORES[lastGradingTier]
    : 0;

  // History factor: inverse of accuracy
  const totalAttempts = timesCorrect + timesIncorrect;
  const accuracy = totalAttempts > 0 ? timesCorrect / totalAttempts : 1;
  const historyFactor = 1 - accuracy;

  // Original 3-factor formula when no options provided
  if (!options) {
    return overdueFactor * 0.4 + tierFactor * 0.3 + historyFactor * 0.3;
  }

  // Enhanced 6-factor formula
  const severityFactor =
    options.categorySeverity
      ? SEVERITY_SCORES[options.categorySeverity] ?? 0
      : 0;
  const recurrenceFactor = options.categoryRecurrence ?? 0;
  const masteryGapFactor = options.masteryGap ?? 0;

  return (
    overdueFactor * 0.25 +
    tierFactor * 0.15 +
    historyFactor * 0.15 +
    severityFactor * 0.15 +
    recurrenceFactor * 0.15 +
    masteryGapFactor * 0.15
  );
}
