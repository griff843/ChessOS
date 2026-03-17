/**
 * Evaluate coaching memory for a repair target.
 *
 * Layers on top of RepairEvidence by incorporating whether targeted
 * training sessions have been launched and what happened in subsequent
 * games. Pure function — no I/O.
 *
 * v2 (M008): optionally incorporates per-session target-accuracy evidence
 * to provide a more direct practice-performance signal.
 */

import type {
  RepairTarget,
  RepairEvidence,
  DiagnosisHistoryEntry,
  TargetedSessionSummary,
  CoachingPersistenceState,
  CoachingEmphasis,
  CoachingMemory,
  SessionPerformanceBand,
  TargetAccuracySummary,
} from "./types.js";
import { pickMostInformativeAccuracy } from "./evaluate-target-accuracy.js";

// ── Target Labels ───────────────────────────────────────────────────

const TARGET_LABELS: Record<RepairTarget, string> = {
  opening_line_recall: "opening line recall",
  opening_concept_understanding: "opening concept understanding",
  calculation_discipline: "calculation discipline",
  tactical_pattern_recognition: "tactical pattern recognition",
  candidate_move_generation: "candidate move generation",
  strategic_planning: "strategic planning",
  time_management: "time management",
  endgame_technique: "endgame technique",
  practical_stabilization: "practical stabilization",
};

// ── Post-training recurrence threshold ──────────────────────────────

/** Rate at or above which the weakness is classified as persistent. */
const PERSISTENT_RATE_THRESHOLD = 0.3;

/** Minimum post-training games to make a confident judgment. */
const MIN_POST_TRAINING_GAMES = 2;

// ── Main Function ───────────────────────────────────────────────────

/**
 * Evaluate coaching memory for a repair target.
 *
 * @param target - The repair target to evaluate.
 * @param gameId - The current game (excluded from post-training counts).
 * @param evidence - Pre-computed frequency-based evidence from evaluateRepairEvidence.
 * @param targetedSessions - All sessions with reviewTargeting metadata.
 * @param diagnosisHistory - All diagnosed games, each with primaryTarget and diagnosedAt.
 * @param sessionAccuracies - Optional per-session target-accuracy summaries (M008).
 *   When provided, the most informative one enriches the memory judgment conservatively.
 *   Absence or insufficient data does not change the core classification.
 */
export function evaluateCoachingMemory(
  target: RepairTarget,
  gameId: string,
  evidence: RepairEvidence,
  targetedSessions: TargetedSessionSummary[],
  diagnosisHistory: DiagnosisHistoryEntry[],
  sessionAccuracies: TargetAccuracySummary[] = []
): CoachingMemory {
  const label = TARGET_LABELS[target];

  // Pick the most informative accuracy signal (if any)
  const bestAccuracy = pickMostInformativeAccuracy(sessionAccuracies);

  // 1. First occurrence — never seen before
  if (evidence.totalOccurrences === 0) {
    return build(target, gameId, evidence, {
      persistenceState: "first_occurrence",
      targetedSessionCount: 0,
      mostRecentTargetedSessionAt: null,
      gamesAfterTraining: 0,
      recurrencesAfterTraining: 0,
      confidence: "low",
      explanation: `This is the first time ${label} has appeared.`,
      recommendedEmphasis: "monitor",
    });
  }

  // 2. Filter targeted sessions to those matching this target
  const matchingSessions = targetedSessions.filter(
    (s) => s.primaryTarget === target
  );

  // 3. No targeted sessions exist for this target
  if (matchingSessions.length === 0) {
    if (evidence.totalOccurrences <= 2) {
      return build(target, gameId, evidence, {
        persistenceState: "emerging",
        targetedSessionCount: 0,
        mostRecentTargetedSessionAt: null,
        gamesAfterTraining: 0,
        recurrencesAfterTraining: 0,
        confidence: evidence.totalOccurrences >= 2 ? "moderate" : "low",
        explanation: `${capitalize(label)} has appeared ${evidence.totalOccurrences} time${evidence.totalOccurrences === 1 ? "" : "s"} before but is not yet a clear pattern.`,
        recommendedEmphasis: "monitor",
      });
    }

    return build(target, gameId, evidence, {
      persistenceState: "recurring_no_training",
      targetedSessionCount: 0,
      mostRecentTargetedSessionAt: null,
      gamesAfterTraining: 0,
      recurrencesAfterTraining: 0,
      confidence: evidence.totalOccurrences >= 3 ? "high" : "moderate",
      explanation: `${capitalize(label)} has appeared ${evidence.totalOccurrences} times. No targeted training sessions have been launched for it yet.`,
      recommendedEmphasis: "increase",
    });
  }

  // 4. Targeted sessions exist — compute post-training analysis
  const sortedSessions = [...matchingSessions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const mostRecentSession = sortedSessions[0];
  const mostRecentDate = new Date(mostRecentSession.createdAt).getTime();

  // Games diagnosed AFTER the most recent targeted session, excluding current
  const priorDiagnoses = diagnosisHistory.filter(
    (h) => h.gameId !== gameId
  );
  const gamesAfterTraining = priorDiagnoses.filter(
    (h) => new Date(h.diagnosedAt).getTime() > mostRecentDate
  ).length;
  const recurrencesAfterTraining = priorDiagnoses.filter(
    (h) =>
      new Date(h.diagnosedAt).getTime() > mostRecentDate &&
      h.primaryTarget === target
  ).length;

  const sessionCount = matchingSessions.length;
  const sessionWord = sessionCount === 1 ? "session" : "sessions";

  // Too few post-training games to judge — accuracy is the primary available signal
  if (gamesAfterTraining < MIN_POST_TRAINING_GAMES) {
    const baseExplanation = `Targeted training was launched (${sessionCount} ${sessionWord}), but too few games have been analyzed since to judge effectiveness.`;
    const accuracyNote = buildLimitedDataAccuracyNote(bestAccuracy);
    return build(target, gameId, evidence, {
      persistenceState: "recurring_limited_data",
      targetedSessionCount: sessionCount,
      mostRecentTargetedSessionAt: mostRecentSession.createdAt,
      gamesAfterTraining,
      recurrencesAfterTraining,
      confidence: "low",
      explanation: accuracyNote
        ? `${baseExplanation} ${accuracyNote}`
        : baseExplanation,
      recommendedEmphasis: "maintain",
      sessionPerformanceBand: bestAccuracy?.performanceBand,
      sessionPerformanceNote: accuracyNote ?? undefined,
    });
  }

  // Compute post-training rate
  const rate = recurrencesAfterTraining / gamesAfterTraining;

  if (rate < PERSISTENT_RATE_THRESHOLD) {
    const detail =
      recurrencesAfterTraining === 0
        ? "has not reappeared"
        : "shows reduced frequency";
    const baseExplanation = `Targeted training was launched (${sessionCount} ${sessionWord}). In ${gamesAfterTraining} game${gamesAfterTraining === 1 ? "" : "s"} since, this weakness ${detail} — positive trend.`;
    const accuracyNote = buildImprovingAccuracyNote(bestAccuracy);
    return build(target, gameId, evidence, {
      persistenceState: "improving_after_training",
      targetedSessionCount: sessionCount,
      mostRecentTargetedSessionAt: mostRecentSession.createdAt,
      gamesAfterTraining,
      recurrencesAfterTraining,
      confidence: gamesAfterTraining >= 3 ? "high" : "moderate",
      explanation: accuracyNote
        ? `${baseExplanation} ${accuracyNote}`
        : baseExplanation,
      recommendedEmphasis: "reduce",
      sessionPerformanceBand: bestAccuracy?.performanceBand,
      sessionPerformanceNote: accuracyNote ?? undefined,
    });
  }

  const baseExplanation = `Despite ${sessionCount} targeted ${sessionWord}, this weakness appeared in ${recurrencesAfterTraining} of ${gamesAfterTraining} game${gamesAfterTraining === 1 ? "" : "s"} since. Consider continued emphasis.`;
  const accuracyNote = buildPersistentAccuracyNote(bestAccuracy);
  return build(target, gameId, evidence, {
    persistenceState: "persistent_despite_training",
    targetedSessionCount: sessionCount,
    mostRecentTargetedSessionAt: mostRecentSession.createdAt,
    gamesAfterTraining,
    recurrencesAfterTraining,
    confidence: gamesAfterTraining >= 3 ? "high" : "moderate",
    explanation: accuracyNote
      ? `${baseExplanation} ${accuracyNote}`
      : baseExplanation,
    recommendedEmphasis: "increase",
    sessionPerformanceBand: bestAccuracy?.performanceBand,
    sessionPerformanceNote: accuracyNote ?? undefined,
  });
}

// ── Accuracy note builders ───────────────────────────────────────────
// One per persistence state. Each is conservative: returns null when
// accuracy is absent or insufficient_data.

/**
 * Note for recurring_limited_data: accuracy is the primary available signal.
 */
function buildLimitedDataAccuracyNote(
  accuracy: TargetAccuracySummary | null
): string | null {
  if (!accuracy || accuracy.performanceBand === "insufficient_data") return null;
  switch (accuracy.performanceBand) {
    case "strong":
      return "Session practice accuracy was strong — watch future games for improvement.";
    case "mixed":
      return "Session practice accuracy was mixed — continue targeted training.";
    case "weak":
      return "Session practice accuracy was weak — training may not yet be taking effect. Continued emphasis recommended.";
  }
}

/**
 * Note for improving_after_training: accuracy is supplementary evidence.
 */
function buildImprovingAccuracyNote(
  accuracy: TargetAccuracySummary | null
): string | null {
  if (!accuracy || accuracy.performanceBand === "insufficient_data") return null;
  switch (accuracy.performanceBand) {
    case "strong":
      return "Session accuracy was also strong, further supporting improvement.";
    case "mixed":
      return "Note: session accuracy was mixed despite the positive game trend.";
    case "weak":
      return "Note: session accuracy on this weakness was weak despite the positive game trend.";
  }
}

/**
 * Note for persistent_despite_training: accuracy distinguishes two failure modes.
 */
function buildPersistentAccuracyNote(
  accuracy: TargetAccuracySummary | null
): string | null {
  if (!accuracy || accuracy.performanceBand === "insufficient_data") return null;
  switch (accuracy.performanceBand) {
    case "strong":
      return "Session accuracy was strong, but the weakness still appears in games — technique may not yet transfer to competitive play.";
    case "mixed":
      return "Session accuracy was mixed — continued training with varied approaches may help.";
    case "weak":
      return "Session accuracy was also weak — consider adjusting the training approach.";
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface PartialMemory {
  persistenceState: CoachingPersistenceState;
  targetedSessionCount: number;
  mostRecentTargetedSessionAt: string | null;
  gamesAfterTraining: number;
  recurrencesAfterTraining: number;
  confidence: "high" | "moderate" | "low";
  explanation: string;
  recommendedEmphasis: CoachingEmphasis;
  sessionPerformanceBand?: SessionPerformanceBand;
  sessionPerformanceNote?: string;
}

function build(
  target: RepairTarget,
  gameId: string,
  evidence: RepairEvidence,
  partial: PartialMemory
): CoachingMemory {
  const result: CoachingMemory = {
    target,
    gameId,
    evidence,
    persistenceState: partial.persistenceState,
    targetedSessionCount: partial.targetedSessionCount,
    mostRecentTargetedSessionAt: partial.mostRecentTargetedSessionAt,
    gamesAfterTraining: partial.gamesAfterTraining,
    recurrencesAfterTraining: partial.recurrencesAfterTraining,
    confidence: partial.confidence,
    explanation: partial.explanation,
    recommendedEmphasis: partial.recommendedEmphasis,
  };
  if (partial.sessionPerformanceBand !== undefined) {
    result.sessionPerformanceBand = partial.sessionPerformanceBand;
  }
  if (partial.sessionPerformanceNote !== undefined) {
    result.sessionPerformanceNote = partial.sessionPerformanceNote;
  }
  return result;
}
