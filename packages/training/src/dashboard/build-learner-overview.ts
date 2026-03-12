/**
 * Build the learner overview dashboard artifact.
 *
 * Pure function: assembles from progress store, trend profile,
 * review queue, session snapshots, and focus recommendations.
 */

import type { ProgressStore } from "../progress/types.js";
import type { TrendProfile } from "../trends/types.js";
import type { ReviewQueue } from "../mastery/build-review-queue.js";
import type { MasteryState } from "../mastery/derive-mastery-state.js";
import type {
  LearnerOverview,
  SessionSnapshot,
  FocusRecommendation,
  WeaknessHighlight,
  ReviewLoad,
  TrendSummary,
} from "./types.js";

const DEFAULT_RECENT_SESSION_COUNT = 5;

/**
 * Build the learner overview from all available data sources.
 */
export function buildLearnerOverview(
  store: ProgressStore,
  trendProfile: TrendProfile,
  reviewQueue: ReviewQueue,
  sessionSnapshots: SessionSnapshot[],
  focusRecommendations: FocusRecommendation[],
  recentSessionCount: number = DEFAULT_RECENT_SESSION_COUNT
): LearnerOverview {
  const now = new Date().toISOString();

  // Progress summary from store
  let totalSeen = 0;
  let totalUnseen = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;
  const masteryDist: Record<MasteryState, number> = {
    unseen: 0,
    learning: 0,
    unstable: 0,
    improving: 0,
    mastered: 0,
  };

  for (const entry of Object.values(store.exercises)) {
    if (entry.status === "unseen") {
      totalUnseen++;
    } else {
      totalSeen++;
    }
    totalCorrect += entry.timesCorrect;
    totalIncorrect += entry.timesIncorrect;
    const state: MasteryState = entry.masteryState ?? "unseen";
    masteryDist[state]++;
  }

  const totalAttempted = totalCorrect + totalIncorrect;
  const lifetimeAccuracy = totalAttempted > 0 ? totalCorrect / totalAttempted : 0;

  // Recent accuracy from last N sessions
  const recentSessions = sessionSnapshots.slice(-recentSessionCount);
  let recentAccuracy: number | null = null;
  if (recentSessions.length > 0) {
    const recentCorrect = recentSessions.reduce((s, ss) => s + ss.correctCount, 0);
    const recentTotal = recentSessions.reduce((s, ss) => s + ss.exerciseCount, 0);
    recentAccuracy = recentTotal > 0 ? recentCorrect / recentTotal : 0;
  }

  // Review load from review queue
  const reviewLoad: ReviewLoad = { overdueCount: 0, dueSoonCount: 0, unstableCount: 0, totalReviewable: 0 };
  for (const entry of reviewQueue.entries) {
    reviewLoad.totalReviewable++;
    if (entry.reason === "overdue") reviewLoad.overdueCount++;
    else if (entry.reason === "due_soon") reviewLoad.dueSoonCount++;
    else if (entry.reason === "unstable") reviewLoad.unstableCount++;
  }

  // Top weak categories from trend profile
  const topWeakCategories: WeaknessHighlight[] = Object.entries(trendProfile.byCategory)
    .filter(([, b]) => b.lifetimeSeen > 0)
    .map(([key, b]) => ({
      key,
      accuracy: b.lifetimeAccuracy,
      missRate: b.lifetimeMissRate,
      dueCount: b.dueCount,
      trendDirection: b.trendDirection,
    }))
    .sort((a, b) => b.missRate - a.missRate)
    .slice(0, 3);

  // Top weak difficulties
  const topWeakDifficulties: WeaknessHighlight[] = Object.entries(trendProfile.byDifficulty)
    .filter(([, b]) => b.lifetimeSeen > 0)
    .map(([key, b]) => ({
      key,
      accuracy: b.lifetimeAccuracy,
      missRate: b.lifetimeMissRate,
      dueCount: b.dueCount,
      trendDirection: b.trendDirection,
    }))
    .sort((a, b) => b.missRate - a.missRate)
    .slice(0, 3);

  // Trend summary
  const trendSummary: TrendSummary = {
    improvingCategories: [],
    worseningCategories: [],
    stableCategories: [],
    insufficientDataCategories: [],
  };
  for (const [key, b] of Object.entries(trendProfile.byCategory)) {
    switch (b.trendDirection) {
      case "improving":
        trendSummary.improvingCategories.push(key);
        break;
      case "worsening":
        trendSummary.worseningCategories.push(key);
        break;
      case "stable":
        trendSummary.stableCategories.push(key);
        break;
      case "insufficient_data":
        trendSummary.insufficientDataCategories.push(key);
        break;
    }
  }

  return {
    generatedAt: now,
    totalExercises: store.totalExercises,
    totalSeen,
    totalUnseen,
    totalCorrect,
    totalIncorrect,
    lifetimeAccuracy,
    recentSessionCount: recentSessions.length,
    recentAccuracy,
    masteryDistribution: masteryDist,
    reviewLoad,
    topWeakCategories,
    topWeakDifficulties,
    trendSummary,
    recentSessions,
    focusRecommendations,
  };
}
