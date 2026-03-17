import type {
  InterventionEffectivenessInput,
  InterventionEffectivenessState,
  InterventionHistoryEntry,
  InterventionMemoryState,
  InterventionSignalDelta,
  ObjectiveCoachingState,
  ObjectiveCompareWindow,
  ObjectiveInterventionType,
  ObjectivePerformanceWindow,
} from "./types";

function asWindow(snapshot: {
  gradeDistribution: {
    accuracy: number | null;
    exactRate: number | null;
    acceptableRate: number | null;
    mistakeRate: number | null;
    blunderRate: number | null;
  };
  evalLossProfile: { averageEvalLossCp: number | null };
}): ObjectivePerformanceWindow {
  return {
    sessionCount: 0,
    averageAccuracy: snapshot.gradeDistribution.accuracy,
    exactRate: snapshot.gradeDistribution.exactRate,
    acceptableRate: snapshot.gradeDistribution.acceptableRate,
    mistakeRate: snapshot.gradeDistribution.mistakeRate,
    blunderRate: snapshot.gradeDistribution.blunderRate,
    averageEvalLossCp: snapshot.evalLossProfile.averageEvalLossCp,
  };
}

function buildSignalDelta(
  key: string,
  label: string,
  direction: "increase" | "decrease",
  beforeValue: number | null,
  afterValue: number | null,
  threshold: number
): InterventionSignalDelta {
  const delta = beforeValue !== null && afterValue !== null ? Number((afterValue - beforeValue).toFixed(4)) : null;
  const improved = delta !== null && (direction === "increase" ? delta > threshold : delta < -threshold);
  const worsened = delta !== null && (direction === "increase" ? delta < -threshold : delta > threshold);
  return {
    key,
    label,
    metric: key,
    beforeValue,
    afterValue,
    delta,
    direction,
    outcome: improved ? "improved" : worsened ? "worsened" : "unchanged",
    explanation: `${label} moved from ${beforeValue !== null ? beforeValue.toFixed(2) : "n/a"} to ${afterValue !== null ? afterValue.toFixed(2) : "n/a"}.`,
  };
}

function buildCompareWindow(memory: InterventionMemoryState | null): ObjectiveCompareWindow[] {
  const latestEpisode = memory?.episodes[memory.episodes.length - 1];
  if (!latestEpisode) return [];
  return [
    {
      label: latestEpisode.compareSnapshot.label,
      currentWindow: asWindow(latestEpisode.postSnapshot),
      previousWindow: asWindow(latestEpisode.preSnapshot),
      deltas: {
        accuracyDelta: latestEpisode.compareSnapshot.accuracyDelta,
        severeRateDelta: latestEpisode.compareSnapshot.severeRateDelta,
        evalLossDelta: latestEpisode.compareSnapshot.evalLossDelta,
      },
      summary: latestEpisode.compareSnapshot.summary,
    },
  ];
}

function buildNarrative(args: {
  objective: string;
  interventionType: ObjectiveInterventionType | null;
  outcome: string;
  changedSignals: InterventionSignalDelta[];
  unchangedSignals: InterventionSignalDelta[];
  worsenedSignals: InterventionSignalDelta[];
  repeatedPatternFlag: boolean;
  recommendedAction: string;
  nextIntervention: ObjectiveInterventionType | null;
  memory: InterventionMemoryState | null;
}) {
  const interventionLabel = args.interventionType?.replace(/_/g, " ") ?? "no prior intervention";
  const improvedText = args.changedSignals.length > 0 ? args.changedSignals.map((signal) => signal.label).join(", ") : "No signal improved.";
  const unchangedText = args.unchangedSignals.length > 0 ? args.unchangedSignals.map((signal) => signal.label).join(", ") : "No unchanged signals recorded.";
  const worsenedText = args.worsenedSignals.length > 0 ? args.worsenedSignals.map((signal) => signal.label).join(", ") : "No signal worsened.";
  const repeated = args.repeatedPatternFlag ? "Repeated failure patterns are now visible in memory. " : "";
  const memoryContext = args.memory?.betterPriorIntervention.reason ? `${args.memory.betterPriorIntervention.reason} ` : "";
  const nextStep = args.nextIntervention
    ? `${args.recommendedAction} ${args.nextIntervention.replace(/_/g, " ")} next.`
    : `${args.recommendedAction} next.`;

  return {
    headline: `${interventionLabel} was ${args.outcome.replace(/_/g, " ")}.`,
    summary: `The last intervention on ${args.objective.replace(/_/g, " ")} was ${interventionLabel} and the measured outcome is ${args.outcome.replace(/_/g, " ")}. ${repeated}${memoryContext}${nextStep}`,
    whatImproved: improvedText,
    whatDidNotImprove: unchangedText,
    whatGotWorse: worsenedText,
    nextStep,
  };
}

function applyStrengthening(coaching: ObjectiveCoachingState): ObjectiveCoachingState {
  const difficulty = { ...coaching.suggestedDifficultyAdjustment.recommendedDistribution };
  if (difficulty.hard > 0 && coaching.interventionType === "reduce_stretch_load") {
    difficulty.hard -= 1;
    difficulty.easy += 1;
  }

  return {
    ...coaching,
    recommendationStrength: "high",
    suggestedReviewAdjustment: {
      ...coaching.suggestedReviewAdjustment,
      targetReviewShare: Math.min(0.5, Number((coaching.suggestedReviewAdjustment.targetReviewShare + 0.1).toFixed(2))),
      reason: `${coaching.suggestedReviewAdjustment.reason} Prior memory shows the same intervention was only partially effective.`,
    },
    suggestedDifficultyAdjustment: {
      ...coaching.suggestedDifficultyAdjustment,
      recommendedDistribution: difficulty,
      reason: `${coaching.suggestedDifficultyAdjustment.reason} Memory supports a stronger follow-up.`,
    },
    nextSessionAdjustmentSummary: `${coaching.nextSessionAdjustmentSummary} Memory shows only partial improvement, so the next session strengthens the same intervention.`,
    explanation: `${coaching.explanation} Intervention memory shows partial improvement, so the plan intentionally intensifies the same intervention.`,
  };
}

function retargetCoaching(
  coaching: ObjectiveCoachingState,
  nextIntervention: ObjectiveInterventionType,
  recommendedAction: string,
  reason: string
): ObjectiveCoachingState {
  const retargeted = {
    ...coaching,
    interventionType: nextIntervention,
    recommendationStrength: "high" as const,
    interventionReason: reason,
    headline: `${nextIntervention.replace(/_/g, " ")} is now preferred.`,
    explanation: `${coaching.explanation} ${reason}`,
  };

  switch (nextIntervention) {
    case "increase_review_share":
      return {
        ...retargeted,
        suggestedReviewAdjustment: {
          action: "increase",
          targetReviewShare: 0.4,
          reason,
        },
        nextSessionAdjustmentSummary: `${reason} Memory recommends ${recommendedAction} via higher review share.`,
      };
    case "reduce_stretch_load":
      return {
        ...retargeted,
        suggestedDifficultyAdjustment: {
          action: "reduce",
          recommendedDistribution: { easy: 4, medium: 4, hard: 2 },
          reason,
        },
        nextSessionAdjustmentSummary: `${reason} Memory recommends reducing stretch load in the next session.`,
      };
    case "switch_objective":
      return {
        ...retargeted,
        suggestedObjectiveAction: "switch_objective",
        nextSessionAdjustmentSummary: `${reason} Memory recommends switching objectives instead of repeating the same intervention cycle.`,
      };
    default:
      return {
        ...retargeted,
        nextSessionAdjustmentSummary: `${reason} Memory recommends ${recommendedAction} with ${nextIntervention.replace(/_/g, " ")}.`,
      };
  }
}

export function deriveInterventionEffectiveness(
  input: InterventionEffectivenessInput
): InterventionEffectivenessState {
  const generatedAt = input.generatedAt ?? input.progress.generatedAt;
  const memory = input.interventionMemory ?? null;
  const latestEpisode = memory?.episodes[memory.episodes.length - 1] ?? null;
  const priorInterventionType = latestEpisode?.interventionType ?? null;
  const changedSignals = latestEpisode
    ? [
        buildSignalDelta(
          "accuracy",
          "Accuracy",
          "increase",
          latestEpisode.preSnapshot.gradeDistribution.accuracy,
          latestEpisode.postSnapshot.gradeDistribution.accuracy,
          0.02
        ),
        buildSignalDelta(
          "severe_rate",
          "Severe rate",
          "decrease",
          latestEpisode.preSnapshot.gradeDistribution.severeRate,
          latestEpisode.postSnapshot.gradeDistribution.severeRate,
          0.02
        ),
        buildSignalDelta(
          "eval_loss_cp",
          "Average eval loss",
          "decrease",
          latestEpisode.preSnapshot.evalLossProfile.averageEvalLossCp,
          latestEpisode.postSnapshot.evalLossProfile.averageEvalLossCp,
          10
        ),
        buildSignalDelta(
          "review_burden",
          "Review burden",
          "decrease",
          latestEpisode.preSnapshot.reviewBurdenShare,
          latestEpisode.postSnapshot.reviewBurdenShare,
          0.02
        ),
        buildSignalDelta(
          "recurrence_pressure",
          "Recurrence pressure",
          "decrease",
          latestEpisode.preSnapshot.recurrencePressure,
          latestEpisode.postSnapshot.recurrencePressure,
          0.2
        ),
      ]
    : [];
  const improved = changedSignals.filter((signal) => signal.outcome === "improved");
  const unchanged = changedSignals.filter((signal) => signal.outcome === "unchanged");
  const worsened = changedSignals.filter((signal) => signal.outcome === "worsened");
  const recommendedAction = latestEpisode?.recommendedNextAction ?? "continue";
  const recommendedNextIntervention = latestEpisode?.recommendedNextIntervention ?? input.coaching.interventionType;
  const narrativeSummaryData = buildNarrative({
    objective: input.progress.currentObjective,
    interventionType: priorInterventionType,
    outcome: latestEpisode?.outcome ?? "inconclusive",
    changedSignals: improved,
    unchangedSignals: unchanged,
    worsenedSignals: worsened,
    repeatedPatternFlag: latestEpisode?.repeatedPatternFlag ?? false,
    recommendedAction,
    nextIntervention: recommendedNextIntervention,
    memory,
  });

  return {
    generatedAt,
    currentObjective: input.progress.currentObjective,
    interventionEpisodeId: latestEpisode?.interventionEpisodeId ?? "episode-none",
    interventionId: latestEpisode?.interventionEpisodeId ?? "intervention-none",
    priorInterventionType,
    interventionStartedAt: latestEpisode?.startedAt ?? null,
    interventionEvaluationAt: latestEpisode?.evaluatedAt ?? generatedAt,
    interventionOutcome: latestEpisode?.outcome ?? "inconclusive",
    outcomeStrength: latestEpisode?.outcomeStrength ?? "low",
    repeatedPatternFlag: latestEpisode?.repeatedPatternFlag ?? false,
    changedSignals: improved,
    unchangedSignals: unchanged,
    worsenedSignals: worsened,
    compareWindows: buildCompareWindow(memory),
    recommendedAction,
    recommendedNextIntervention,
    narrativeSummaryData,
  };
}

export function deriveInterventionHistory(memory: InterventionMemoryState): InterventionHistoryEntry[] {
  return memory.episodes.map((episode) => ({
    interventionEpisodeId: episode.interventionEpisodeId,
    interventionId: episode.interventionEpisodeId,
    objective: episode.objectiveKey,
    priorInterventionType: episode.interventionType,
    interventionStartedAt: episode.startedAt,
    interventionEvaluationAt: episode.evaluatedAt,
    interventionOutcome: episode.outcome,
    outcomeStrength: episode.outcomeStrength,
    repeatedPatternFlag: episode.repeatedPatternFlag,
    recommendedAction: episode.recommendedNextAction,
    recommendedNextIntervention: episode.recommendedNextIntervention,
    summary: episode.compareSnapshot.summary,
  }));
}

export function applyInterventionEffectivenessToCoaching(
  coaching: ObjectiveCoachingState,
  effectiveness: InterventionEffectivenessState
): ObjectiveCoachingState {
  if (
    effectiveness.recommendedAction === "strengthen" &&
    effectiveness.recommendedNextIntervention === coaching.interventionType
  ) {
    return applyStrengthening(coaching);
  }

  if (
    (effectiveness.recommendedAction === "reverse" ||
      effectiveness.recommendedAction === "replace" ||
      effectiveness.recommendedAction === "switch_objective") &&
    effectiveness.recommendedNextIntervention
  ) {
    return retargetCoaching(
      coaching,
      effectiveness.recommendedNextIntervention,
      effectiveness.recommendedAction,
      effectiveness.narrativeSummaryData.nextStep
    );
  }

  return coaching;
}

