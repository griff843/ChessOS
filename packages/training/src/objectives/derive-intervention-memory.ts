import type { StudySession } from "../sessions/types";
import type {
  InterventionCompareSnapshot,
  InterventionEffectivenessAction,
  InterventionEffectivenessOutcome,
  InterventionEpisodeMemory,
  InterventionFamilyPerformance,
  InterventionMemoryState,
  InterventionPatternSnapshot,
  InterventionSignalSnapshot,
  InterventionSignalSnapshotSeed,
  ObjectiveInterventionType,
  ObjectivePerformanceWindow,
  ObjectiveRecommendationStrength,
  ObjectiveSessionEvidence,
  ObjectiveSuccessSignalSnapshot,
  TrainingObjective,
} from "./types";

const MEMORY_CONFIG = {
  compareWindow: 3,
  repeatedFailureThreshold: 2,
  hardSwitchThreshold: 3,
} as const;

function round(value: number | null): number | null {
  if (value === null) return null;
  return Number(value.toFixed(4));
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

function severeRate(window: ObjectivePerformanceWindow): number | null {
  if (window.mistakeRate === null && window.blunderRate === null) return null;
  return round((window.mistakeRate ?? 0) + (window.blunderRate ?? 0));
}

function summarizeDelta(label: string, beforeValue: number | null, afterValue: number | null, suffix = ""): string {
  return `${label} ${afterValue !== null ? `${afterValue.toFixed(2)}${suffix}` : "n/a"} vs ${beforeValue !== null ? `${beforeValue.toFixed(2)}${suffix}` : "n/a"}`;
}

function buildEpisodeId(objective: TrainingObjective, type: ObjectiveInterventionType, startedAt: string): string {
  const key = `${objective}|${type}|${startedAt}`;
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = ((hash << 5) - hash + key.charCodeAt(index)) | 0;
  }
  return `episode-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function outcomeScore(outcome: InterventionEffectivenessOutcome): number {
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

function resolveOutcome(
  improvedCount: number,
  worsenedCount: number,
  sampleSize: number,
  regressed: boolean
): InterventionEffectivenessOutcome {
  if (sampleSize === 0) return "inconclusive";
  if (regressed || worsenedCount >= 2) return "regressed";
  if (improvedCount >= 3 && worsenedCount === 0) return "effective";
  if (improvedCount >= 1 && worsenedCount <= 1) return "partially_effective";
  if (improvedCount === 0 && worsenedCount >= 1) return "ineffective";
  return "inconclusive";
}

function resolveStrength(sampleSize: number): ObjectiveRecommendationStrength {
  if (sampleSize >= 3) return "high";
  if (sampleSize >= 2) return "medium";
  return "low";
}

function aggregateObjectiveSignals(seeds: InterventionSignalSnapshotSeed[]): ObjectiveSuccessSignalSnapshot[] {
  const byMetric = new Map<string, ObjectiveSuccessSignalSnapshot[]>();
  for (const seed of seeds) {
    for (const signal of seed.objectivePerformanceSignals) {
      const entries = byMetric.get(signal.metric) ?? [];
      entries.push(signal);
      byMetric.set(signal.metric, entries);
    }
  }

  return Array.from(byMetric.entries()).map(([metric, entries]) => {
    const sample = entries[entries.length - 1];
    const currentValue = average(entries.map((entry) => entry.currentValue)) ?? sample.currentValue;
    const attainment = average(entries.map((entry) => entry.attainment)) ?? sample.attainment;
    const metCount = entries.filter((entry) => entry.met).length;
    return {
      ...sample,
      metric,
      capturedAt: sample.capturedAt,
      currentValue: Number(currentValue.toFixed(4)),
      attainment: Number(attainment.toFixed(4)),
      met: metCount >= Math.ceil(entries.length / 2),
    };
  });
}

function aggregatePatternRecurrence(seeds: InterventionSignalSnapshotSeed[]): InterventionPatternSnapshot[] {
  const byCategory = new Map<string, InterventionPatternSnapshot>();
  for (const seed of seeds) {
    for (const pattern of seed.patternRecurrence) {
      const current = byCategory.get(pattern.category);
      if (!current || pattern.recurrenceScore > current.recurrenceScore) {
        byCategory.set(pattern.category, pattern);
      }
    }
  }
  return Array.from(byCategory.values()).sort((a, b) => b.recurrenceScore - a.recurrenceScore);
}

function mostCommonReadinessState(seeds: InterventionSignalSnapshotSeed[]): string | null {
  if (seeds.length === 0) return null;
  const counts = new Map<string, number>();
  for (const seed of seeds) {
    counts.set(seed.readinessState, (counts.get(seed.readinessState) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}

function buildSignalSnapshot(
  entries: ObjectiveSessionEvidence[],
  seeds: InterventionSignalSnapshotSeed[]
): InterventionSignalSnapshot {
  const window = buildPerformanceWindow(entries);
  return {
    readinessState: mostCommonReadinessState(seeds),
    reviewBurdenShare: round(average(seeds.map((seed) => seed.reviewBurdenShare).filter((value) => Number.isFinite(value)))),
    recurrencePressure: round(average(seeds.map((seed) => seed.recurrencePressure).filter((value) => Number.isFinite(value)))),
    gradeDistribution: {
      accuracy: window.averageAccuracy,
      exactRate: window.exactRate,
      acceptableRate: window.acceptableRate,
      mistakeRate: window.mistakeRate,
      blunderRate: window.blunderRate,
      severeRate: severeRate(window),
    },
    evalLossProfile: {
      averageEvalLossCp: window.averageEvalLossCp,
    },
    objectivePerformanceSignals: aggregateObjectiveSignals(seeds),
    patternRecurrence: aggregatePatternRecurrence(seeds),
  };
}

function buildCompareSnapshot(
  preSnapshot: InterventionSignalSnapshot,
  postSnapshot: InterventionSignalSnapshot
): InterventionCompareSnapshot {
  const accuracyDelta =
    preSnapshot.gradeDistribution.accuracy !== null && postSnapshot.gradeDistribution.accuracy !== null
      ? round(postSnapshot.gradeDistribution.accuracy - preSnapshot.gradeDistribution.accuracy)
      : null;
  const severeRateDelta =
    preSnapshot.gradeDistribution.severeRate !== null && postSnapshot.gradeDistribution.severeRate !== null
      ? round(postSnapshot.gradeDistribution.severeRate - preSnapshot.gradeDistribution.severeRate)
      : null;
  const evalLossDelta =
    preSnapshot.evalLossProfile.averageEvalLossCp !== null && postSnapshot.evalLossProfile.averageEvalLossCp !== null
      ? round(preSnapshot.evalLossProfile.averageEvalLossCp - postSnapshot.evalLossProfile.averageEvalLossCp)
      : null;
  const reviewBurdenDelta =
    preSnapshot.reviewBurdenShare !== null && postSnapshot.reviewBurdenShare !== null
      ? round(postSnapshot.reviewBurdenShare - preSnapshot.reviewBurdenShare)
      : null;
  const recurrencePressureDelta =
    preSnapshot.recurrencePressure !== null && postSnapshot.recurrencePressure !== null
      ? round(postSnapshot.recurrencePressure - preSnapshot.recurrencePressure)
      : null;

  return {
    label: "episode_post_vs_pre",
    summary: [
      summarizeDelta("accuracy", preSnapshot.gradeDistribution.accuracy, postSnapshot.gradeDistribution.accuracy),
      summarizeDelta("severe rate", preSnapshot.gradeDistribution.severeRate, postSnapshot.gradeDistribution.severeRate),
      summarizeDelta("eval loss", preSnapshot.evalLossProfile.averageEvalLossCp, postSnapshot.evalLossProfile.averageEvalLossCp, "cp"),
    ].join(", "),
    accuracyDelta,
    severeRateDelta,
    evalLossDelta,
    reviewBurdenDelta,
    recurrencePressureDelta,
  };
}

function reverseInterventionType(type: ObjectiveInterventionType): ObjectiveInterventionType {
  switch (type) {
    case "increase_challenge":
    case "promote_to_next_phase":
      return "reduce_stretch_load";
    case "reduce_stretch_load":
      return "hold_current_plan";
    case "shift_to_visualization_support":
      return "increase_review_share";
    case "reinforce_pattern_repair":
      return "increase_review_share";
    default:
      return "hold_current_plan";
  }
}

function detectOscillation(episodes: InterventionEpisodeMemory[]): { detected: boolean; summary: string | null } {
  if (episodes.length < 4) {
    return { detected: false, summary: null };
  }

  const recent = episodes.slice(-4).map((episode) => episode.interventionType);
  const oscillating = recent[0] === recent[2] && recent[1] === recent[3] && recent[0] !== recent[1];
  return oscillating
    ? {
        detected: true,
        summary: `Interventions are oscillating between ${recent[0].replace(/_/g, " ")} and ${recent[1].replace(/_/g, " ")} without settling.`,
      }
    : { detected: false, summary: null };
}

function choosePreferredAlternative(
  currentType: ObjectiveInterventionType,
  familyPerformance: InterventionFamilyPerformance[]
): ObjectiveInterventionType | null {
  const current = familyPerformance.find((entry) => entry.interventionType === currentType);
  const alternatives = familyPerformance
    .filter((entry) => entry.interventionType !== currentType && entry.averageOutcomeScore > 0)
    .sort((a, b) => b.averageOutcomeScore - a.averageOutcomeScore || b.episodeCount - a.episodeCount);

  if (alternatives.length === 0) return null;
  if (!current || alternatives[0].averageOutcomeScore > current.averageOutcomeScore) {
    return alternatives[0].interventionType;
  }
  return null;
}

function buildFamilyPerformance(episodes: InterventionEpisodeMemory[]): InterventionFamilyPerformance[] {
  const grouped = new Map<ObjectiveInterventionType, InterventionEpisodeMemory[]>();
  for (const episode of episodes) {
    const entries = grouped.get(episode.interventionType) ?? [];
    entries.push(episode);
    grouped.set(episode.interventionType, entries);
  }

  return Array.from(grouped.entries())
    .map(([interventionType, entries]) => ({
      interventionType,
      episodeCount: entries.length,
      latestOutcome: entries[entries.length - 1]?.outcome ?? "inconclusive",
      averageOutcomeScore: Number((average(entries.map((entry) => outcomeScore(entry.outcome))) ?? 0).toFixed(4)),
      improvingEpisodes: entries.filter((entry) => outcomeScore(entry.outcome) > 0).length,
      worseningEpisodes: entries.filter((entry) => outcomeScore(entry.outcome) < 0).length,
    }))
    .sort((a, b) => b.averageOutcomeScore - a.averageOutcomeScore || b.episodeCount - a.episodeCount);
}

function resolveEpisodeRecommendation(args: {
  episode: InterventionEpisodeMemory;
  familyPerformance: InterventionFamilyPerformance[];
  repeatedFailures: number;
  oscillationDetected: boolean;
}): { action: InterventionEffectivenessAction; nextIntervention: ObjectiveInterventionType | null } {
  const preferredAlternative = choosePreferredAlternative(args.episode.interventionType, args.familyPerformance);
  const score = outcomeScore(args.episode.outcome);

  if (args.repeatedFailures >= MEMORY_CONFIG.hardSwitchThreshold || (args.oscillationDetected && score < 0 && args.repeatedFailures >= MEMORY_CONFIG.repeatedFailureThreshold)) {
    return { action: "switch_objective", nextIntervention: "switch_objective" };
  }

  if (args.repeatedFailures >= MEMORY_CONFIG.repeatedFailureThreshold) {
    if (preferredAlternative) {
      return { action: "replace", nextIntervention: preferredAlternative };
    }
    return { action: "reverse", nextIntervention: reverseInterventionType(args.episode.interventionType) };
  }

  switch (args.episode.outcome) {
    case "effective":
      return { action: "continue", nextIntervention: args.episode.interventionType };
    case "partially_effective":
      return { action: "strengthen", nextIntervention: args.episode.interventionType };
    case "regressed":
      return { action: "reverse", nextIntervention: reverseInterventionType(args.episode.interventionType) };
    case "ineffective":
      return { action: preferredAlternative ? "replace" : "reverse", nextIntervention: preferredAlternative ?? reverseInterventionType(args.episode.interventionType) };
    default:
      return { action: "continue", nextIntervention: args.episode.interventionType };
  }
}

function buildRepeatedPatternWarnings(episodes: InterventionEpisodeMemory[]): string[] {
  const warnings: string[] = [];
  const grouped = new Map<ObjectiveInterventionType, InterventionEpisodeMemory[]>();
  for (const episode of episodes) {
    const entries = grouped.get(episode.interventionType) ?? [];
    entries.push(episode);
    grouped.set(episode.interventionType, entries);
  }

  for (const [type, entries] of grouped.entries()) {
    const failing = entries.filter((entry) => outcomeScore(entry.outcome) < 0);
    if (failing.length >= MEMORY_CONFIG.repeatedFailureThreshold) {
      warnings.push(`${type.replace(/_/g, " ")} has failed ${failing.length} times on ${entries[0]?.objectiveKey.replace(/_/g, " ")}.`);
    }
  }

  return warnings;
}

export function buildInterventionSignalSnapshotSeed(args: {
  readinessState: string;
  reviewBurdenShare: number;
  recurrencePressure: number;
  patternRecurrence: InterventionPatternSnapshot[];
  objectivePerformanceSignals: ObjectiveSuccessSignalSnapshot[];
}): InterventionSignalSnapshotSeed {
  return {
    readinessState: args.readinessState as InterventionSignalSnapshotSeed["readinessState"],
    reviewBurdenShare: Number(args.reviewBurdenShare.toFixed(4)),
    recurrencePressure: Number(args.recurrencePressure.toFixed(4)),
    patternRecurrence: args.patternRecurrence,
    objectivePerformanceSignals: args.objectivePerformanceSignals,
  };
}

export function deriveInterventionMemory(args: {
  generatedAt: string;
  currentObjective: TrainingObjective;
  sessionEvidence: ObjectiveSessionEvidence[];
  sessions: StudySession[];
}): InterventionMemoryState {
  const objectiveSessions = args.sessions
    .filter(
      (session) =>
        session.metadata.trainingObjective === args.currentObjective &&
        session.metadata.objectiveInterventionType &&
        session.metadata.objectiveInterventionStartedAt
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const evidenceBySessionId = new Map(args.sessionEvidence.map((entry) => [entry.sessionId, entry]));
  const groups = new Map<string, StudySession[]>();
  for (const session of objectiveSessions) {
    const key = `${session.metadata.objectiveInterventionType}|${session.metadata.objectiveInterventionStartedAt}`;
    const entries = groups.get(key) ?? [];
    entries.push(session);
    groups.set(key, entries);
  }

  const draftEpisodes: InterventionEpisodeMemory[] = [];
  for (const sessions of groups.values()) {
    const type = sessions[0]?.metadata.objectiveInterventionType;
    const startedAt = sessions[0]?.metadata.objectiveInterventionStartedAt;
    if (!type || !startedAt) continue;

    const postEntries = sessions
      .map((session) => evidenceBySessionId.get(session.sessionId))
      .filter((entry): entry is ObjectiveSessionEvidence => Boolean(entry));
    if (postEntries.length === 0) continue;

    const preEntries = args.sessionEvidence
      .filter((entry) => entry.objective === args.currentObjective && entry.completedAt < startedAt)
      .slice(-MEMORY_CONFIG.compareWindow);
    const preSeeds = args.sessions
      .filter(
        (session) =>
          session.metadata.trainingObjective === args.currentObjective &&
          session.createdAt < startedAt &&
          session.metadata.objectiveSignalSnapshot
      )
      .slice(-MEMORY_CONFIG.compareWindow)
      .map((session) => session.metadata.objectiveSignalSnapshot!) ;
    const postSeeds = sessions
      .map((session) => session.metadata.objectiveSignalSnapshot)
      .filter((seed): seed is InterventionSignalSnapshotSeed => Boolean(seed));

    const preSnapshot = buildSignalSnapshot(preEntries, preSeeds);
    const postSnapshot = buildSignalSnapshot(postEntries, postSeeds);
    const compareSnapshot = buildCompareSnapshot(preSnapshot, postSnapshot);

    const improvedCount = [
      compareSnapshot.accuracyDelta !== null && compareSnapshot.accuracyDelta > 0.02,
      compareSnapshot.severeRateDelta !== null && compareSnapshot.severeRateDelta < -0.02,
      compareSnapshot.evalLossDelta !== null && compareSnapshot.evalLossDelta > 10,
      compareSnapshot.recurrencePressureDelta !== null && compareSnapshot.recurrencePressureDelta < -0.2,
    ].filter(Boolean).length;
    const worsenedCount = [
      compareSnapshot.accuracyDelta !== null && compareSnapshot.accuracyDelta < -0.02,
      compareSnapshot.severeRateDelta !== null && compareSnapshot.severeRateDelta > 0.02,
      compareSnapshot.evalLossDelta !== null && compareSnapshot.evalLossDelta < -10,
      compareSnapshot.recurrencePressureDelta !== null && compareSnapshot.recurrencePressureDelta > 0.2,
    ].filter(Boolean).length;
    const regressed = (postSnapshot.gradeDistribution.severeRate ?? 0) > (preSnapshot.gradeDistribution.severeRate ?? 0) + 0.05;

    draftEpisodes.push({
      interventionEpisodeId: buildEpisodeId(args.currentObjective, type, startedAt),
      interventionType: type,
      objectiveKey: args.currentObjective,
      startedAt,
      evaluatedAt: postEntries[postEntries.length - 1]?.completedAt ?? args.generatedAt,
      preSnapshot,
      postSnapshot,
      compareSnapshot,
      outcome: resolveOutcome(improvedCount, worsenedCount, postEntries.length, regressed),
      outcomeStrength: resolveStrength(postEntries.length),
      repeatedPatternFlag: false,
      recommendedNextAction: "continue",
      recommendedNextIntervention: type,
    });
  }

  draftEpisodes.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const oscillation = detectOscillation(draftEpisodes);
  const familyPerformance = buildFamilyPerformance(draftEpisodes);

  const episodes = draftEpisodes.map((episode, index) => {
    const repeatedFailures = draftEpisodes
      .slice(0, index + 1)
      .filter(
        (candidate) =>
          candidate.interventionType === episode.interventionType &&
          outcomeScore(candidate.outcome) < 0
      ).length;
    const recommendation = resolveEpisodeRecommendation({
      episode,
      familyPerformance,
      repeatedFailures,
      oscillationDetected: oscillation.detected,
    });
    return {
      ...episode,
      repeatedPatternFlag: repeatedFailures >= MEMORY_CONFIG.repeatedFailureThreshold,
      recommendedNextAction: recommendation.action,
      recommendedNextIntervention: recommendation.nextIntervention,
    };
  });

  const latestEpisode = episodes[episodes.length - 1] ?? null;
  const preferredInterventionType = latestEpisode
    ? choosePreferredAlternative(latestEpisode.interventionType, familyPerformance)
    : null;

  return {
    generatedAt: args.generatedAt,
    currentObjective: args.currentObjective,
    episodes,
    recentEpisodes: episodes.slice(-5).reverse(),
    repeatedPatternWarnings: buildRepeatedPatternWarnings(episodes),
    oscillationDetected: oscillation.detected,
    oscillationSummary: oscillation.summary,
    familyPerformance,
    betterPriorIntervention: {
      currentInterventionType: latestEpisode?.interventionType ?? null,
      preferredInterventionType,
      reason:
        latestEpisode && preferredInterventionType
          ? `${preferredInterventionType.replace(/_/g, " ")} has outperformed ${latestEpisode.interventionType.replace(/_/g, " ")} across prior episodes.`
          : null,
    },
    nextActionRecommendation: latestEpisode
      ? {
          action: latestEpisode.recommendedNextAction,
          interventionType: latestEpisode.recommendedNextIntervention,
          reason:
            latestEpisode.recommendedNextAction === "switch_objective"
              ? "Repeated intervention failure now justifies switching objectives."
              : latestEpisode.repeatedPatternFlag
                ? "Repeated ineffective intervention cycles justify a stronger response."
                : latestEpisode.compareSnapshot.summary,
        }
      : {
          action: "continue",
          interventionType: null,
          reason: "No evaluated intervention episodes are available yet.",
        },
  };
}

