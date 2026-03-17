/**
 * Pure synthesis function for M011 Coach Overview.
 *
 * Takes already-computed coaching intelligence and reduces it to one
 * actionable summary with a single recommended next action.
 * No I/O — deterministic and testable.
 */

import type { CoachingMemorySummary } from "../repair/types.js";
import type {
  CoachOverview,
  CoachOverviewReadiness,
  CoachOverviewFocus,
  CoachOverviewOpening,
  CoachNextAction,
} from "./types.js";

/** Minimal summary input — only the field we need. */
interface CoachingSummaryInput {
  nextStepStatement: string;
}

// ── Target name humanization ─────────────────────────────────────────

const TARGET_LABELS: Record<string, string> = {
  opening_line_recall: "Opening recall",
  opening_concept_understanding: "Opening concepts",
  calculation_discipline: "Calculation discipline",
  tactical_pattern_recognition: "Tactical patterns",
  candidate_move_generation: "Candidate moves",
  strategic_planning: "Strategic planning",
  time_management: "Time management",
  endgame_technique: "Endgame technique",
  practical_stabilization: "Practical stabilization",
};

function humanizeTarget(target: string): string {
  return TARGET_LABELS[target] ?? target.replace(/_/g, " ");
}

// ── Repair queue shape (minimal — avoids importing web types) ─────────

interface RepairQueueInput {
  entries: Array<{
    lineId: string;
    lineName: string;
    repairUrgency: string;
  }>;
}

// ── Main function ─────────────────────────────────────────────────────

export function buildCoachOverview(
  memorySummary: CoachingMemorySummary | null,
  repairQueue: RepairQueueInput | null,
  coachingSummary: CoachingSummaryInput | null
): CoachOverview {
  // 1. Readiness
  const readiness: CoachOverviewReadiness = deriveReadiness(memorySummary);

  // 2. Primary focus — first top-priority entry
  const primaryFocus: CoachOverviewFocus | null =
    memorySummary && memorySummary.topPriorities.length > 0
      ? {
          target: memorySummary.topPriorities[0].target,
          persistenceState: memorySummary.topPriorities[0].persistenceState,
          gamesAffected: memorySummary.topPriorities[0].totalOccurrences,
        }
      : null;

  // 3. Opening priority — first repair queue entry
  const openingPriority: CoachOverviewOpening | null =
    repairQueue && repairQueue.entries.length > 0
      ? {
          lineId: repairQueue.entries[0].lineId,
          lineName: repairQueue.entries[0].lineName,
          urgency: repairQueue.entries[0].repairUrgency,
        }
      : null;

  // 4. Improving areas — humanized, capped at 2
  const improvingAreas: string[] = (memorySummary?.improving ?? [])
    .slice(0, 2)
    .map((e) => humanizeTarget(e.target));

  // 5. Next action (first match wins)
  const nextAction: CoachNextAction = deriveNextAction(
    readiness,
    primaryFocus,
    openingPriority
  );

  // 6. Summary sentence
  const summary: string | null =
    coachingSummary?.nextStepStatement ?? null;

  return {
    readiness,
    primaryFocus,
    openingPriority,
    improvingAreas,
    nextAction,
    summary,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────

function deriveReadiness(
  memorySummary: CoachingMemorySummary | null
): CoachOverviewReadiness {
  if (!memorySummary) return "insufficient_data";
  if (memorySummary.persistentCount > 0) return "repair";
  if (memorySummary.improvingCount > 0) return "consolidate";
  // topPriorities excludes improving entries, so check it last
  if (memorySummary.topPriorities.length > 0) return "expand";
  return "insufficient_data";
}

function deriveNextAction(
  readiness: CoachOverviewReadiness,
  primaryFocus: CoachOverviewFocus | null,
  openingPriority: CoachOverviewOpening | null
): CoachNextAction {
  // Immediate opening repair + repair readiness → drill opening first
  if (
    openingPriority?.urgency === "immediate_repair" &&
    readiness === "repair"
  ) {
    return {
      type: "drill_opening",
      label: "Drill Opening Line",
      href: `/repertoire?preferredLineId=${openingPriority.lineId}`,
    };
  }
  // Primary tactical focus + repair readiness → start session
  if (primaryFocus && readiness === "repair") {
    return {
      type: "start_session",
      label: "Start Training Session",
      href: "/study",
    };
  }
  // Opening priority without urgent repair context
  if (openingPriority) {
    return {
      type: "drill_opening",
      label: "Drill Opening Line",
      href: `/repertoire?preferredLineId=${openingPriority.lineId}`,
    };
  }
  // Any focus → start session
  if (primaryFocus) {
    return {
      type: "start_session",
      label: "Start Training Session",
      href: "/study",
    };
  }
  // No signals → monitor
  return {
    type: "monitor",
    label: "View Coach Report",
    href: "/coach",
  };
}
