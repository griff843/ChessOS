/**
 * Build mistake patterns from learner state.
 *
 * Pure function: detects recurring issues from progress store,
 * trend profile, and review queue. No I/O.
 */

import type { ProgressStore } from "../progress/types.js";
import type { TrendProfile, TrendDirection } from "../trends/types.js";
import type { ReviewQueue } from "../mastery/build-review-queue.js";
import type { LessonCategory, DifficultyEstimate } from "../exercises/types.js";
import type {
  MistakePatterns,
  MistakePatternEntry,
  DifficultyPattern,
  BlunderProfile,
  PatternSeverity,
} from "./types.js";

const DIFFICULTY_ORDER: DifficultyEstimate[] = ["easy", "medium", "hard"];

const SEVERITY_ORDINAL: Record<PatternSeverity, number> = {
  critical: 3,
  moderate: 2,
  minor: 1,
};

/**
 * Classify severity from miss rate and trend direction.
 */
function classifySeverity(
  missRate: number,
  trendDirection: TrendDirection
): PatternSeverity {
  if (missRate >= 0.50) return "critical";
  if (trendDirection === "worsening" && missRate >= 0.30) return "critical";
  if (missRate >= 0.25) return "moderate";
  return "minor";
}

/**
 * Generate a deterministic description string for a category pattern.
 */
function describePattern(
  category: string,
  severity: PatternSeverity,
  missRate: number,
  trendDirection: TrendDirection,
  overdueCount: number
): string {
  const pct = (missRate * 100).toFixed(0);
  const parts: string[] = [];

  if (severity === "critical") {
    parts.push(`${category} has a critical ${pct}% miss rate`);
  } else if (severity === "moderate") {
    parts.push(`${category} has a ${pct}% miss rate`);
  } else {
    parts.push(`${category} has a minor ${pct}% miss rate`);
  }

  if (trendDirection === "worsening") {
    parts.push("and is worsening");
  } else if (trendDirection === "improving") {
    parts.push("but is improving");
  }

  if (overdueCount > 0) {
    parts.push(`with ${overdueCount} overdue review${overdueCount === 1 ? "" : "s"}`);
  }

  return parts.join(" ");
}

/**
 * Build mistake patterns from learner state.
 */
export function buildMistakePatterns(
  store: ProgressStore,
  trendProfile: TrendProfile,
  reviewQueue: ReviewQueue
): MistakePatterns {
  const now = new Date().toISOString();

  // Gather per-category stats from store
  const catStats = new Map<
    string,
    {
      total: number;
      incorrect: number;
      evalLossSum: number;
      evalLossCount: number;
      blunderCount: number;
      mistakeCount: number;
    }
  >();

  for (const entry of Object.values(store.exercises)) {
    const cat = entry.lessonCategory;
    let stats = catStats.get(cat);
    if (!stats) {
      stats = { total: 0, incorrect: 0, evalLossSum: 0, evalLossCount: 0, blunderCount: 0, mistakeCount: 0 };
      catStats.set(cat, stats);
    }
    stats.total++;
    stats.incorrect += entry.timesIncorrect;
    if (entry.averageEvalLossCp !== null) {
      stats.evalLossSum += entry.averageEvalLossCp;
      stats.evalLossCount++;
    }
    if (entry.lastGradingTier === "blunder") stats.blunderCount++;
    if (entry.lastGradingTier === "mistake") stats.mistakeCount++;
  }

  // Count overdue/unstable per category from review queue
  const catReview = new Map<string, { overdue: number; unstable: number }>();
  for (const entry of reviewQueue.entries) {
    const exercise = store.exercises[entry.exerciseId];
    if (!exercise) continue;
    const cat = exercise.lessonCategory;
    let review = catReview.get(cat);
    if (!review) {
      review = { overdue: 0, unstable: 0 };
      catReview.set(cat, review);
    }
    if (entry.reason === "overdue") review.overdue++;
    if (entry.masteryState === "unstable") review.unstable++;
  }

  // Build category patterns
  const categoryPatterns: MistakePatternEntry[] = [];
  for (const [cat, stats] of catStats) {
    if (stats.total === 0) continue;

    const trendBucket = trendProfile.byCategory[cat];
    const lifetimeMissRate = trendBucket?.lifetimeMissRate ?? 0;
    const recentMissRate = trendBucket && trendBucket.recentSeen > 0
      ? trendBucket.recentMissRate
      : null;
    const trendDirection: TrendDirection = trendBucket?.trendDirection ?? "insufficient_data";

    const review = catReview.get(cat);
    const overdueCount = review?.overdue ?? 0;
    const unstableCount = review?.unstable ?? 0;

    const severity = classifySeverity(lifetimeMissRate, trendDirection);
    const avgEvalLossCp = stats.evalLossCount > 0
      ? Math.round(stats.evalLossSum / stats.evalLossCount)
      : null;

    const description = describePattern(
      cat, severity, lifetimeMissRate, trendDirection, overdueCount
    );

    categoryPatterns.push({
      category: cat as LessonCategory,
      severity,
      lifetimeMissRate,
      recentMissRate,
      trendDirection,
      avgEvalLossCp,
      exerciseCount: stats.total,
      incorrectCount: stats.incorrect,
      overdueCount,
      unstableCount,
      description,
    });
  }

  // Sort by severity (critical first) then miss rate desc
  categoryPatterns.sort((a, b) => {
    const sevDiff = SEVERITY_ORDINAL[b.severity] - SEVERITY_ORDINAL[a.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.lifetimeMissRate - a.lifetimeMissRate;
  });

  // Build difficulty patterns
  const diffPatterns: DifficultyPattern[] = [];
  for (const diff of DIFFICULTY_ORDER) {
    const trendBucket = trendProfile.byDifficulty[diff];
    if (!trendBucket) continue;

    // Count exercises and incorrect at this difficulty
    let exerciseCount = 0;
    let incorrectCount = 0;
    for (const entry of Object.values(store.exercises)) {
      if (entry.difficultyEstimate === diff) {
        exerciseCount++;
        incorrectCount += entry.timesIncorrect;
      }
    }

    diffPatterns.push({
      difficulty: diff,
      lifetimeMissRate: trendBucket.lifetimeMissRate,
      recentMissRate: trendBucket.recentSeen > 0 ? trendBucket.recentMissRate : null,
      trendDirection: trendBucket.trendDirection,
      exerciseCount,
      incorrectCount,
    });
  }

  // Build blunder profile
  let totalBlunders = 0;
  let totalMistakes = 0;
  let blunderEvalSum = 0;
  let blunderEvalCount = 0;
  const blunderCatCounts = new Map<string, number>();

  for (const entry of Object.values(store.exercises)) {
    if (entry.lastGradingTier === "blunder") {
      totalBlunders++;
      if (entry.averageEvalLossCp !== null) {
        blunderEvalSum += entry.averageEvalLossCp;
        blunderEvalCount++;
      }
      blunderCatCounts.set(
        entry.lessonCategory,
        (blunderCatCounts.get(entry.lessonCategory) ?? 0) + 1
      );
    }
    if (entry.lastGradingTier === "mistake") {
      totalMistakes++;
      if (entry.averageEvalLossCp !== null) {
        blunderEvalSum += entry.averageEvalLossCp;
        blunderEvalCount++;
      }
      blunderCatCounts.set(
        entry.lessonCategory,
        (blunderCatCounts.get(entry.lessonCategory) ?? 0) + 1
      );
    }
  }

  const worstCategories = [...blunderCatCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  const blunderProfile: BlunderProfile = {
    totalBlunders,
    totalMistakes,
    worstCategories,
    avgEvalLossCp: blunderEvalCount > 0
      ? Math.round(blunderEvalSum / blunderEvalCount)
      : null,
  };

  // Recurring weaknesses: categories that are both high miss rate AND worsening
  const weakCategories = new Set(
    categoryPatterns
      .filter((p) => p.lifetimeMissRate >= 0.25)
      .map((p) => p.category)
  );
  const worseningCategories = new Set(
    categoryPatterns
      .filter((p) => p.trendDirection === "worsening")
      .map((p) => p.category)
  );
  const recurringWeaknesses = [...weakCategories].filter((c) =>
    worseningCategories.has(c)
  );

  return {
    generatedAt: now,
    categoryPatterns,
    difficultyPatterns: diffPatterns,
    blunderProfile,
    recurringWeaknesses,
  };
}
