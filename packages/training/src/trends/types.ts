/**
 * Trend tracking types for M6D.
 *
 * Extends the M6C weakness profile with recency-aware stats,
 * trend direction detection, and difficulty auto-adjustment policy.
 */

/**
 * Trend direction for a performance bucket.
 *
 * Determined by comparing recentAccuracy vs lifetimeAccuracy:
 *   improving:         recentAccuracy >= lifetimeAccuracy + 0.10
 *   worsening:         recentAccuracy <= lifetimeAccuracy - 0.10
 *   stable:            otherwise
 *   insufficient_data: fewer than 3 recent attempts in the bucket
 */
export type TrendDirection =
  | "improving"
  | "stable"
  | "worsening"
  | "insufficient_data";

/**
 * A performance bucket with lifetime + recent stats and trend info.
 */
export interface TrendBucket {
  // Lifetime stats (from ProgressStore)
  lifetimeSeen: number;
  lifetimeCorrect: number;
  lifetimeIncorrect: number;
  lifetimeAccuracy: number;
  lifetimeMissRate: number;

  // Recent stats (last N attempts in this bucket from session history)
  recentSeen: number;
  recentCorrect: number;
  recentIncorrect: number;
  recentAccuracy: number;
  recentMissRate: number;

  // Derived
  trendDirection: TrendDirection;
  recencyWeightedMissRate: number;
  adaptiveWeight: number;

  // Metadata
  dueCount: number;
}

/**
 * Trend profile with lifetime + recent performance per bucket.
 */
export interface TrendProfile {
  generatedAt: string;
  /** Number of recent attempts per bucket used for the recent window */
  recentWindowSize: number;
  totalExercises: number;
  totalSeen: number;
  totalCorrect: number;
  totalIncorrect: number;
  overallAccuracy: number;
  byCategory: Record<string, TrendBucket>;
  byDifficulty: Record<string, TrendBucket>;
}

/**
 * Difficulty auto-adjustment policy.
 *
 * Gently adjusts the default 3/4/3 mix based on recent performance.
 * Changes are bounded to ±1 per tier.
 */
export interface DifficultyPolicy {
  generatedAt: string;
  /** Human-readable reason for the adjustment */
  reason: string;
  /** Default difficulty distribution */
  baseline: { easy: number; medium: number; hard: number };
  /** Adjusted difficulty distribution (may equal baseline) */
  adjusted: { easy: number; medium: number; hard: number };
  /** Session size this policy was computed for */
  sessionSize: number;
}

/**
 * Minimum recent attempts required to determine trend direction.
 */
export const MIN_TREND_ATTEMPTS = 3;

/**
 * Number of recent attempts per bucket for the recent window.
 */
export const RECENT_WINDOW_SIZE = 10;
