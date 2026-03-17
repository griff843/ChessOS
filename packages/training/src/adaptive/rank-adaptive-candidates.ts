/**
 * Adaptive candidate ranking for session generation.
 *
 * Replaces the basic prioritizeByProgress() when adaptive mode is enabled.
 *
 * Priority order:
 *   1. due_for_review -> sorted by targetPriority descending (unchanged)
 *   2. All others     -> sorted by progress tier, then adaptiveScore descending
 *
 * adaptiveScore = targetPriority * combinedWeight + unstableBoost + recurrenceBoost + learningBoost + repairTargetBoost
 *
 * combinedWeight = (categoryWeight + difficultyWeight) / 2
 *   - categoryWeight   = profile.byCategory[lessonCategory].adaptiveWeight  (default 1.0)
 *   - difficultyWeight = profile.byDifficulty[difficultyEstimate].adaptiveWeight (default 1.0)
 *
 * recurrenceBoost (when patternIntelligence provided):
 *   = recurrenceScore * 0.5
 *   Boosts exercises from recurring-weakness categories by up to 0.5.
 *
 * This boosts exercises from weak categories/difficulties by up to 2x while
 * preserving the overall progress-tier ordering. Due exercises remain
 * unconditionally first. Difficulty balance and category cap are enforced
 * downstream by selectSessionExercises().
 */

import type { TrainingExercise } from "../exercises/types";
import type { ProgressStore, ExerciseStatus } from "../progress/types";
import type { AdaptiveWeights } from "./types";
import type { PatternIntelligence } from "../strategic/types";
import type { ReviewSessionRequest } from "../repair/types";
import { computeRepairTargetBoost } from "../repair/repair-target-matching";

/**
 * Map exercise status to a selection tier.
 * Lower = higher priority.
 */
function getProgressTier(status: ExerciseStatus | undefined): number {
  switch (status) {
    case "due_for_review":
      return 0;
    case "unseen":
      return 1;
    case "seen":
      return 2;
    case "incorrect":
      return 3;
    case "correct":
      return 4;
    default:
      return 1;
  }
}

/**
 * Compute the combined adaptive weight for an exercise.
 *
 * @param exercise  The exercise to weight
 * @param weights   Extracted adaptive weights from the profile
 * @returns Combined weight in [1.0, 2.0]
 */
function getCombinedWeight(
  exercise: TrainingExercise,
  weights: AdaptiveWeights
): number {
  const catWeight =
    weights.categoryWeights[exercise.explanation.lessonCategory] ?? 1.0;
  const diffWeight =
    weights.difficultyWeights[exercise.explanation.difficultyEstimate] ?? 1.0;
  return (catWeight + diffWeight) / 2;
}

/**
 * Rank exercises using adaptive weights from the weakness profile.
 *
 * Due exercises are ranked first by targetPriority.
 * All others are ranked by progress tier, then by adaptiveScore
 * (targetPriority * combinedWeight + boosts) descending.
 *
 * @param exercises            Full exercise corpus
 * @param store                Current progress store
 * @param weights              Adaptive weights extracted from the weakness profile
 * @param patternIntelligence  Optional pattern intelligence for recurrence boost
 * @param learningPriority     Optional learning-model boost keyed by positionId
 * @param reviewRequest        Optional review session request for repair-target boost
 * @returns Exercises re-ordered for adaptive session selection
 */
export function rankAdaptiveCandidates(
  exercises: TrainingExercise[],
  store: ProgressStore,
  weights: AdaptiveWeights,
  patternIntelligence?: PatternIntelligence,
  learningPriority?: Map<string, number>,
  reviewRequest?: ReviewSessionRequest | null
): TrainingExercise[] {
  let recurrenceMap: Map<string, number> | undefined;
  if (patternIntelligence) {
    recurrenceMap = new Map(
      patternIntelligence.recurrenceEntries.map((entry) => [
        entry.category,
        entry.recurrenceScore,
      ])
    );
  }

  return [...exercises].sort((a, b) => {
    const progressA = store.exercises[a.positionId];
    const progressB = store.exercises[b.positionId];

    const tierA = getProgressTier(progressA?.status);
    const tierB = getProgressTier(progressB?.status);

    if (tierA !== tierB) return tierA - tierB;

    if (tierA === 0) {
      const urgencyA = progressA?.reviewUrgency ?? 0;
      const urgencyB = progressB?.reviewUrgency ?? 0;
      if (urgencyA !== urgencyB) return urgencyB - urgencyA;
      return b.targetPriority - a.targetPriority;
    }

    const unstableBoostA = progressA?.masteryState === "unstable" ? 0.3 : 0;
    const unstableBoostB = progressB?.masteryState === "unstable" ? 0.3 : 0;

    const recurrenceBoostA = recurrenceMap
      ? (recurrenceMap.get(a.explanation.lessonCategory) ?? 0) * 0.5
      : 0;
    const recurrenceBoostB = recurrenceMap
      ? (recurrenceMap.get(b.explanation.lessonCategory) ?? 0) * 0.5
      : 0;

    const learningBoostA = learningPriority?.get(a.positionId) ?? 0;
    const learningBoostB = learningPriority?.get(b.positionId) ?? 0;

    const repairBoostA = computeRepairTargetBoost(
      { lessonCategory: a.explanation.lessonCategory, phase: a.phase },
      reviewRequest
    );
    const repairBoostB = computeRepairTargetBoost(
      { lessonCategory: b.explanation.lessonCategory, phase: b.phase },
      reviewRequest
    );

    const scoreA =
      a.targetPriority * getCombinedWeight(a, weights) +
      unstableBoostA +
      recurrenceBoostA +
      learningBoostA +
      repairBoostA;
    const scoreB =
      b.targetPriority * getCombinedWeight(b, weights) +
      unstableBoostB +
      recurrenceBoostB +
      learningBoostB +
      repairBoostB;

    return scoreB - scoreA;
  });
}
