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
import type { ConceptStateReport } from "../concepts/types.js";
import type { OpeningReport } from "../openings/types.js";
import type {
  RepertoireDrillQueueReport,
  RepertoireRepairOutcomesReport,
  RepertoireRepairQueueReport,
  RepertoireReviewReport,
  RepertoireTransferCoachingReport,
} from "../repertoire/types.js";
import type {
  StudyPlan,
  StudyPlanFocus,
  StudyPlanReviewFocus,
  ExerciseComposition,
} from "./types.js";
import type { LessonCategory } from "../exercises/types.js";

const DEFAULT_SESSION_SIZE = 10;
const MAX_REVIEW_SLOTS = 3;

export function buildStudyPlan(
  focusRecommendations: FocusRecommendation[],
  reviewReport: ReviewReport,
  trendProfile: TrendProfile,
  store: ProgressStore,
  conceptState?: ConceptStateReport,
  openingReport?: OpeningReport,
  repertoireReview?: RepertoireReviewReport,
  repertoireTransferCoaching?: RepertoireTransferCoachingReport,
  repertoireDrillQueue?: RepertoireDrillQueueReport,
  repertoireRepairQueue?: RepertoireRepairQueueReport,
  repertoireRepairOutcomes?: RepertoireRepairOutcomesReport
): StudyPlan {
  const now = new Date().toISOString();
  const totalAvailable = Object.keys(store.exercises).length;
  const suggestedSessionSize = Math.min(DEFAULT_SESSION_SIZE, totalAvailable);

  const primary = focusRecommendations[0];
  const primaryFocus: StudyPlanFocus = primary
    ? {
        category: primary.category,
        difficulty: primary.difficulty,
        reason: primary.reason,
        exerciseCount: 0,
      }
    : {
        category: "calculation_error" as LessonCategory,
        difficulty: null,
        reason: "Default focus - no recommendations available",
        exerciseCount: 0,
      };

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

  const hardBucket = trendProfile.byDifficulty["hard"];
  const easyBucket = trendProfile.byDifficulty["easy"];
  const hardMissRate = hardBucket?.lifetimeMissRate ?? 0;
  const easyMissRate = easyBucket?.lifetimeMissRate ?? 0;

  let targetDifficultyMix: { easy: number; medium: number; hard: number };
  let difficultyReason: string;
  if (hardMissRate > 0.5) {
    targetDifficultyMix = { easy: 4, medium: 4, hard: 2 };
    difficultyReason = "hard exercises have >50% miss rate - shifting to easier mix";
  } else if (easyMissRate < 0.15 && hardMissRate < 0.3) {
    targetDifficultyMix = { easy: 2, medium: 4, hard: 4 };
    difficultyReason = "easy and hard miss rates are low - pushing harder";
  } else {
    targetDifficultyMix = { easy: 3, medium: 4, hard: 3 };
    difficultyReason = "balanced difficulty mix";
  }

  const composition: ExerciseComposition[] = [];
  let remaining = suggestedSessionSize;

  const reviewSlots = reviewFocus ? Math.min(MAX_REVIEW_SLOTS, urgentCount, remaining) : 0;
  if (reviewSlots > 0) {
    composition.push({
      source: "review",
      count: reviewSlots,
      description: `${reviewSlots} overdue review exercise${reviewSlots === 1 ? "" : "s"}`,
    });
    remaining -= reviewSlots;
  }

  const primarySlots = secondaryFocus ? Math.ceil(remaining * 0.6) : remaining;
  if (primarySlots > 0) {
    primaryFocus.exerciseCount = primarySlots;
    composition.push({
      source: "weakness",
      count: primarySlots,
      description: `${primarySlots} ${primaryFocus.category} exercise${primarySlots === 1 ? "" : "s"} (primary focus)`,
    });
    remaining -= primarySlots;
  }

  if (secondaryFocus && remaining > 0) {
    secondaryFocus.exerciseCount = remaining;
    composition.push({
      source: "new",
      count: remaining,
      description: `${remaining} ${secondaryFocus.category} exercise${remaining === 1 ? "" : "s"} (secondary focus)`,
    });
  }

  const conceptFocuses = (conceptState?.recommendedFocuses ?? []).slice(0, 3).map((focus) => {
    const node = conceptState?.entries.find((entry) => entry.conceptKey === focus.conceptKey);
    return {
      conceptKey: focus.conceptKey,
      conceptName: focus.conceptName,
      conceptCategory: node?.conceptCategory ?? "meta",
      reviewPriority: focus.reviewPriority,
      explanation: focus.explanation,
      prerequisiteGaps: focus.prerequisiteGaps,
      reinforcementPath: focus.reinforcementPath,
    };
  });

  const rationaleParts: string[] = [];
  rationaleParts.push(`Recommended session of ${suggestedSessionSize} exercises.`);
  if (reviewSlots > 0) {
    rationaleParts.push(`Includes ${reviewSlots} overdue review${reviewSlots === 1 ? "" : "s"}.`);
  }
  rationaleParts.push(`Primary focus: ${primaryFocus.category}${primaryFocus.difficulty ? ` (${primaryFocus.difficulty})` : ""}.`);
  if (secondaryFocus) {
    rationaleParts.push(`Secondary focus: ${secondaryFocus.category}.`);
  }
  rationaleParts.push(`Difficulty: ${difficultyReason}.`);
  if (conceptFocuses.length > 0) {
    rationaleParts.push(`Concept repair should center on ${conceptFocuses.map((entry) => entry.conceptName).join(", ")}.`);
  }
  if ((openingReport?.recommendedTrainingThemes.length ?? 0) > 0) {
    rationaleParts.push(`Opening work should reinforce ${openingReport!.recommendedTrainingThemes.slice(0, 3).join(", ")}.`);
  }
  if ((repertoireReview?.topLinesToReview.length ?? 0) > 0) {
    rationaleParts.push(`Repertoire review should start with ${repertoireReview!.topLinesToReview.slice(0, 2).map((entry) => entry.lineName).join(", ")}.`);
  }
  if ((repertoireTransferCoaching?.fragileLines.length ?? 0) > 0) {
    rationaleParts.push(`Transfer repair should focus on ${repertoireTransferCoaching!.fragileLines.slice(0, 2).map((entry) => entry.lineName).join(", ")}.`);
  }
  if ((repertoireDrillQueue?.nextLinesToReview.length ?? 0) > 0) {
    rationaleParts.push(`Drill queue should start with ${repertoireDrillQueue!.nextLinesToReview.slice(0, 2).map((entry) => entry.lineName).join(", ")}.`);
  }
  if ((repertoireRepairQueue?.topRepairLines.length ?? 0) > 0) {
    rationaleParts.push(`Immediate repair should start with ${repertoireRepairQueue!.topRepairLines.slice(0, 2).map((entry) => entry.lineName).join(", ")}.`);
  }
  if ((repertoireRepairOutcomes?.nextActions.length ?? 0) > 0) {
    rationaleParts.push(`Repair outcomes now point to ${repertoireRepairOutcomes!.nextActions.slice(0, 2).map((entry) => entry.lineName).join(", ")}.`);
  }

  return {
    generatedAt: now,
    primaryFocus,
    secondaryFocus,
    reviewFocus,
    targetDifficultyMix,
    suggestedSessionSize,
    exerciseComposition: composition,
    conceptFocuses,
    openingFocuses: openingReport?.recommendedTrainingThemes.slice(0, 3) ?? [],
    repertoireFocuses: repertoireReview?.topLinesToReview.slice(0, 3).map((entry) => ({
      repertoireKey: entry.repertoireKey,
      lineId: entry.lineId,
      lineName: entry.lineName,
      recommendedAction: entry.recommendedAction,
      reviewPriority: entry.reviewPriority,
    })) ?? [],
    repertoireTransferFocuses: repertoireTransferCoaching?.fragileLines.slice(0, 3).map((entry) => ({
      repertoireKey: entry.repertoireKey,
      lineId: entry.lineId,
      lineName: entry.lineName,
      transferFailureType: entry.transferFailureType,
      recommendedReviewLine: entry.recommendedReviewLine,
      urgency: entry.urgency,
    })) ?? [],
    repertoireDrillFocuses: repertoireDrillQueue?.entries.slice(0, 3).map((entry) => ({
      lineId: entry.lineId,
      lineName: entry.lineName,
      urgency: entry.urgency,
      nextRecommendedReviewAt: entry.nextRecommendedReviewAt,
      recommendedAction: entry.recommendedAction,
    })) ?? [],
    repertoireRepairFocuses: repertoireRepairQueue?.entries.slice(0, 3).map((entry) => ({
      sourceGameId: entry.sourceGameId,
      lineId: entry.lineId,
      lineName: entry.lineName,
      repairType: entry.repairType,
      urgency: entry.urgencyScore,
      scheduledDrillReason: entry.scheduledDrillReason,
    })) ?? [],
    repertoireRepairOutcomeFocuses: repertoireRepairOutcomes?.nextActions.slice(0, 3).map((entry) => ({
      repairId: entry.repairId,
      lineId: entry.lineId,
      lineName: entry.lineName,
      outcomeVerdict: entry.outcomeVerdict,
      urgency: entry.urgency,
      nextAction: entry.nextAction,
    })) ?? [],
    rationale: rationaleParts.join(" "),
  };
}
