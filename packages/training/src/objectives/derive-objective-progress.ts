import type {
  ObjectiveHistoryEntry,
  ObjectiveLifecycleDecision,
  ObjectiveLifecycleEscalationOverride,
  ObjectiveLifecycleResolution,
  ObjectivePerformanceWindow,
  ObjectivePhase,
  ObjectiveProgressInput,
  ObjectiveProgressState,
  ObjectiveProgressVerdict,
  ObjectiveSessionArtifactInput,
  ObjectiveSessionEvidence,
  ObjectiveStatus,
  ObjectiveSuccessSignalSnapshot,
  TrainingObjective,
} from "./types";
import {
  buildObjectiveBias,
  buildObjectiveSelectionSnapshot,
  findNextObjectiveCandidate,
} from "./select-training-objective";

const OBJECTIVE_PROGRESS_CONFIG = {
  recentWindow: 4,
  minSessionSample: 3,
  accuracyImproveDelta: 0.05,
  accuracyRegressDelta: -0.05,
  severeImproveDelta: -0.05,
  severeRegressDelta: 0.05,
  evalLossImproveDelta: 15,
  evalLossRegressDelta: -15,
  promoteMinSessions: 3,
  retireMinSessions: 4,
  retireMaxSevereRate: 0.1,
  strongSignalAttainment: 1.0,
  holdSignalAttainment: 0.85,
} as const;

function round(value: number | null): number | null {
  if (value === null) return null;
  return Number(value.toFixed(4));
}

function daysBetween(startedAt: string, endedAt: string): number {
  const diffMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  return Math.max(0, Number((diffMs / (1000 * 60 * 60 * 24)).toFixed(2)));
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getObjectiveSeverityRate(window: ObjectivePerformanceWindow): number {
  return (window.mistakeRate ?? 0) + (window.blunderRate ?? 0);
}

function buildPerformanceWindow(entries: ObjectiveSessionEvidence[]): ObjectivePerformanceWindow {
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

function splitBaseline(entries: ObjectiveSessionEvidence[]): {
  evidenceWindow: ObjectivePerformanceWindow;
  baselineWindow: ObjectivePerformanceWindow;
} {
  const recent = entries.slice(-OBJECTIVE_PROGRESS_CONFIG.recentWindow);
  const baselineSource = recent.length >= 4 ? recent.slice(0, Math.floor(recent.length / 2)) : recent.slice(0, 1);
  return {
    evidenceWindow: buildPerformanceWindow(recent),
    baselineWindow: buildPerformanceWindow(baselineSource),
  };
}

function signalAttainment(progress: ObjectiveProgressInput): ObjectiveSuccessSignalSnapshot[] {
  return progress.baseSelection.successSignals.map((signal) => {
    const attainment =
      signal.direction === "increase"
        ? signal.currentValue / Math.max(signal.targetValue, 0.0001)
        : signal.targetValue / Math.max(signal.currentValue, 0.0001);
    return {
      ...signal,
      capturedAt: progress.generatedAt ?? progress.baseSelection.generatedAt,
      attainment: Number(attainment.toFixed(4)),
      met: attainment >= 1,
    };
  });
}

function averageSignalAttainment(signals: ObjectiveSuccessSignalSnapshot[]): number {
  if (signals.length === 0) return 0;
  return signals.reduce((sum, signal) => sum + signal.attainment, 0) / signals.length;
}

function objectiveRelevantReviewBurden(input: ObjectiveProgressInput): number {
  const bias = buildObjectiveBias(input.baseSelection);
  const relevantCategories = new Set(Object.keys(bias.categoryBoosts));
  if (relevantCategories.size === 0) return 0;
  const relevant = input.selectionInput.reviewQueue.entries.filter((entry) => {
    const category = input.selectionInput.store.exercises[entry.exerciseId]?.lessonCategory;
    return category !== undefined && relevantCategories.has(category);
  });
  return relevant.length / Math.max(input.selectionInput.reviewQueue.totalEntries, 1);
}

function deriveProgressVerdict(
  input: ObjectiveProgressInput,
  evidenceWindow: ObjectivePerformanceWindow,
  baselineWindow: ObjectivePerformanceWindow,
  signalScore: number
): ObjectiveProgressVerdict {
  if (evidenceWindow.sessionCount === 0) return "insufficient_data";

  const accuracyDelta =
    (evidenceWindow.averageAccuracy ?? 0) -
    (baselineWindow.averageAccuracy ?? evidenceWindow.averageAccuracy ?? 0);
  const severeDelta = getObjectiveSeverityRate(evidenceWindow) - getObjectiveSeverityRate(baselineWindow);
  const evalLossDelta =
    baselineWindow.averageEvalLossCp !== null && evidenceWindow.averageEvalLossCp !== null
      ? baselineWindow.averageEvalLossCp - evidenceWindow.averageEvalLossCp
      : 0;
  const severeRate = getObjectiveSeverityRate(evidenceWindow);

  if (
    signalScore >= OBJECTIVE_PROGRESS_CONFIG.strongSignalAttainment &&
    evidenceWindow.sessionCount >= OBJECTIVE_PROGRESS_CONFIG.retireMinSessions &&
    severeRate <= OBJECTIVE_PROGRESS_CONFIG.retireMaxSevereRate &&
    (evidenceWindow.averageAccuracy ?? 0) >= 0.78
  ) {
    return "completed";
  }

  if (
    input.selectionInput.readiness.state === "repair_mode" &&
    (severeRate >= 0.3 || (evidenceWindow.averageEvalLossCp ?? 0) >= 120)
  ) {
    return "regressing";
  }

  if (
    accuracyDelta <= OBJECTIVE_PROGRESS_CONFIG.accuracyRegressDelta ||
    severeDelta >= OBJECTIVE_PROGRESS_CONFIG.severeRegressDelta ||
    evalLossDelta <= OBJECTIVE_PROGRESS_CONFIG.evalLossRegressDelta
  ) {
    return "regressing";
  }

  if (
    accuracyDelta >= OBJECTIVE_PROGRESS_CONFIG.accuracyImproveDelta ||
    severeDelta <= OBJECTIVE_PROGRESS_CONFIG.severeImproveDelta ||
    evalLossDelta >= OBJECTIVE_PROGRESS_CONFIG.evalLossImproveDelta
  ) {
    return "progressing";
  }

  if (
    evidenceWindow.sessionCount >= OBJECTIVE_PROGRESS_CONFIG.minSessionSample &&
    signalScore < OBJECTIVE_PROGRESS_CONFIG.holdSignalAttainment
  ) {
    return "stalled";
  }

  return "holding";
}

function nextPhase(phase: ObjectivePhase): ObjectivePhase {
  if (phase === "stabilize") return "build";
  if (phase === "build") return "expand";
  return "expand";
}

function deriveEpisodeSessions(
  allEvidence: ObjectiveSessionEvidence[],
  objective: TrainingObjective,
  switchedNow: boolean
): ObjectiveSessionEvidence[] {
  if (switchedNow) return [];

  const chronological = [...allEvidence].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const trailing: ObjectiveSessionEvidence[] = [];
  for (let index = chronological.length - 1; index >= 0; index -= 1) {
    const entry = chronological[index];
    if (entry.objective !== objective) {
      if (trailing.length > 0) break;
      continue;
    }
    trailing.unshift(entry);
  }
  return trailing;
}

function deriveDecisionReason(params: {
  evidenceWindow: ObjectivePerformanceWindow;
  baselineWindow: ObjectivePerformanceWindow;
  signalScore: number;
  switchReason: string | null;
  recommendation: string;
}): string {
  const accuracy = params.evidenceWindow.averageAccuracy;
  const severeRate = getObjectiveSeverityRate(params.evidenceWindow);
  const evalLoss = params.evidenceWindow.averageEvalLossCp;
  const baselineAccuracy = params.baselineWindow.averageAccuracy;
  const parts = [
    `Recent objective accuracy is ${accuracy !== null ? accuracy.toFixed(2) : "n/a"} over ${params.evidenceWindow.sessionCount} session(s).`,
    `Baseline accuracy reference is ${baselineAccuracy !== null ? baselineAccuracy.toFixed(2) : "n/a"}.`,
    `Combined mistake+blunder rate is ${severeRate.toFixed(2)} and average eval loss is ${evalLoss !== null ? `${evalLoss.toFixed(1)}cp` : "n/a"}.`,
    `Success-signal attainment averages ${params.signalScore.toFixed(2)}.`,
  ];
  if (params.switchReason) {
    parts.push(params.switchReason);
  }
  parts.push(params.recommendation);
  return parts.join(" ");
}

function statusFromDecision(
  decision: ObjectiveLifecycleDecision,
  verdict: ObjectiveProgressVerdict
): ObjectiveStatus {
  if (decision === "switch") return "switched";
  if (decision === "retire") return "retired";
  if (decision === "promote") return "promoted";
  if (verdict === "progressing") return "improving";
  if (verdict === "holding") return "holding";
  if (verdict === "stalled") return "stalled";
  if (verdict === "regressing") return "regressing";
  return "active";
}

function buildNextAction(
  decision: ObjectiveLifecycleDecision,
  selectionObjective: TrainingObjective,
  phase: ObjectivePhase
): string {
  switch (decision) {
    case "promote":
      return `Advance ${selectionObjective.replace(/_/g, " ")} into ${phase} phase and keep a deeper exercise mix.`;
    case "repair":
      return `Stay on ${selectionObjective.replace(/_/g, " ")} but shift back into stabilize work until severe errors drop.`;
    case "switch":
      return `Switch the next sessions to ${selectionObjective.replace(/_/g, " ")} and watch the first two sessions for traction.`;
    case "retire":
      return `Retire the completed objective and redirect work into ${selectionObjective.replace(/_/g, " ")}.`;
    case "hold":
      return `Hold the current objective and require clearer evidence before changing phase.`;
    default:
      return `Continue the current objective and verify that the next session reinforces the same trend.`;
  }
}

function resolveSwitchTarget(
  override: ObjectiveLifecycleEscalationOverride,
  baseObjective: TrainingObjective,
  candidateScores: ObjectiveProgressInput["baseSelection"]["candidateScores"]
): TrainingObjective | null {
  if (override.targetObjective) return override.targetObjective;
  const nextCandidate = findNextObjectiveCandidate(candidateScores, baseObjective);
  return nextCandidate?.objective ?? null;
}

export function buildObjectiveSessionEvidence(
  input: ObjectiveSessionArtifactInput
): ObjectiveSessionEvidence | null {
  if (!input.trainingObjective || !input.objectivePhase) return null;

  const total = Math.max(input.analytics.totalExercises, 1);
  const exactRate = input.analytics.gradeDistribution.exact / total;
  const acceptableRate = input.analytics.gradeDistribution.acceptable / total;
  const mistakeRate = input.analytics.gradeDistribution.mistake / total;
  const blunderRate = input.analytics.gradeDistribution.blunder / total;
  const incorrect =
    input.analytics.gradeDistribution.inaccuracy +
    input.analytics.gradeDistribution.mistake +
    input.analytics.gradeDistribution.blunder +
    input.analytics.gradeDistribution.illegal;
  const accuracy = 1 - incorrect / total;

  return {
    sessionId: input.sessionId,
    completedAt: input.completedAt,
    objective: input.trainingObjective,
    objectivePhase: input.objectivePhase,
    accuracy: Number(accuracy.toFixed(4)),
    exactRate: Number(exactRate.toFixed(4)),
    acceptableRate: Number(acceptableRate.toFixed(4)),
    mistakeRate: Number(mistakeRate.toFixed(4)),
    blunderRate: Number(blunderRate.toFixed(4)),
    averageEvalLossCp: round(input.analytics.evalLossStats.average),
    objectiveStatus: input.objectiveStatus,
    objectiveProgressVerdict: input.objectiveProgressVerdict,
    objectiveDecision: input.objectiveDecision,
    objectiveEscalationVerdict: input.objectiveEscalationVerdict,
    objectiveEscalationStrength: input.objectiveEscalationStrength,
    objectiveInterventionType: input.objectiveInterventionType,
    objectiveInterventionStartedAt: input.objectiveInterventionStartedAt,
    objectiveRecommendationStrength: input.objectiveRecommendationStrength,
  };
}

export function deriveObjectiveHistory(
  sessionEvidence: ObjectiveSessionEvidence[]
): ObjectiveHistoryEntry[] {
  return [...sessionEvidence]
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
    .map((entry) => ({
      sessionId: entry.sessionId,
      completedAt: entry.completedAt,
      objective: entry.objective,
      objectivePhase: entry.objectivePhase,
      accuracy: entry.accuracy,
      exactRate: entry.exactRate,
      acceptableRate: entry.acceptableRate,
      mistakeRate: entry.mistakeRate,
      blunderRate: entry.blunderRate,
      averageEvalLossCp: entry.averageEvalLossCp,
      objectiveStatus: entry.objectiveStatus ?? null,
      objectiveProgressVerdict: entry.objectiveProgressVerdict ?? null,
      objectiveDecision: entry.objectiveDecision ?? null,
      objectiveEscalationVerdict: entry.objectiveEscalationVerdict ?? null,
      objectiveEscalationStrength: entry.objectiveEscalationStrength ?? null,
      objectiveInterventionType: entry.objectiveInterventionType ?? null,
      objectiveInterventionStartedAt: entry.objectiveInterventionStartedAt ?? null,
      objectiveRecommendationStrength: entry.objectiveRecommendationStrength ?? null,
    }));
}

export function deriveObjectiveLifecycle(
  input: ObjectiveProgressInput
): ObjectiveLifecycleResolution {
  const generatedAt = input.generatedAt ?? input.baseSelection.generatedAt;
  const priorObjective = input.priorProgress?.currentObjective ?? null;
  const baseObjective = input.baseSelection.currentObjective;
  const switchedBySelection = priorObjective !== null && priorObjective !== baseObjective;
  const objectiveForEvidence = switchedBySelection ? priorObjective ?? baseObjective : baseObjective;
  const episodeSessions = deriveEpisodeSessions(input.sessionEvidence, objectiveForEvidence, switchedBySelection);
  const { evidenceWindow, baselineWindow } = splitBaseline(episodeSessions);
  const signalSnapshots = signalAttainment(input);
  const signalScore = averageSignalAttainment(signalSnapshots);
  const reviewBurden = objectiveRelevantReviewBurden(input);
  const verdict = deriveProgressVerdict(input, evidenceWindow, baselineWindow, signalScore);

  let resolvedObjective = baseObjective;
  let resolvedPhase = input.baseSelection.objectivePhase;
  let lifecycleDecision: ObjectiveLifecycleDecision = "continue";
  let switchRecommendationReason: string | null = null;
  let promotionRecommendation = {
    recommended: false,
    targetPhase: null as ObjectivePhase | null,
    reason: null as string | null,
  };
  let retirementRecommendation = {
    recommended: false,
    reason: null as string | null,
  };
  let recommendationSentence = "The current objective still matches the strongest measured need.";

  const escalationOverride = input.escalationOverride ?? null;

  if (switchedBySelection) {
    lifecycleDecision = "switch";
    switchRecommendationReason = `Candidate scoring moved from ${priorObjective?.replace(/_/g, " ")} to ${baseObjective.replace(/_/g, " ")} based on current weakness, readiness, and curriculum evidence.`;
    recommendationSentence = `Switch because the highest-scoring objective is now ${baseObjective.replace(/_/g, " ")}.`;
  } else if (
    verdict === "completed" &&
    input.baseSelection.candidateScores.length > 1
  ) {
    const nextCandidate = findNextObjectiveCandidate(input.baseSelection.candidateScores, baseObjective);
    retirementRecommendation = {
      recommended: true,
      reason: `Success signals are met and severe errors are at or below ${OBJECTIVE_PROGRESS_CONFIG.retireMaxSevereRate.toFixed(2)} across ${evidenceWindow.sessionCount} sessions.`,
    };
    if (nextCandidate) {
      lifecycleDecision = "retire";
      resolvedObjective = nextCandidate.objective;
      switchRecommendationReason = `Retirement threshold was met, so the next-best objective ${resolvedObjective.replace(/_/g, " ")} becomes active.`;
      recommendationSentence = `Retire ${baseObjective.replace(/_/g, " ")} and redirect the next cycle into ${resolvedObjective.replace(/_/g, " ")}.`;
    } else {
      lifecycleDecision = "hold";
      recommendationSentence = "Retirement threshold was met, but there is no alternate objective candidate to activate yet.";
    }
  } else if (
    verdict === "progressing" &&
    evidenceWindow.sessionCount >= OBJECTIVE_PROGRESS_CONFIG.promoteMinSessions &&
    input.selectionInput.readiness.state === "ready_to_expand" &&
    input.baseSelection.objectivePhase !== "expand"
  ) {
    lifecycleDecision = "promote";
    resolvedPhase = nextPhase(input.baseSelection.objectivePhase);
    promotionRecommendation = {
      recommended: true,
      targetPhase: resolvedPhase,
      reason: `Recent sessions are improving and readiness is ${input.selectionInput.readiness.state}, so the same objective can move one phase deeper.`,
    };
    recommendationSentence = `Promote the same objective into ${resolvedPhase} phase.`;
  } else if (
    verdict === "regressing" &&
    input.selectionInput.readiness.state === "repair_mode"
  ) {
    lifecycleDecision = "repair";
    resolvedPhase = "stabilize";
    recommendationSentence = "Regression plus repair-mode readiness pulls the objective back into stabilize work.";
  } else if (verdict === "holding" || verdict === "stalled") {
    lifecycleDecision = "hold";
    recommendationSentence = verdict === "stalled"
      ? "Measured signals are not improving enough to justify a phase change or objective switch yet."
      : "Hold steady while the current objective continues to collect evidence.";
  }

  if (escalationOverride) {
    recommendationSentence = escalationOverride.reason;
    switchRecommendationReason = escalationOverride.explanation;

    if (escalationOverride.verdict === "continue_current_objective") {
      lifecycleDecision = "continue";
      resolvedObjective = escalationOverride.targetObjective ?? baseObjective;
      resolvedPhase = escalationOverride.targetPhase ?? input.baseSelection.objectivePhase;
    } else if (escalationOverride.verdict === "hold_current_objective") {
      lifecycleDecision = "hold";
      resolvedObjective = escalationOverride.targetObjective ?? baseObjective;
      resolvedPhase = escalationOverride.targetPhase ?? input.baseSelection.objectivePhase;
    } else if (escalationOverride.verdict === "promote_objective_phase") {
      lifecycleDecision = "promote";
      resolvedObjective = escalationOverride.targetObjective ?? baseObjective;
      resolvedPhase = escalationOverride.targetPhase ?? nextPhase(input.baseSelection.objectivePhase);
      promotionRecommendation = {
        recommended: true,
        targetPhase: resolvedPhase,
        reason: escalationOverride.reason,
      };
    } else if (escalationOverride.verdict === "switch_objective") {
      const overrideTarget = resolveSwitchTarget(
        escalationOverride,
        baseObjective,
        input.baseSelection.candidateScores
      );
      if (overrideTarget) {
        lifecycleDecision = "switch";
        resolvedObjective = overrideTarget;
        resolvedPhase = escalationOverride.targetPhase ?? input.baseSelection.objectivePhase;
      } else {
        lifecycleDecision = "hold";
      }
    } else if (escalationOverride.verdict === "retire_objective") {
      const overrideTarget = resolveSwitchTarget(
        escalationOverride,
        baseObjective,
        input.baseSelection.candidateScores
      );
      retirementRecommendation = {
        recommended: true,
        reason: escalationOverride.reason,
      };
      if (overrideTarget) {
        lifecycleDecision = "retire";
        resolvedObjective = overrideTarget;
        resolvedPhase = escalationOverride.targetPhase ?? input.baseSelection.objectivePhase;
      } else {
        lifecycleDecision = "hold";
      }
    } else if (escalationOverride.verdict === "revert_to_repair_mode") {
      lifecycleDecision = "repair";
      resolvedObjective = escalationOverride.targetObjective ?? baseObjective;
      resolvedPhase = "stabilize";
    }
  }

  const resolvedSelection = buildObjectiveSelectionSnapshot(
    {
      ...input.selectionInput,
      generatedAt,
    },
    resolvedObjective,
    input.baseSelection.candidateScores,
    resolvedPhase
  );

  const switchedNow = lifecycleDecision === "switch" || lifecycleDecision === "retire";
  const currentEpisode = deriveEpisodeSessions(input.sessionEvidence, resolvedObjective, switchedNow);
  const startedAt = currentEpisode.length > 0 ? currentEpisode[0].completedAt : generatedAt;
  const progressStatus = statusFromDecision(lifecycleDecision, verdict);
  const progress: ObjectiveProgressState = {
    generatedAt,
    currentObjective: resolvedObjective,
    previousObjective: priorObjective,
    startedAt,
    activeDays: daysBetween(startedAt, generatedAt),
    lastEvaluatedAt: generatedAt,
    sessionsOnObjective: currentEpisode.length,
    recentObjectiveSessions: currentEpisode.slice(-OBJECTIVE_PROGRESS_CONFIG.recentWindow),
    objectiveStatus: progressStatus,
    objectivePhase: resolvedPhase,
    successSignalSnapshots: signalSnapshots,
    progressVerdict: verdict,
    lifecycleDecision,
    objectiveDecisionReason: deriveDecisionReason({
      evidenceWindow,
      baselineWindow,
      signalScore,
      switchReason: switchRecommendationReason,
      recommendation: `${recommendationSentence} Objective-relevant review burden is ${reviewBurden.toFixed(2)}.`,
    }),
    promotionRecommendation,
    retirementRecommendation,
    switchRecommendationReason,
    nextRecommendedAction: buildNextAction(lifecycleDecision, resolvedObjective, resolvedPhase),
    evidenceWindow,
    baselineWindow,
  };

  return {
    selection: resolvedSelection,
    progress,
  };
}



