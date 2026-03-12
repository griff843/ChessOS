/**
 * Build a deterministic study plan from learner state.
 *
 * Pure function: produces a prescribed next-session plan
 * from focus recommendations, review report, trend profile,
 * and progress store. No I/O.
 */

import type { ProgressStore } from "../progress/types.js";
import type { TrendProfile } from "../trends/types.js";
import type { FocusRecommendation, ReviewReport } from "../dashboard/types.js";
import type {
  StudyPlan,
  StudyPlanFocus,
  StudyPlanReviewFocus,
  ExerciseComposition,
} from "./types.js";
import type { LessonCategory, DifficultyEstimate } from "../exercises/types.js";

const DEFAULT_SESSION_SIZE = 10;
const MAX_REVIEW_SLOTS = 3;

/**
 * Build a study plan from current learner state.
 */
export function buildStudyPlan(
  focusRecommendations: FocusRecommendation[],
  reviewReport: ReviewReport,
  trendProfile: TrendProfile,
  store: ProgressStore
): StudyPlan {
  const now = new Date().toISOString();

  // Count available (non-unseen or unseen) exercises
  const totalAvailable = Object.keys(store.exercises).length;
  const suggestedSessionSize = Math.min(DEFAULT_SESSION_SIZE, totalAvailable);

  // Primary focus from top recommendation
  const primary = focusRecommendations[0];
  const primaryFocus: StudyPlanFocus = primary
    ? {
        category: primary.category,
        difficulty: primary.difficulty,
        reason: primary.reason,
        exerciseCount: 0, // computed below
      }
    : {
        category: "calculation_error" as LessonCategory,
        difficulty: null,
        reason: "Default focus — no recommendations available",
        exerciseCount: 0,
      };

  // Secondary focus: include if score >= 50% of primary
  let secondaryFocus: StudyPlanFocus | null = null;
  if (focusRecommendations.length >= 2 && primary) {
    const secondary = focusRecommendations[1];
    if (secondary.focusScore >= primary.focusScore * 0.5) {
      secondaryFocus = {
        category: secondary.category,
        difficulty: secondary.difficulty,
        reason: secondary.reason,
        exerciseCount: 0,
      };
    }
  }

  // Review focus
  let reviewFocus: StudyPlanReviewFocus | null = null;
  const urgentCount = reviewReport.totalOverdue;
  if (urgentCount > 0) {
    const topCategories = reviewReport.categoryUrgency
      .filter((cu) => cu.overdueCount > 0)
      .slice(0, 3)
      .map((cu) => cu.category);
    reviewFocus = {
      urgentCount,
      topCategories,
      reason: `${urgentCount} overdue exercise${urgentCount === 1 ? "" : "s"} need${urgentCount === 1 ? "s" : ""} review`,
    };
  }

  // Target difficulty mix from trend profile
  const hardBucket = trendProfile.byDifficulty["hard"];
  const easyBucket = trendProfile.byDifficulty["easy"];
  const hardMissRate = hardBucket?.lifetimeMissRate ?? 0;
  const easyMissRate = easyBucket?.lifetimeMissRate ?? 0;

  let targetDifficultyMix: { easy: number; medium: number; hard: number };
  let difficultyReason: string;
  if (hardMissRate > 0.50) {
    targetDifficultyMix = { easy: 4, medium: 4, hard: 2 };
    difficultyReason = "hard exercises have >50% miss rate — shifting to easier mix";
  } else if (easyMissRate < 0.15 && hardMissRate < 0.30) {
    targetDifficultyMix = { easy: 2, medium: 4, hard: 4 };
    difficultyReason = "easy and hard miss rates are low — pushing harder";
  } else {
    targetDifficultyMix = { easy: 3, medium: 4, hard: 3 };
    difficultyReason = "balanced difficulty mix";
  }

  // Exercise composition: allocate slots
  const composition: ExerciseComposition[] = [];
  let remaining = suggestedSessionSize;

  // Review slots (up to MAX_REVIEW_SLOTS if there are overdue items)
  const reviewSlots = reviewFocus
    ? Math.min(MAX_REVIEW_SLOTS, urgentCount, remaining)
    : 0;
  if (reviewSlots > 0) {
    composition.push({
      source: "review",
      count: reviewSlots,
      description: `${reviewSlots} overdue review exercise${reviewSlots === 1 ? "" : "s"}`,
    });
    remaining -= reviewSlots;
  }

  // Primary focus slots
  const primarySlots = secondaryFocus
    ? Math.ceil(remaining * 0.6)
    : remaining;
  if (primarySlots > 0) {
    primaryFocus.exerciseCount = primarySlots;
    composition.push({
      source: "weakness",
      count: primarySlots,
      description: `${primarySlots} ${primaryFocus.category} exercise${primarySlots === 1 ? "" : "s"} (primary focus)`,
    });
    remaining -= primarySlots;
  }

  // Secondary focus slots
  if (secondaryFocus && remaining > 0) {
    secondaryFocus.exerciseCount = remaining;
    composition.push({
      source: "new",
      count: remaining,
      description: `${remaining} ${secondaryFocus.category} exercise${remaining === 1 ? "" : "s"} (secondary focus)`,
    });
  }

  // Build rationale
  const rationaleParts: string[] = [];
  rationaleParts.push(
    `Recommended session of ${suggestedSessionSize} exercises.`
  );
  if (reviewSlots > 0) {
    rationaleParts.push(
      `Includes ${reviewSlots} overdue review${reviewSlots === 1 ? "" : "s"}.`
    );
  }
  rationaleParts.push(
    `Primary focus: ${primaryFocus.category}${primaryFocus.difficulty ? ` (${primaryFocus.difficulty})` : ""}.`
  );
  if (secondaryFocus) {
    rationaleParts.push(
      `Secondary focus: ${secondaryFocus.category}.`
    );
  }
  rationaleParts.push(`Difficulty: ${difficultyReason}.`);

  return {
    generatedAt: now,
    primaryFocus,
    secondaryFocus,
    reviewFocus,
    targetDifficultyMix,
    suggestedSessionSize,
    exerciseComposition: composition,
    rationale: rationaleParts.join(" "),
  };
}
