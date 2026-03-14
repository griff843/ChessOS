/**
 * Evaluate repair evidence by comparing the current game's primary repair
 * target against prior game diagnosis history.
 *
 * Pure function — no I/O, fully deterministic.
 */

import type {
  RepairTarget,
  DiagnosisHistoryEntry,
  EvidenceStatus,
  RepairEvidence,
} from "./types.js";

// ── Constants ───────────────────────────────────────────────────────

const RECENT_WINDOW = 5;

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

// ── Explanation Templates ───────────────────────────────────────────

function buildExplanation(
  status: EvidenceStatus,
  label: string,
  total: number
): string {
  switch (status) {
    case "isolated":
      return `This is the first time ${label} has appeared as a primary repair target.`;
    case "emerging":
      return `${label} has appeared ${total} time${total === 1 ? "" : "s"} before and may be becoming a pattern.`;
    case "recurring":
      return `${label} has appeared ${total} times recently — this is a consistent weakness to address.`;
    case "persistent":
      return `${label} has appeared ${total} times across both recent and older games — a long-running issue.`;
    case "improving":
      return `${label} appeared frequently in older games but is declining in recent games — positive trend.`;
  }
}

// ── Main Function ───────────────────────────────────────────────────

/**
 * Evaluate repair evidence for a target across game history.
 *
 * @param currentTarget - The current game's primary repair target.
 * @param currentGameId - The current game ID (excluded from history).
 * @param history - All diagnosed games' history entries.
 * @returns A deterministic RepairEvidence evaluation.
 */
export function evaluateRepairEvidence(
  currentTarget: RepairTarget,
  currentGameId: string,
  history: DiagnosisHistoryEntry[]
): RepairEvidence {
  // Exclude current game, sort by date descending (most recent first)
  const prior = history
    .filter((h) => h.gameId !== currentGameId)
    .sort(
      (a, b) =>
        new Date(b.diagnosedAt).getTime() - new Date(a.diagnosedAt).getTime()
    );

  const totalGamesAnalyzed = prior.length;

  // Count matches across all prior games
  const matches = prior.filter((h) => h.primaryTarget === currentTarget);
  const totalOccurrences = matches.length;

  // Split into recent window and older
  const recentGames = prior.slice(0, RECENT_WINDOW);
  const recentOccurrences = recentGames.filter(
    (h) => h.primaryTarget === currentTarget
  ).length;
  const olderOccurrences = totalOccurrences - recentOccurrences;

  // Classify status (order matters: improving checked before persistent/recurring)
  let status: EvidenceStatus;

  if (totalOccurrences === 0) {
    status = "isolated";
  } else if (olderOccurrences >= 2 && recentOccurrences < olderOccurrences * 0.5) {
    status = "improving";
  } else if (recentOccurrences >= 3 && olderOccurrences >= 2) {
    status = "persistent";
  } else if (recentOccurrences >= 3) {
    status = "recurring";
  } else {
    status = "emerging";
  }

  const label = TARGET_LABELS[currentTarget];
  const explanation = buildExplanation(status, label, totalOccurrences);

  return {
    currentTarget,
    status,
    totalOccurrences,
    recentOccurrences,
    olderOccurrences,
    totalGamesAnalyzed,
    explanation,
  };
}
