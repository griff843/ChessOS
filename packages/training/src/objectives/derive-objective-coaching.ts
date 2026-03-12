import type { ExerciseTypeMix } from "../cognitive/types";
import type { TrainingExercise } from "../exercises/types";
import type { ReviewQueue } from "../mastery/build-review-queue";
import type { ProgressStore } from "../progress/types";
import type {
  ObjectiveCoachingInput,
  ObjectiveCoachingSignal,
  ObjectiveCoachingState,
  ObjectiveCompareWindow,
  ObjectiveHistoryEntry,
  ObjectiveInterventionType,
  ObjectivePerformanceWindow,
  ObjectiveRecommendationStrength,
  ObjectiveSelectionResult,
} from "./types";
import { buildObjectiveBias } from "./select-training-objective";

const OBJECTIVE_COACHING_CONFIG = {
  compareWindow: 3,
  highReviewBurden: 0.35,
  mediumReviewBurden: 0.2,
  severeRateHigh: 0.25,
  severeRateMedium: 0.15,
  highEvalLossCp: 100,
  mediumEvalLossCp: 70,
  challengeAccuracy: 0.76,
} as const;

function round(value: number | null): number | null {
  if (value === null) return null;
  return Number(value.toFixed(4));
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildPerformanceWindow(entries: ObjectiveHistoryEntry[]): ObjectivePerformanceWindow {
  return {
    sessionCount: entries.length,
    averageAccuracy: round(average(entries.map((entry) => entry.accuracy))),
    exactRate: round(average(entries.map((entry) => entry.exactRate))),
    acceptableRate: round(average(entries.map((entry) => entry.acceptableRate))),
    mistakeRate: round(average(entries.map((entry) => entry.mistakeRate))),
    blunderRate: round(average(entries.map((entry) => entry.blunderRate))),
    averageEvalLossCp: round(
      average(entries.map((entry) => entry.averageEvalLossCp).filter((value): value is number => value !== null))
    ),
  };
}

function severeRate(window: ObjectivePerformanceWindow): number {
  return (window.mistakeRate ?? 0) + (window.blunderRate ?? 0);
}

function formatWindowNumber(value: number | null, multiplier = 1, suffix = ""): string {
  if (value === null) return "n/a";
  return `${(value * multiplier).toFixed(multiplier === 100 ? 1 : 2)}${suffix}`;
}

function buildCompareWindow(
  label: string,
  currentWindow: ObjectivePerformanceWindow,
  previousWindow: ObjectivePerformanceWindow
): ObjectiveCompareWindow {
  const accuracyDelta =
    currentWindow.averageAccuracy !== null && previousWindow.averageAccuracy !== null
      ? Number((currentWindow.averageAccuracy - previousWindow.averageAccuracy).toFixed(4))
      : null;
  const severeRateDelta = Number((severeRate(currentWindow) - severeRate(previousWindow)).toFixed(4));
  const evalLossDelta =
    currentWindow.averageEvalLossCp !== null && previousWindow.averageEvalLossCp !== null
      ? Number((previousWindow.averageEvalLossCp - currentWindow.averageEvalLossCp).toFixed(4))
      : null;

  return {
    label,
    currentWindow,
    previousWindow,
    deltas: {
      accuracyDelta,
      severeRateDelta,
      evalLossDelta,
    },
    summary: `${label.replace(/_/g, " ")}: accuracy ${formatWindowNumber(currentWindow.averageAccuracy, 100, "%")} vs ${formatWindowNumber(previousWindow.averageAccuracy, 100, "%")}, severe rate ${formatWindowNumber(severeRate(currentWindow), 100, "%")} vs ${formatWindowNumber(severeRate(previousWindow), 100, "%")}, eval loss ${currentWindow.averageEvalLossCp !== null ? `${currentWindow.averageEvalLossCp.toFixed(1)}cp` : "n/a"} vs ${previousWindow.averageEvalLossCp !== null ? `${previousWindow.averageEvalLossCp.toFixed(1)}cp` : "n/a"}.`,
  };
}

function relevantReviewBurden(input: ObjectiveCoachingInput): number {
  const bias = buildObjectiveBias(input.selection);
  const relevantCategories = new Set(Object.keys(bias.categoryBoosts));
  if (relevantCategories.size === 0) return 0;
  const relevant = input.selectionInput.reviewQueue.entries.filter((entry) => {
    const category = input.selectionInput.store.exercises[entry.exerciseId]?.lessonCategory;
    return category !== undefined && relevantCategories.has(category);
  });
  return relevant.length / Math.max(input.selectionInput.reviewQueue.totalEntries, 1);
}

function buildObjectiveSignals(input: ObjectiveCoachingInput): {
  failedSignals: ObjectiveCoachingSignal[];
  supportingSignals: ObjectiveCoachingSignal[];
  reviewBurden: number;
  relevantRecurringWeaknesses: string[];
} {
  const failedSignals: ObjectiveCoachingSignal[] = [];
  const supportingSignals: ObjectiveCoachingSignal[] = [];

  for (const signal of input.progress.successSignalSnapshots) {
    const entry: ObjectiveCoachingSignal = {
      key: signal.metric,
      label: signal.signal,
      metric: signal.metric,
      status: !signal.met || signal.trend === "worsening" ? "failed" : "supporting",
      currentValue: signal.currentValue,
      targetValue: signal.targetValue,
      direction: signal.direction,
      explanation: `${signal.signal} is at ${signal.currentValue.toFixed(2)} against target ${signal.targetValue.toFixed(2)} with ${signal.trend} trend.`,
    };
    if (entry.status === "failed") {
      failedSignals.push(entry);
    } else {
      supportingSignals.push(entry);
    }
  }

  for (const signal of input.selectionInput.readiness.signals) {
    const entry: ObjectiveCoachingSignal = {
      key: `readiness_${signal.name.toLowerCase().replace(/\s+/g, "_")}`,
      label: signal.name,
      metric: signal.name.toLowerCase().replace(/\s+/g, "_"),
      status: signal.passed ? "supporting" : "failed",
      currentValue: signal.value,
      targetValue: signal.threshold,
      direction: "hold",
      explanation: `${signal.name} is ${signal.value.toFixed(2)} against threshold ${signal.threshold.toFixed(2)}.`,
    };
    if (entry.status === "failed") {
      failedSignals.push(entry);
    } else {
      supportingSignals.push(entry);
    }
  }

  const reviewBurden = relevantReviewBurden(input);
  const reviewSignal: ObjectiveCoachingSignal = {
    key: "objective_review_burden",
    label: "Objective review burden",
    metric: "objective_review_burden",
    status: reviewBurden >= OBJECTIVE_COACHING_CONFIG.mediumReviewBurden ? "failed" : "supporting",
    currentValue: Number(reviewBurden.toFixed(4)),
    targetValue: OBJECTIVE_COACHING_CONFIG.mediumReviewBurden,
    direction: "decrease",
    explanation: `Objective-relevant review burden is ${(reviewBurden * 100).toFixed(1)}% of the current queue.`,
  };
  if (reviewSignal.status === "failed") {
    failedSignals.push(reviewSignal);
  } else {
    supportingSignals.push(reviewSignal);
  }

  const bias = buildObjectiveBias(input.selection);
  const relevantCategories = new Set(Object.keys(bias.categoryBoosts));
  const recurrenceEntries = input.selectionInput.patternIntelligence.recurrenceEntries.filter((entry) =>
    relevantCategories.has(entry.category)
  );
  const relevantRecurringWeaknesses = recurrenceEntries.filter((entry) => entry.isRecurring).map((entry) => entry.category);
  const recurrenceSignal: ObjectiveCoachingSignal = {
    key: "objective_recurrence_pressure",
    label: "Objective recurrence pressure",
    metric: "objective_recurrence_pressure",
    status: relevantRecurringWeaknesses.length > 0 ? "failed" : "supporting",
    currentValue: relevantRecurringWeaknesses.length,
    targetValue: 0,
    direction: "decrease",
    explanation:
      relevantRecurringWeaknesses.length > 0
        ? `Recurring weakness is still present in ${relevantRecurringWeaknesses.join(", ")}.`
        : "No recurring weakness remains in the objective's primary categories.",
  };
  if (recurrenceSignal.status === "failed") {
    failedSignals.push(recurrenceSignal);
  } else {
    supportingSignals.push(recurrenceSignal);
  }

  return { failedSignals, supportingSignals, reviewBurden, relevantRecurringWeaknesses };
}

function buildCompareWindows(input: ObjectiveCoachingInput): ObjectiveCompareWindow[] {
  const objectiveHistory = input.history.filter((entry) => entry.objective === input.progress.currentObjective);
  const compareWindows: ObjectiveCompareWindow[] = [];

  const recent = objectiveHistory.slice(-OBJECTIVE_COACHING_CONFIG.compareWindow);
  const prior = objectiveHistory.slice(-OBJECTIVE_COACHING_CONFIG.compareWindow * 2, -OBJECTIVE_COACHING_CONFIG.compareWindow);
  if (recent.length > 0 && prior.length > 0) {
    compareWindows.push(
      buildCompareWindow(
        "last_3_vs_prior_3",
        buildPerformanceWindow(recent),
        buildPerformanceWindow(prior)
      )
    );
  }

  const startWindow = objectiveHistory.slice(0, Math.min(OBJECTIVE_COACHING_CONFIG.compareWindow, objectiveHistory.length));
  if (startWindow.length > 0 && recent.length > 0 && startWindow[0].sessionId !== recent[0].sessionId) {
    compareWindows.push(
      buildCompareWindow(
        "objective_start_vs_now",
        buildPerformanceWindow(recent),
        buildPerformanceWindow(startWindow)
      )
    );
  }

  compareWindows.push(
    buildCompareWindow(
      "objective_evidence_vs_baseline",
      input.progress.evidenceWindow,
      input.progress.baselineWindow
    )
  );

  return compareWindows;
}

function moveMixSlots(
  mix: ExerciseTypeMix,
  from: keyof ExerciseTypeMix,
  to: keyof ExerciseTypeMix,
  count: number
): void {
  for (let i = 0; i < count; i += 1) {
    if (mix[from] <= 0) break;
    mix[from] -= 1;
    mix[to] += 1;
  }
}

function buildAdjustedMix(
  selection: ObjectiveSelectionResult,
  interventionType: ObjectiveInterventionType
): ExerciseTypeMix {
  const mix: ExerciseTypeMix = { ...selection.objectiveExerciseMix };

  switch (interventionType) {
    case "reinforce_pattern_repair":
      moveMixSlots(mix, "visualization", "tactical", 1);
      moveMixSlots(mix, "reconstruction", "recall", 1);
      break;
    case "shift_to_visualization_support":
      moveMixSlots(mix, "tactical", "visualization", 1);
      moveMixSlots(mix, "recall", "visualization", 1);
      break;
    case "increase_challenge":
    case "promote_to_next_phase":
      moveMixSlots(mix, "recall", "reconstruction", 1);
      moveMixSlots(mix, "tactical", "visualization", 1);
      break;
    default:
      break;
  }

  return mix;
}

function buildDifficultyAdjustment(
  input: ObjectiveCoachingInput,
  interventionType: ObjectiveInterventionType
) {
  const base = input.selectionInput.readiness.state === "ready_to_expand"
    ? { easy: 2, medium: 4, hard: 4 }
    : input.selectionInput.readiness.state === "repair_mode"
      ? { easy: 4, medium: 4, hard: 2 }
      : { easy: 3, medium: 4, hard: 3 };

  const recommendedDistribution = { ...base };
  let action: "hold" | "reduce" | "increase" = "hold";
  let reason = "Keep the current difficulty spread because measured evidence is balanced.";

  if (interventionType === "reduce_stretch_load" || interventionType === "reinforce_pattern_repair") {
    action = "reduce";
    recommendedDistribution.easy += 1;
    recommendedDistribution.hard = Math.max(0, recommendedDistribution.hard - 1);
    reason = "Recent severe errors justify reducing stretch load until accuracy stabilizes.";
  } else if (interventionType === "increase_challenge" || interventionType === "promote_to_next_phase") {
    action = "increase";
    recommendedDistribution.easy = Math.max(0, recommendedDistribution.easy - 1);
    recommendedDistribution.hard += 1;
    reason = "Improving accuracy and readiness support a deeper challenge mix.";
  }

  return {
    action,
    recommendedDistribution,
    reason,
  };
}

function deriveIntervention(
  input: ObjectiveCoachingInput,
  signals: ReturnType<typeof buildObjectiveSignals>
): {
  interventionType: ObjectiveInterventionType;
  recommendationStrength: ObjectiveRecommendationStrength;
  suggestedObjectiveAction: ObjectiveCoachingState["suggestedObjectiveAction"];
  interventionReason: string;
} {
  const severe = severeRate(input.progress.evidenceWindow);
  const evalLoss = input.progress.evidenceWindow.averageEvalLossCp ?? 0;

  if (input.progress.lifecycleDecision === "switch") {
    return {
      interventionType: "switch_objective",
      recommendationStrength: "high",
      suggestedObjectiveAction: "switch_objective",
      interventionReason: input.progress.switchRecommendationReason ?? input.progress.objectiveDecisionReason,
    };
  }

  if (input.progress.lifecycleDecision === "retire") {
    return {
      interventionType: "retire_objective",
      recommendationStrength: "high",
      suggestedObjectiveAction: "retire_objective",
      interventionReason: input.progress.retirementRecommendation.reason ?? input.progress.objectiveDecisionReason,
    };
  }

  if (input.progress.lifecycleDecision === "promote") {
    return {
      interventionType: "promote_to_next_phase",
      recommendationStrength: "high",
      suggestedObjectiveAction: "promote_objective",
      interventionReason: input.progress.promotionRecommendation.reason ?? input.progress.objectiveDecisionReason,
    };
  }

  if (
    input.progress.lifecycleDecision === "repair" ||
    input.progress.progressVerdict === "regressing" ||
    severe >= OBJECTIVE_COACHING_CONFIG.severeRateHigh ||
    evalLoss >= OBJECTIVE_COACHING_CONFIG.highEvalLossCp
  ) {
    if (signals.relevantRecurringWeaknesses.length > 0) {
      return {
        interventionType: "reinforce_pattern_repair",
        recommendationStrength: "high",
        suggestedObjectiveAction: "intensify_repair",
        interventionReason: `Regression is concentrated in recurring weakness categories (${signals.relevantRecurringWeaknesses.join(", ")}).`,
      };
    }

    return {
      interventionType: "reduce_stretch_load",
      recommendationStrength: "high",
      suggestedObjectiveAction: "reduce_difficulty",
      interventionReason: "Severe error rate or eval loss is too high to justify keeping the current stretch load.",
    };
  }

  if (input.progress.progressVerdict === "stalled") {
    if (signals.reviewBurden >= OBJECTIVE_COACHING_CONFIG.highReviewBurden) {
      return {
        interventionType: "increase_review_share",
        recommendationStrength: "high",
        suggestedObjectiveAction: "shift_exercise_mix",
        interventionReason: "Objective-relevant review burden is high enough that consolidation should take precedence over fresh stretch work.",
      };
    }

    if (
      input.progress.currentObjective === "calculation_stability" ||
      input.progress.currentObjective === "visualization_depth" ||
      input.progress.currentObjective === "candidate_move_generation"
    ) {
      return {
        interventionType: "shift_to_visualization_support",
        recommendationStrength: "medium",
        suggestedObjectiveAction: "shift_exercise_mix",
        interventionReason: "The objective is stalled without heavy review pressure, so more boardless support should reinforce deeper calculation quality.",
      };
    }
  }

  if (
    input.progress.progressVerdict === "progressing" &&
    input.selectionInput.readiness.state === "ready_to_expand" &&
    (input.progress.evidenceWindow.averageAccuracy ?? 0) >= OBJECTIVE_COACHING_CONFIG.challengeAccuracy
  ) {
    return {
      interventionType: "increase_challenge",
      recommendationStrength: "medium",
      suggestedObjectiveAction: "increase_challenge",
      interventionReason: "Recent objective performance is improving with expansion-ready readiness, so the next session can absorb more challenge.",
    };
  }

  return {
    interventionType: "hold_current_plan",
    recommendationStrength: input.progress.progressVerdict === "holding" ? "low" : "medium",
    suggestedObjectiveAction: "continue",
    interventionReason: "Measured evidence does not justify changing the current plan beyond staying objective-aligned.",
  };
}

function buildHeadline(interventionType: ObjectiveInterventionType, objectiveLabel: string): string {
  switch (interventionType) {
    case "switch_objective":
      return `Switch away from ${objectiveLabel} now.`;
    case "retire_objective":
      return `${objectiveLabel} has met its exit threshold.`;
    case "promote_to_next_phase":
      return `Promote ${objectiveLabel} into a deeper phase.`;
    case "reinforce_pattern_repair":
      return `${objectiveLabel} needs stronger repair support.`;
    case "reduce_stretch_load":
      return `Reduce stretch load while ${objectiveLabel} stabilizes.`;
    case "increase_review_share":
      return `Increase review share before pushing ${objectiveLabel} further.`;
    case "shift_to_visualization_support":
      return `Add visualization support to unblock ${objectiveLabel}.`;
    case "increase_challenge":
      return `${objectiveLabel} is ready for a harder session mix.`;
    default:
      return `Hold the current plan for ${objectiveLabel}.`;
  }
}

function buildSummary(state: {
  interventionType: ObjectiveInterventionType;
  reviewBurden: number;
  severeRate: number;
  failedSignals: ObjectiveCoachingSignal[];
  supportingSignals: ObjectiveCoachingSignal[];
  interventionReason: string;
}): string {
  const topFailed = state.failedSignals.slice(0, 2).map((signal) => signal.label).join(", ");
  const topSupporting = state.supportingSignals.slice(0, 2).map((signal) => signal.label).join(", ");
  const fragments = [state.interventionReason];
  fragments.push(`Objective review burden is ${(state.reviewBurden * 100).toFixed(1)}% and severe rate is ${(state.severeRate * 100).toFixed(1)}%.`);
  if (topFailed) fragments.push(`Failed signals: ${topFailed}.`);
  if (topSupporting) fragments.push(`Supporting signals: ${topSupporting}.`);
  return fragments.join(" ");
}

export function deriveObjectiveCoaching(input: ObjectiveCoachingInput): ObjectiveCoachingState {
  const generatedAt = input.generatedAt ?? input.progress.generatedAt;
  const signals = buildObjectiveSignals(input);
  const compareWindows = buildCompareWindows(input);
  const intervention = deriveIntervention(input, signals);
  const suggestedSessionMixAdjustment = {
    recommendedMix: buildAdjustedMix(input.selection, intervention.interventionType),
    reason: intervention.interventionType === "shift_to_visualization_support"
      ? "Shift one or two slots from tactical/recall work into visualization support."
      : intervention.interventionType === "reinforce_pattern_repair"
        ? "Bias the session toward tactical certainty and memory reinforcement."
        : intervention.interventionType === "increase_challenge" || intervention.interventionType === "promote_to_next_phase"
          ? "Use more visualization and reconstruction to deepen transfer."
          : "Keep the current objective exercise mix unless the artifact says otherwise.",
  };
  const suggestedDifficultyAdjustment = buildDifficultyAdjustment(input, intervention.interventionType);
  const suggestedReviewAdjustment = {
    action: intervention.interventionType === "increase_review_share" || intervention.interventionType === "reinforce_pattern_repair" ? "increase" as const : "hold" as const,
    targetReviewShare:
      intervention.interventionType === "increase_review_share"
        ? 0.4
        : intervention.interventionType === "reinforce_pattern_repair"
          ? 0.35
          : 0.25,
    reason:
      intervention.interventionType === "increase_review_share"
        ? "More review slots are needed because objective-relevant backlog is still elevated."
        : intervention.interventionType === "reinforce_pattern_repair"
          ? "Repair mode should keep review pressure visible until recurring weaknesses soften."
          : "Keep the current review share.",
  };
  const objectiveLabel = input.progress.currentObjective.replace(/_/g, " ");
  const nextSessionAdjustmentSummary = `${intervention.interventionReason} Next session mix ${JSON.stringify(suggestedSessionMixAdjustment.recommendedMix)} with difficulty ${suggestedDifficultyAdjustment.recommendedDistribution.easy}/${suggestedDifficultyAdjustment.recommendedDistribution.medium}/${suggestedDifficultyAdjustment.recommendedDistribution.hard} and review share target ${(suggestedReviewAdjustment.targetReviewShare * 100).toFixed(0)}%.`;

  return {
    generatedAt,
    currentObjective: input.progress.currentObjective,
    objectivePhase: input.progress.objectivePhase,
    objectiveStatus: input.progress.objectiveStatus,
    progressVerdict: input.progress.progressVerdict,
    lifecycleDecision: input.progress.lifecycleDecision,
    interventionType: intervention.interventionType,
    interventionReason: intervention.interventionReason,
    recommendationStrength: intervention.recommendationStrength,
    failedSignals: signals.failedSignals,
    supportingSignals: signals.supportingSignals,
    compareWindows,
    suggestedSessionMixAdjustment,
    suggestedDifficultyAdjustment,
    suggestedReviewAdjustment,
    suggestedObjectiveAction: intervention.suggestedObjectiveAction,
    nextSessionAdjustmentSummary,
    headline: buildHeadline(intervention.interventionType, objectiveLabel),
    explanation: buildSummary({
      interventionType: intervention.interventionType,
      reviewBurden: signals.reviewBurden,
      severeRate: severeRate(input.progress.evidenceWindow),
      failedSignals: signals.failedSignals,
      supportingSignals: signals.supportingSignals,
      interventionReason: intervention.interventionReason,
    }),
  };
}

export function prioritizeExercisesForObjectiveCoaching(
  exercises: TrainingExercise[],
  store: ProgressStore,
  reviewQueue: ReviewQueue,
  coaching: ObjectiveCoachingState
): TrainingExercise[] {
  if (coaching.suggestedReviewAdjustment.action !== "increase") {
    return exercises;
  }

  const reviewEntries = new Set(
    reviewQueue.entries
      .filter((entry) => entry.reason === "overdue" || entry.reason === "due_soon" || entry.reason === "unstable")
      .map((entry) => entry.exerciseId)
  );

  return [...exercises]
    .map((exercise, index) => {
      const progress = store.exercises[exercise.positionId];
      const reviewWeight = reviewEntries.has(exercise.positionId) ? 1 : 0;
      const urgency = progress?.reviewUrgency ?? 0;
      return { exercise, index, reviewWeight, urgency };
    })
    .sort((a, b) => {
      if (b.reviewWeight !== a.reviewWeight) return b.reviewWeight - a.reviewWeight;
      if (b.urgency !== a.urgency) return b.urgency - a.urgency;
      return a.index - b.index;
    })
    .map((entry) => entry.exercise);
}
