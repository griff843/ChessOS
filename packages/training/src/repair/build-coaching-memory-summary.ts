/**
 * Build a bounded cross-game coaching memory summary.
 *
 * Aggregates CoachingMemory evaluations across all available game
 * diagnoses into a single interpretable summary for the coach surface.
 *
 * Pure function — no I/O, deterministic.
 */

import type {
  RepairTarget,
  DiagnosisHistoryEntry,
  TargetedSessionSummary,
  CoachingMemoryEntry,
  CoachingMemorySummary,
  CoachingPersistenceState,
  MemorySummaryReadiness,
} from "./types.js";
import { evaluateRepairEvidence } from "./evaluate-repair-evidence.js";
import { evaluateCoachingMemory } from "./evaluate-coaching-memory.js";
import { ALL_REPAIR_TARGETS } from "./repair-target-matching.js";

// ── Constants ────────────────────────────────────────────────────────

/** Minimum analyzed games to call readiness "ready". */
const MIN_GAMES_FOR_SUMMARY = 5;

/** Maximum number of entries in topPriorities. */
const MAX_TOP_PRIORITIES = 5;

/**
 * Synthetic game ID used for cross-game summary evaluation.
 * Using a value that cannot match any real game ID ensures all
 * real game diagnoses are included in the evidence counts.
 */
const SUMMARY_GAME_ID = "__summary__";

// ── Priority scores by persistence state ─────────────────────────────

const STATE_PRIORITY: Record<CoachingPersistenceState, number> = {
  persistent_despite_training: 100,
  recurring_no_training: 80,
  recurring_limited_data: 50,
  emerging: 20,
  improving_after_training: 10,
  first_occurrence: 0, // excluded
};

// ── Main Function ────────────────────────────────────────────────────

/**
 * Build a bounded cross-game coaching memory summary.
 *
 * @param diagnosisHistory - All diagnosed game entries (losses only, with primaryTarget).
 * @param targetedSessions - Sessions with reviewTargeting metadata.
 * @param allDiagnosedGameCount - Total number of diagnosed games (including draws/wins).
 *   Used for totalGamesAnalyzed. If not provided, falls back to diagnosisHistory.length.
 */
export function buildCoachingMemorySummary(
  diagnosisHistory: DiagnosisHistoryEntry[],
  targetedSessions: TargetedSessionSummary[],
  allDiagnosedGameCount?: number
): CoachingMemorySummary {
  const now = new Date().toISOString();
  const totalGamesAnalyzed = allDiagnosedGameCount ?? diagnosisHistory.length;

  // Sparse / no-data cases
  if (diagnosisHistory.length === 0) {
    return emptyResult(now, totalGamesAnalyzed, "no_data");
  }

  const readiness: MemorySummaryReadiness =
    diagnosisHistory.length < MIN_GAMES_FOR_SUMMARY ? "sparse" : "ready";

  // Find all distinct targets that have appeared at least once
  const targetSet = new Set<RepairTarget>(
    diagnosisHistory.map((h) => h.primaryTarget)
  );
  const targets = ALL_REPAIR_TARGETS.filter((t) => targetSet.has(t));

  // Evaluate coaching memory for each target
  const entries: CoachingMemoryEntry[] = [];
  for (const target of targets) {
    const evidence = evaluateRepairEvidence(
      target,
      SUMMARY_GAME_ID,
      diagnosisHistory
    );
    if (evidence.totalOccurrences === 0) continue;

    const memory = evaluateCoachingMemory(
      target,
      SUMMARY_GAME_ID,
      evidence,
      targetedSessions,
      diagnosisHistory
      // No sessionAccuracies — summary uses persistence states only
    );

    // Skip first_occurrence — not useful in aggregate summary
    if (memory.persistenceState === "first_occurrence") continue;

    const baseScore = STATE_PRIORITY[memory.persistenceState];
    entries.push({
      target,
      persistenceState: memory.persistenceState,
      confidence: memory.confidence,
      recommendedEmphasis: memory.recommendedEmphasis,
      totalOccurrences: evidence.totalOccurrences,
      targetedSessionCount: memory.targetedSessionCount,
      explanation: memory.explanation,
      priorityScore: baseScore + evidence.totalOccurrences,
    });
  }

  // Group by persistence state, sorted by priorityScore desc within each group
  const persistent = entries
    .filter((e) => e.persistenceState === "persistent_despite_training")
    .sort(byPriorityDesc);
  const improving = entries
    .filter((e) => e.persistenceState === "improving_after_training")
    .sort(byPriorityDesc);
  const recurringNoTraining = entries
    .filter((e) => e.persistenceState === "recurring_no_training")
    .sort(byPriorityDesc);
  const limitedData = entries
    .filter((e) => e.persistenceState === "recurring_limited_data")
    .sort(byPriorityDesc);
  const emerging = entries
    .filter((e) => e.persistenceState === "emerging")
    .sort(byPriorityDesc);

  // Top priorities: persistent first, then recurringNoTraining, limitedData, emerging
  // Improving targets are not surfaced as priorities
  const topPriorities = [
    ...persistent,
    ...recurringNoTraining,
    ...limitedData,
    ...emerging,
  ].slice(0, MAX_TOP_PRIORITIES);

  const totalTargetsTracked = entries.length;
  const summaryMessage = buildSummaryMessage(
    persistent.length,
    improving.length,
    recurringNoTraining.length,
    limitedData.length,
    emerging.length,
    readiness
  );

  return {
    generatedAt: now,
    readiness,
    totalGamesAnalyzed,
    totalTargetsTracked,
    persistent,
    improving,
    recurringNoTraining,
    limitedData,
    emerging,
    persistentCount: persistent.length,
    improvingCount: improving.length,
    recurringNoTrainingCount: recurringNoTraining.length,
    limitedDataCount: limitedData.length,
    emergingCount: emerging.length,
    topPriorities,
    summaryMessage,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

function byPriorityDesc(a: CoachingMemoryEntry, b: CoachingMemoryEntry): number {
  return b.priorityScore - a.priorityScore;
}

function buildSummaryMessage(
  persistentCount: number,
  improvingCount: number,
  recurringNoTrainingCount: number,
  limitedDataCount: number,
  emergingCount: number,
  readiness: MemorySummaryReadiness
): string {
  if (readiness === "no_data") {
    return "No diagnosed games yet. Analyze your games to build coaching memory.";
  }
  if (readiness === "sparse") {
    return "Limited data — analyze more games for a stronger coaching picture.";
  }

  const parts: string[] = [];

  if (persistentCount > 0) {
    parts.push(
      `${persistentCount} weakness${persistentCount === 1 ? "" : "es"} persist${persistentCount === 1 ? "s" : ""} despite training`
    );
  }
  if (recurringNoTrainingCount > 0) {
    parts.push(
      `${recurringNoTrainingCount} recurring issue${recurringNoTrainingCount === 1 ? "" : "s"} need${recurringNoTrainingCount === 1 ? "s" : ""} targeted work`
    );
  }
  if (improvingCount > 0) {
    parts.push(
      `${improvingCount} improving after training`
    );
  }
  if (limitedDataCount > 0 && persistentCount === 0 && recurringNoTrainingCount === 0) {
    parts.push(`${limitedDataCount} in early training`);
  }
  if (emergingCount > 0 && parts.length === 0) {
    parts.push(`${emergingCount} emerging pattern${emergingCount === 1 ? "" : "s"} to watch`);
  }

  if (parts.length === 0) {
    return "Coaching memory is building — keep playing and training.";
  }

  const message = parts.join(", ");
  return message.charAt(0).toUpperCase() + message.slice(1) + ".";
}

function emptyResult(
  now: string,
  totalGamesAnalyzed: number,
  readiness: MemorySummaryReadiness
): CoachingMemorySummary {
  return {
    generatedAt: now,
    readiness,
    totalGamesAnalyzed,
    totalTargetsTracked: 0,
    persistent: [],
    improving: [],
    recurringNoTraining: [],
    limitedData: [],
    emerging: [],
    persistentCount: 0,
    improvingCount: 0,
    recurringNoTrainingCount: 0,
    limitedDataCount: 0,
    emergingCount: 0,
    topPriorities: [],
    summaryMessage:
      readiness === "no_data"
        ? "No diagnosed games yet. Analyze your games to build coaching memory."
        : "Limited data — analyze more games for a stronger coaching picture.",
  };
}
