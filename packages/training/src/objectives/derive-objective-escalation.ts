import { findNextObjectiveCandidate } from "./select-training-objective";
import type {
  InterventionEpisodeMemory,
  ObjectiveEscalationInput,
  ObjectiveEscalationSignal,
  ObjectiveEscalationState,
  ObjectiveEscalationStrength,
  ObjectiveEscalationVerdict,
} from "./types";

const ESCALATION_CONFIG = {
  repeatedSuccessPromotionThreshold: 2,
  repeatedSuccessRetireThreshold: 3,
  repeatedFailureRepairThreshold: 2,
  repeatedFailureSwitchThreshold: 3,
  highReviewBurdenShare: 0.35,
  highRecurrencePressure: 1.5,
} as const;

function round(value: number): number {
  return Number(value.toFixed(4));
}

function outcomeScore(outcome: InterventionEpisodeMemory["outcome"]): number {
  switch (outcome) {
    case "effective":
      return 2;
    case "partially_effective":
      return 1;
    case "ineffective":
      return -1;
    case "regressed":
      return -2;
    default:
      return 0;
  }
}

function strengthForScore(score: number): ObjectiveEscalationStrength {
  if (score >= 4 || score <= -4) return "high";
  if (score >= 2 || score <= -2) return "medium";
  return "low";
}

function objectiveReviewBurdenShare(input: ObjectiveEscalationInput): number {
  const totalExercises = Math.max(input.selectionInput.store.totalExercises, 1);
  return round(input.selectionInput.reviewQueue.totalEntries / totalExercises);
}

function recurrencePressure(input: ObjectiveEscalationInput): number {
  const recurring = input.selectionInput.patternIntelligence.recurrenceEntries.filter((entry) => entry.isRecurring);
  if (recurring.length === 0) return 0;
  return round(Math.max(...recurring.map((entry) => entry.recurrenceScore)));
}

function repeatedOutcomeCount(
  episodes: InterventionEpisodeMemory[],
  predicate: (episode: InterventionEpisodeMemory) => boolean
): number {
  let count = 0;
  for (let index = episodes.length - 1; index >= 0; index -= 1) {
    if (!predicate(episodes[index])) break;
    count += 1;
  }
  return count;
}

function buildSignal(args: {
  key: string;
  label: string;
  summary: string;
  value: number | string | null;
  support: ObjectiveEscalationSignal["support"];
}): ObjectiveEscalationSignal {
  return args;
}

export function deriveObjectiveEscalation(input: ObjectiveEscalationInput): ObjectiveEscalationState {
  const generatedAt = input.generatedAt ?? input.progress.generatedAt;
  const episodes = input.interventionMemory?.episodes ?? [];
  const repeatedFailures = repeatedOutcomeCount(episodes, (episode) => outcomeScore(episode.outcome) < 0);
  const repeatedSuccesses = repeatedOutcomeCount(episodes, (episode) => outcomeScore(episode.outcome) > 0);
  const latestEpisode = episodes[episodes.length - 1] ?? null;
  const oscillationPenalty = input.interventionMemory?.oscillationDetected ? 1 : 0;
  const reviewBurdenShare = objectiveReviewBurdenShare(input);
  const recurrence = recurrencePressure(input);
  const metSignals = input.progress.successSignalSnapshots.filter((signal) => signal.met).length;
  const totalSignals = input.progress.successSignalSnapshots.length;
  const nextCandidate = findNextObjectiveCandidate(
    input.selection.candidateScores,
    input.progress.currentObjective
  )?.objective ?? null;

  const repeatedFailureSignals = [
    ...(repeatedFailures >= ESCALATION_CONFIG.repeatedFailureRepairThreshold
      ? [`${repeatedFailures} consecutive intervention episodes ended ineffective or regressed.`]
      : []),
    ...(input.interventionMemory?.repeatedPatternWarnings ?? []),
    ...(recurrence >= ESCALATION_CONFIG.highRecurrencePressure
      ? [`Pattern recurrence pressure remains elevated at ${recurrence.toFixed(2)}.`]
      : []),
    ...(reviewBurdenShare >= ESCALATION_CONFIG.highReviewBurdenShare
      ? [`Objective review burden share is elevated at ${reviewBurdenShare.toFixed(2)}.`]
      : []),
  ];

  const repeatedSuccessSignals = [
    ...(repeatedSuccesses >= ESCALATION_CONFIG.repeatedSuccessPromotionThreshold
      ? [`${repeatedSuccesses} consecutive intervention episodes improved objective outcomes.`]
      : []),
    ...(totalSignals > 0 && metSignals === totalSignals
      ? [`All ${totalSignals} tracked objective success signals are currently met.`]
      : []),
    ...(input.interventionEffectiveness.interventionOutcome === "effective"
      ? ["Latest intervention effectiveness evaluation was effective."]
      : []),
  ];

  const memorySupportSignals: ObjectiveEscalationSignal[] = [
    buildSignal({
      key: "progress_verdict",
      label: "Progress Verdict",
      summary: `Objective progress is ${input.progress.progressVerdict.replace(/_/g, " ")}.`,
      value: input.progress.progressVerdict,
      support:
        input.progress.progressVerdict === "progressing" || input.progress.progressVerdict === "completed"
          ? "success"
          : input.progress.progressVerdict === "regressing"
            ? "failure"
            : "mixed",
    }),
    buildSignal({
      key: "repeated_successes",
      label: "Repeated Successes",
      summary: `${repeatedSuccesses} consecutive positive intervention episode(s).`,
      value: repeatedSuccesses,
      support: repeatedSuccesses > 0 ? "success" : "mixed",
    }),
    buildSignal({
      key: "repeated_failures",
      label: "Repeated Failures",
      summary: `${repeatedFailures} consecutive negative intervention episode(s).`,
      value: repeatedFailures,
      support: repeatedFailures > 0 ? "failure" : "mixed",
    }),
    buildSignal({
      key: "readiness_state",
      label: "Readiness State",
      summary: `Strategic readiness is ${input.selectionInput.readiness.state.replace(/_/g, " ")}.`,
      value: input.selectionInput.readiness.state,
      support:
        input.selectionInput.readiness.state === "ready_to_expand"
          ? "success"
          : input.selectionInput.readiness.state === "repair_mode"
            ? "failure"
            : "mixed",
    }),
    buildSignal({
      key: "review_burden",
      label: "Review Burden",
      summary: `Objective review burden share is ${reviewBurdenShare.toFixed(2)}.`,
      value: reviewBurdenShare,
      support: reviewBurdenShare >= ESCALATION_CONFIG.highReviewBurdenShare ? "failure" : "mixed",
    }),
    buildSignal({
      key: "oscillation_penalty",
      label: "Oscillation Penalty",
      summary: input.interventionMemory?.oscillationSummary ?? "No intervention oscillation detected.",
      value: oscillationPenalty,
      support: oscillationPenalty > 0 ? "penalty" : "mixed",
    }),
  ];

  let escalationVerdict: ObjectiveEscalationVerdict = "hold_current_objective";
  let escalationReason = "Evidence is mixed, so the objective should hold while collecting cleaner intervention evidence.";
  let recommendedNextObjective: ObjectiveEscalationState["recommendedNextObjective"] = null;
  let recommendedObjectivePhaseChange: ObjectiveEscalationState["recommendedObjectivePhaseChange"] = null;

  if (
    repeatedSuccesses >= ESCALATION_CONFIG.repeatedSuccessRetireThreshold &&
    input.progress.progressVerdict === "completed" &&
    nextCandidate
  ) {
    escalationVerdict = "retire_objective";
    recommendedNextObjective = nextCandidate;
    escalationReason = `Repeated intervention success and completed objective signals justify retiring ${input.progress.currentObjective.replace(/_/g, " ")} in favor of ${nextCandidate.replace(/_/g, " ")}.`;
  } else if (
    repeatedSuccesses >= ESCALATION_CONFIG.repeatedSuccessPromotionThreshold &&
    input.progress.progressVerdict !== "regressing" &&
    input.selectionInput.readiness.state === "ready_to_expand" &&
    input.progress.objectivePhase !== "expand"
  ) {
    escalationVerdict = "promote_objective_phase";
    recommendedObjectivePhaseChange = {
      fromPhase: input.progress.objectivePhase,
      toPhase: input.progress.objectivePhase === "stabilize" ? "build" : "expand",
      reason: `Repeated intervention success plus ${input.selectionInput.readiness.state.replace(/_/g, " ")} readiness support a phase promotion.`,
    };
    escalationReason = `Repeated intervention success now supports promoting ${input.progress.currentObjective.replace(/_/g, " ")} from ${input.progress.objectivePhase} phase.`;
  } else if (
    repeatedFailures >= ESCALATION_CONFIG.repeatedFailureSwitchThreshold &&
    nextCandidate
  ) {
    escalationVerdict = "switch_objective";
    recommendedNextObjective = nextCandidate;
    escalationReason = `Repeated intervention-memory failure now justifies switching away from ${input.progress.currentObjective.replace(/_/g, " ")} toward ${nextCandidate.replace(/_/g, " ")}.`;
  } else if (
    repeatedFailures >= ESCALATION_CONFIG.repeatedFailureRepairThreshold &&
    input.selectionInput.readiness.state === "repair_mode"
  ) {
    escalationVerdict = "revert_to_repair_mode";
    recommendedObjectivePhaseChange = {
      fromPhase: input.progress.objectivePhase,
      toPhase: "stabilize",
      reason: "Repeated failure with repair-mode readiness requires a stronger repair cycle.",
    };
    escalationReason = `Repeated intervention failure plus repair-mode readiness justify reverting ${input.progress.currentObjective.replace(/_/g, " ")} to stabilize work.`;
  } else if (
    repeatedSuccesses > 0 &&
    input.progress.progressVerdict === "progressing" &&
    oscillationPenalty === 0
  ) {
    escalationVerdict = "continue_current_objective";
    escalationReason = "Intervention history is improving, so the current objective should continue without escalation.";
  } else if (
    latestEpisode &&
    outcomeScore(latestEpisode.outcome) < 0 &&
    input.interventionMemory?.betterPriorIntervention.preferredInterventionType
  ) {
    escalationVerdict = "hold_current_objective";
    escalationReason = input.interventionMemory.betterPriorIntervention.reason ?? escalationReason;
  }

  const signalBalance = repeatedSuccesses - repeatedFailures - oscillationPenalty;
  const escalationStrength = strengthForScore(signalBalance);
  const explanation = [
    escalationReason,
    repeatedFailureSignals[0] ?? null,
    repeatedSuccessSignals[0] ?? null,
    input.interventionMemory?.oscillationSummary ?? null,
    `Readiness is ${input.selectionInput.readiness.state.replace(/_/g, " ")} with review burden ${reviewBurdenShare.toFixed(2)}.`,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");

  return {
    generatedAt,
    currentObjective: input.progress.currentObjective,
    currentPhase: input.progress.objectivePhase,
    escalationVerdict,
    escalationReason,
    escalationStrength,
    memorySupportSignals,
    repeatedFailureSignals,
    repeatedSuccessSignals,
    oscillationPenalty,
    recommendedObjectiveAction: escalationVerdict,
    recommendedObjectivePhaseChange,
    recommendedNextObjective,
    explanation,
  };
}
