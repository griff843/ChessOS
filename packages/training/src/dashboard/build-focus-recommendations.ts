/**
 * Build deterministic focus recommendations for next study session.
 *
 * Pure function: combines weakness, trend, review, and mastery data
 * to produce ranked next-study recommendations per lesson category.
 */

import type { ProgressStore } from "../progress/types.js";
import type { TrendProfile } from "../trends/types.js";
import type { ReviewQueue } from "../mastery/build-review-queue.js";
import type { LessonCategory } from "../exercises/types.js";
import type { DifficultyEstimate } from "../exercises/types.js";
import type { FocusRecommendation, FocusFactors } from "./types.js";
import { FOCUS_CONFIG } from "./types.js";

/**
 * Build focus recommendations from learner data.
 *
 * Computes a composite focusScore per lesson category and returns
 * the top N (default 5) recommendations sorted by score descending.
 */
export function buildFocusRecommendations(
  store: ProgressStore,
  trendProfile: TrendProfile,
  reviewQueue: ReviewQueue,
  config: typeof FOCUS_CONFIG = FOCUS_CONFIG
): FocusRecommendation[] {
  // Gather per-category exercise counts and mastery states
  const categoryStats = new Map<
    string,
    {
      total: number;
      unseen: number;
      learning: number;
      overdue: number;
      unstable: number;
    }
  >();

  for (const entry of Object.values(store.exercises)) {
    const cat = entry.lessonCategory;
    let stats = categoryStats.get(cat);
    if (!stats) {
      stats = { total: 0, unseen: 0, learning: 0, overdue: 0, unstable: 0 };
      categoryStats.set(cat, stats);
    }
    stats.total++;
    if (entry.masteryState === "unseen") stats.unseen++;
    if (entry.masteryState === "learning") stats.learning++;
    if (entry.masteryState === "unstable") stats.unstable++;
  }

  // Count overdue/unstable per category from review queue
  const totalReviewable = Math.max(reviewQueue.totalEntries, 1);
  for (const entry of reviewQueue.entries) {
    const exercise = store.exercises[entry.exerciseId];
    if (!exercise) continue;
    const cat = exercise.lessonCategory;
    const stats = categoryStats.get(cat);
    if (!stats) continue;
    if (entry.reason === "overdue") stats.overdue++;
  }

  // Build per-category miss rate from trend profile for difficulty cross-reference
  const categoryDifficultyMissRates = new Map<string, Map<string, number>>();
  for (const entry of Object.values(store.exercises)) {
    const cat = entry.lessonCategory;
    const diff = entry.difficultyEstimate;
    if (entry.timesCorrect + entry.timesIncorrect === 0) continue;
    if (!categoryDifficultyMissRates.has(cat)) {
      categoryDifficultyMissRates.set(cat, new Map());
    }
    const diffMap = categoryDifficultyMissRates.get(cat)!;
    const key = diff;
    if (!diffMap.has(key)) diffMap.set(key, 0);
    // We track total and incorrect separately below
  }

  // More precise: compute per category×difficulty miss rates
  const catDiffBuckets = new Map<
    string,
    Map<string, { total: number; incorrect: number }>
  >();
  for (const entry of Object.values(store.exercises)) {
    const cat = entry.lessonCategory;
    const diff = entry.difficultyEstimate;
    const attempted = entry.timesCorrect + entry.timesIncorrect;
    if (attempted === 0) continue;
    if (!catDiffBuckets.has(cat)) catDiffBuckets.set(cat, new Map());
    const diffMap = catDiffBuckets.get(cat)!;
    if (!diffMap.has(diff)) diffMap.set(diff, { total: 0, incorrect: 0 });
    const bucket = diffMap.get(diff)!;
    bucket.total += attempted;
    bucket.incorrect += entry.timesIncorrect;
  }

  // Score each category
  const candidates: Array<{
    category: LessonCategory;
    focusScore: number;
    factors: FocusFactors;
    difficulty: DifficultyEstimate | null;
    reason: string;
  }> = [];

  for (const [cat, stats] of categoryStats) {
    if (stats.total === 0) continue;

    // 1. Weakness weight from trend profile
    const trendBucket = trendProfile.byCategory[cat];
    const weaknessWeight = trendBucket
      ? trendBucket.lifetimeMissRate
      : 0.5;

    // 2. Trend penalty
    const direction = trendBucket?.trendDirection ?? "insufficient_data";
    const trendPenalty = config.trendPenalties[direction];

    // 3. Review pressure
    const reviewPressure = Math.min(
      (stats.overdue + stats.unstable) / totalReviewable,
      1.0
    );

    // 4. Mastery gap
    const masteryGap = Math.min(
      (stats.unseen + stats.learning) / Math.max(stats.total, 1),
      1.0
    );

    // Composite score
    const focusScore =
      weaknessWeight * config.weights.weakness +
      trendPenalty * config.weights.trend +
      reviewPressure * config.weights.review +
      masteryGap * config.weights.masteryGap;

    const factors: FocusFactors = {
      weaknessWeight,
      trendPenalty,
      reviewPressure,
      masteryGap,
    };

    // Difficulty selection: find if any band is notably worse
    let difficulty: DifficultyEstimate | null = null;
    const diffBuckets = catDiffBuckets.get(cat);
    if (diffBuckets) {
      // Compute category-level miss rate
      let catTotal = 0;
      let catIncorrect = 0;
      for (const b of diffBuckets.values()) {
        catTotal += b.total;
        catIncorrect += b.incorrect;
      }
      const catMissRate = catTotal > 0 ? catIncorrect / catTotal : 0;

      // Find any difficulty with missRate >= 0.20 above average
      let worstDiffMissRate = 0;
      for (const [diff, b] of diffBuckets) {
        const diffMissRate = b.total > 0 ? b.incorrect / b.total : 0;
        if (diffMissRate >= catMissRate + 0.20 && diffMissRate > worstDiffMissRate) {
          worstDiffMissRate = diffMissRate;
          difficulty = diff as DifficultyEstimate;
        }
      }
    }

    // Reason string from dominant factor
    const factorContributions = [
      { name: "weakness", value: weaknessWeight * config.weights.weakness, label: "" },
      { name: "trend", value: trendPenalty * config.weights.trend, label: "" },
      { name: "review", value: reviewPressure * config.weights.review, label: "" },
      { name: "mastery", value: masteryGap * config.weights.masteryGap, label: "" },
    ];
    factorContributions.sort((a, b) => b.value - a.value);
    const dominant = factorContributions[0].name;

    let reason: string;
    if (dominant === "weakness") {
      reason = `High miss rate in ${cat} (${(weaknessWeight * 100).toFixed(0)}%)`;
    } else if (dominant === "trend") {
      reason = `Worsening trend in ${cat}`;
    } else if (dominant === "review") {
      reason = `${stats.overdue + stats.unstable} exercises need review in ${cat}`;
    } else {
      reason = `${stats.unseen + stats.learning} unmastered exercises in ${cat}`;
    }

    candidates.push({
      category: cat as LessonCategory,
      focusScore,
      factors,
      difficulty,
      reason,
    });
  }

  // Sort by focusScore descending, take top N
  candidates.sort((a, b) => b.focusScore - a.focusScore);
  const top = candidates.slice(0, config.maxRecommendations);

  return top.map((c, i) => ({
    rank: i + 1,
    category: c.category,
    difficulty: c.difficulty,
    reason: c.reason,
    focusScore: c.focusScore,
    factors: c.factors,
  }));
}
