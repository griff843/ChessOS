/**
 * Readiness forecasting: derive learner readiness state from measured signals.
 *
 * Three states:
 *   - ready_to_expand: safe to increase challenge
 *   - hold_steady:     maintain current level
 *   - repair_mode:     reduce difficulty, focus on fundamentals
 *
 * Pure function — no I/O, deterministic.
 */

import type { ProgressStore } from "../progress/types.js";
import type { TrendProfile } from "../trends/types.js";
import type { ReviewQueue } from "../mastery/build-review-queue.js";
import type {
  PatternIntelligence,
  ReadinessForecast,
  ReadinessState,
  ReadinessSignal,
} from "./types.js";

// ── Signal Computation ───────────────────────────────────────────

function computeSignals(
  trendProfile: TrendProfile,
  store: ProgressStore,
  reviewQueue: ReviewQueue,
  patternIntelligence: PatternIntelligence
): ReadinessSignal[] {
  // Recent accuracy
  const recentBuckets = Object.values(trendProfile.byCategory);
  const totalRecentSeen = recentBuckets.reduce((s, b) => s + b.recentSeen, 0);
  const totalRecentCorrect = recentBuckets.reduce(
    (s, b) => s + b.recentCorrect,
    0
  );
  const recentAccuracy =
    totalRecentSeen > 0 ? totalRecentCorrect / totalRecentSeen : 1;

  // Worsening count
  const worseningCount = recentBuckets.filter(
    (b) => b.trendDirection === "worsening"
  ).length;

  // Unstable ratio
  const exercises = Object.values(store.exercises);
  const totalSeen = exercises.filter((e) => e.timesSeen > 0).length;
  const unstableCount = exercises.filter(
    (e) => e.masteryState === "unstable"
  ).length;
  const unstableRatio = totalSeen > 0 ? unstableCount / totalSeen : 0;

  // Overdue ratio
  const overdueCount = reviewQueue.entries.filter(
    (e) => e.reason === "overdue"
  ).length;
  const overdueRatio = totalSeen > 0 ? overdueCount / totalSeen : 0;

  // Recurring weakness count
  const recurringCount = patternIntelligence.recurringWeaknesses.length;

  return [
    {
      name: "recent_accuracy",
      value: recentAccuracy,
      threshold: 0.65,
      passed: recentAccuracy >= 0.65,
    },
    {
      name: "worsening_count",
      value: worseningCount,
      threshold: 1,
      passed: worseningCount <= 1,
    },
    {
      name: "unstable_ratio",
      value: unstableRatio,
      threshold: 0.2,
      passed: unstableRatio < 0.2,
    },
    {
      name: "overdue_ratio",
      value: overdueRatio,
      threshold: 0.15,
      passed: overdueRatio < 0.15,
    },
    {
      name: "recurring_count",
      value: recurringCount,
      threshold: 1,
      passed: recurringCount <= 1,
    },
  ];
}

// ── State Derivation ─────────────────────────────────────────────

function deriveState(signals: ReadinessSignal[]): {
  state: ReadinessState;
  reason: string;
} {
  const sig = (name: string) =>
    signals.find((s) => s.name === name)!;

  const recurring = sig("recurring_count").value;
  const unstable = sig("unstable_ratio").value;
  const overdue = sig("overdue_ratio").value;
  const worsening = sig("worsening_count").value;
  const recentAcc = sig("recent_accuracy").value;

  // Repair mode — multiple serious problems
  if (recurring >= 3) {
    return {
      state: "repair_mode",
      reason: `${recurring} recurring weaknesses detected — repair mode activated`,
    };
  }
  if (unstable >= 0.3) {
    return {
      state: "repair_mode",
      reason: `${(unstable * 100).toFixed(0)}% unstable exercises — repair mode activated`,
    };
  }
  if (overdue >= 0.25) {
    return {
      state: "repair_mode",
      reason: `${(overdue * 100).toFixed(0)}% overdue exercises — repair mode activated`,
    };
  }
  if (worsening >= 3) {
    return {
      state: "repair_mode",
      reason: `${worsening} worsening categories — repair mode activated`,
    };
  }

  // Hold steady — some concerns
  if (recurring >= 2) {
    return {
      state: "hold_steady",
      reason: `${recurring} recurring weaknesses — holding steady`,
    };
  }
  if (unstable >= 0.15) {
    return {
      state: "hold_steady",
      reason: `${(unstable * 100).toFixed(0)}% unstable exercises — holding steady`,
    };
  }
  if (overdue >= 0.1) {
    return {
      state: "hold_steady",
      reason: `${(overdue * 100).toFixed(0)}% overdue exercises — holding steady`,
    };
  }
  if (worsening >= 2) {
    return {
      state: "hold_steady",
      reason: `${worsening} worsening categories — holding steady`,
    };
  }
  if (recentAcc < 0.65) {
    return {
      state: "hold_steady",
      reason: `Recent accuracy ${(recentAcc * 100).toFixed(0)}% below 65% — holding steady`,
    };
  }

  // Ready to expand
  return {
    state: "ready_to_expand",
    reason: "All signals healthy — ready to expand challenge",
  };
}

// ── Main ─────────────────────────────────────────────────────────

/**
 * Forecast learner readiness from trend profile, progress, review queue,
 * and pattern intelligence.
 *
 * Pure function — no I/O, deterministic.
 */
export function buildReadinessForecast(
  trendProfile: TrendProfile,
  store: ProgressStore,
  reviewQueue: ReviewQueue,
  patternIntelligence: PatternIntelligence
): ReadinessForecast {
  const signals = computeSignals(
    trendProfile,
    store,
    reviewQueue,
    patternIntelligence
  );
  const { state, reason } = deriveState(signals);

  return {
    generatedAt: new Date().toISOString(),
    state,
    signals,
    reason,
  };
}
