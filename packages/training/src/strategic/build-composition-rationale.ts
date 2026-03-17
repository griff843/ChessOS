/**
 * Composition rationale: explain why each exercise was included in a session.
 *
 * Pure function - no I/O, deterministic.
 */

import type { ProgressStore } from "../progress/types.js";
import type { ReviewQueue } from "../mastery/build-review-queue.js";
import type { DifficultyPolicy } from "../trends/types.js";
import type {
  PatternIntelligence,
  ReadinessForecast,
  CompositionRationale,
  CompositionSlot,
} from "./types.js";
import type {
  ObjectiveCoachingState,
  ObjectiveProgressState,
  ObjectiveSelectionResult,
} from "../objectives/types.js";

/**
 * Classify each session exercise by source and generate an explanation.
 */
export function buildCompositionRationale(
  sessionId: string,
  sessionExercises: Array<{ exerciseId: string }>,
  store: ProgressStore,
  patternIntelligence: PatternIntelligence,
  readiness: ReadinessForecast,
  policy: DifficultyPolicy,
  reviewQueue: ReviewQueue,
  objective?: ObjectiveSelectionResult,
  progress?: ObjectiveProgressState,
  coaching?: ObjectiveCoachingState
): CompositionRationale {
  const recurringSet = new Set(patternIntelligence.recurringWeaknesses);
  const dueSet = new Set(
    reviewQueue.entries
      .filter((e) => e.reason === "overdue" || e.reason === "due_soon")
      .map((e) => e.exerciseId)
  );

  const slots: CompositionSlot[] = sessionExercises.map((ex) => {
    const progressEntry = store.exercises[ex.exerciseId];
    const category = progressEntry?.lessonCategory ?? "unknown";
    const difficulty = progressEntry?.difficultyEstimate ?? "medium";
    const isDue = dueSet.has(ex.exerciseId);
    const isWeakness = recurringSet.has(category);
    const isStretch = difficulty === "hard" && readiness.state === "ready_to_expand";

    if (isDue) {
      return {
        exerciseId: ex.exerciseId,
        source: "review" as const,
        reason: `Due for review (${category})`,
      };
    }
    if (isWeakness) {
      return {
        exerciseId: ex.exerciseId,
        source: "weakness" as const,
        reason: `Recurring weakness in ${category}`,
      };
    }
    if (isStretch) {
      return {
        exerciseId: ex.exerciseId,
        source: "stretch" as const,
        reason: `Stretch exercise (hard ${category})`,
      };
    }
    return {
      exerciseId: ex.exerciseId,
      source: "fresh" as const,
      reason:
        progressEntry?.status === "unseen"
          ? `Fresh exercise (${category})`
          : `Targeted practice (${category})`,
    };
  });

  const reviewCount = slots.filter((s) => s.source === "review").length;
  const weaknessCount = slots.filter((s) => s.source === "weakness").length;
  const stretchCount = slots.filter((s) => s.source === "stretch").length;
  const freshCount = slots.filter((s) => s.source === "fresh").length;

  const overdueCount = reviewQueue.entries.filter((e) => e.reason === "overdue").length;
  const dueSoonCount = reviewQueue.entries.filter((e) => e.reason === "due_soon").length;
  const unstableCount = reviewQueue.entries.filter((e) => e.reason === "unstable").length;

  const parts: string[] = [];
  parts.push(`Readiness: ${readiness.state}.`);
  parts.push(`Difficulty policy: ${policy.reason}.`);
  if (objective) {
    parts.push(`Objective: ${objective.currentObjective} (${objective.objectivePhase}).`);
  }
  if (progress) {
    parts.push(`Lifecycle: ${progress.lifecycleDecision} with verdict ${progress.progressVerdict}.`);
  }
  if (coaching) {
    parts.push(`Intervention: ${coaching.interventionType} (${coaching.recommendationStrength}).`);
  }
  if (reviewCount > 0) parts.push(`${reviewCount} review exercise${reviewCount > 1 ? "s" : ""}.`);
  if (weaknessCount > 0) {
    parts.push(`${weaknessCount} targeting recurring weakness${weaknessCount > 1 ? "es" : ""}.`);
  }
  if (stretchCount > 0) parts.push(`${stretchCount} stretch.`);
  if (freshCount > 0) parts.push(`${freshCount} fresh.`);

  return {
    generatedAt: new Date().toISOString(),
    sessionId,
    readinessState: readiness.state,
    policyReason: policy.reason,
    difficultyMix: { ...policy.adjusted },
    slots,
    topRecurringWeaknesses: patternIntelligence.recurringWeaknesses.slice(0, 3),
    reviewBurden: { overdueCount, dueSoonCount, unstableCount },
    trainingObjective: objective?.currentObjective,
    objectiveReason: objective?.objectiveReason,
    objectivePhase: objective?.objectivePhase,
    successSignals: objective?.successSignals,
    objectiveExerciseMixRationale: objective?.objectiveExerciseMixRationale,
    objectiveStatus: progress?.objectiveStatus,
    objectiveProgressVerdict: progress?.progressVerdict,
    objectiveDecision: progress?.lifecycleDecision,
    objectiveDecisionReason: progress?.objectiveDecisionReason,
    objectiveInterventionType: coaching?.interventionType,
    objectiveRecommendationStrength: coaching?.recommendationStrength,
    objectiveNextSessionAdjustmentSummary: coaching?.nextSessionAdjustmentSummary,
    explanation: parts.join(" "),
  };
}
