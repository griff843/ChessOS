/**
 * Review policy constants mapping grading tiers to interval actions
 * and quality scores.
 *
 * These drive tier-aware spaced repetition scheduling (M7C).
 */

import type { GradingTier } from "../grading/eval-loss-bands.js";

/**
 * What to do with the review interval after a graded attempt.
 *
 * - advance:   move to the next step in INTERVAL_PROGRESSION
 * - hold:      reschedule at the same interval
 * - step_back: move one step back in INTERVAL_PROGRESSION
 * - reset:     reset to the first step (1 day)
 * - no_change: don't reschedule (used for illegal moves)
 */
export type IntervalAction =
  | "advance"
  | "hold"
  | "step_back"
  | "reset"
  | "no_change";

/** Maps each grading tier to an interval action. */
export const TIER_INTERVAL_ACTION: Record<GradingTier, IntervalAction> = {
  exact: "advance",
  acceptable: "advance",
  inaccuracy: "hold",
  mistake: "step_back",
  blunder: "reset",
  illegal: "no_change",
};

/**
 * Quality scores per tier, used for rolling quality EMA.
 *
 * exact and acceptable both advance the interval, but acceptable's
 * lower quality score (0.8 vs 1.0) means slower mastery progression.
 */
export const TIER_QUALITY_SCORES: Record<GradingTier, number> = {
  exact: 1.0,
  acceptable: 0.8,
  inaccuracy: 0.5,
  mistake: 0.3,
  blunder: 0.1,
  illegal: 0.0,
};

/** The progression of review intervals in days (shared with schedule-next-review). */
export const INTERVAL_PROGRESSION = [1, 3, 7, 14, 30] as const;
