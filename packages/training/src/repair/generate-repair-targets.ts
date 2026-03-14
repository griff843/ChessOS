/**
 * Deterministic repair target generation.
 *
 * Consumes a GameLossDiagnosis and produces a RepairTargetRecommendation
 * mapping the primary diagnosis category (and contributing factors) to
 * actionable repair targets from a bounded taxonomy.
 *
 * Pure function — no I/O, fully deterministic.
 */

import type { DiagnosisCategory, GameLossDiagnosis } from "../diagnosis/types.js";
import type {
  RepairTarget,
  SecondaryRepairTarget,
  RepairTargetRecommendation,
} from "./types.js";

// ── Category-to-Target Mapping ──────────────────────────────────────

export const CATEGORY_TO_TARGET: Record<DiagnosisCategory, RepairTarget> = {
  opening_memory_failure: "opening_line_recall",
  opening_concept_failure: "opening_concept_understanding",
  calculation_failure: "calculation_discipline",
  tactical_blunder: "tactical_pattern_recognition",
  strategic_misjudgment: "strategic_planning",
  time_trouble: "time_management",
  endgame_technique_failure: "endgame_technique",
  practical_collapse: "practical_stabilization",
};

// ── Reason Templates ────────────────────────────────────────────────

const PRIMARY_REASONS: Record<RepairTarget, string> = {
  opening_line_recall:
    "A critical opening deviation suggests gaps in line memorization.",
  opening_concept_understanding:
    "A positional misunderstanding in the opening points to weak conceptual grasp.",
  calculation_discipline:
    "A miscalculation caused the decisive loss, indicating calculation practice is needed.",
  tactical_pattern_recognition:
    "A tactical oversight was the primary cause — pattern recognition drills are recommended.",
  candidate_move_generation:
    "Insufficient candidate move consideration led to the loss.",
  strategic_planning:
    "Gradual positional decline indicates strategic planning needs attention.",
  time_management:
    "Errors concentrated under time pressure suggest time management work.",
  endgame_technique:
    "The endgame was mishandled, pointing to endgame technique study.",
  practical_stabilization:
    "A cascading collapse after setback suggests resilience and stabilization practice.",
};

const SECONDARY_REASONS: Record<RepairTarget, string> = {
  opening_line_recall:
    "A contributing error in the opening suggests additional line review.",
  opening_concept_understanding:
    "A secondary opening issue indicates conceptual gaps worth addressing.",
  calculation_discipline:
    "A contributing miscalculation reinforces the need for calculation work.",
  tactical_pattern_recognition:
    "A secondary tactical miss suggests broader pattern training.",
  candidate_move_generation:
    "The primary failure mode implies insufficient candidate move consideration.",
  strategic_planning:
    "A contributing positional error suggests strategic planning as a secondary focus.",
  time_management:
    "Time-related errors contributed to the loss alongside the primary cause.",
  endgame_technique:
    "A contributing endgame error suggests technique study as a secondary focus.",
  practical_stabilization:
    "Contributing errors show a pattern of cascading mistakes to address.",
};

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

// ── Summary Generation ──────────────────────────────────────────────

function buildSummary(
  primary: RepairTarget,
  secondaries: SecondaryRepairTarget[]
): string {
  const primaryLabel = TARGET_LABELS[primary];

  if (secondaries.length === 0) {
    return `Focus your training on ${primaryLabel} to address the primary weakness identified in this game.`;
  }

  const secondaryLabels = secondaries.map((s) => TARGET_LABELS[s.target]);
  const secondaryList = secondaryLabels.join(" and ");
  return `Focus primarily on ${primaryLabel}, with secondary attention to ${secondaryList}.`;
}

// ── Main Function ───────────────────────────────────────────────────

/**
 * Generate repair targets from a game loss diagnosis.
 *
 * @param diagnosis - A complete GameLossDiagnosis.
 * @returns A deterministic RepairTargetRecommendation.
 */
export function generateRepairTargets(
  diagnosis: GameLossDiagnosis
): RepairTargetRecommendation {
  // No-action path: game was not lost
  if (!diagnosis.gameLost) {
    return {
      gameId: diagnosis.gameId,
      repairNeeded: false,
      primaryTarget: "strategic_planning",
      primaryReason: "No clear loss detected — no specific repair needed.",
      secondaryTargets: [],
      summary:
        "This game did not result in a clear loss. No repair targets are recommended.",
      generatedAt: new Date().toISOString(),
    };
  }

  // Map primary category to repair target
  const primaryTarget = CATEGORY_TO_TARGET[diagnosis.primaryCategory];
  const primaryReason = PRIMARY_REASONS[primaryTarget];

  // Derive secondary targets from contributing factors (deduped)
  const seen = new Set<RepairTarget>([primaryTarget]);
  const secondaryTargets: SecondaryRepairTarget[] = [];

  for (const factor of diagnosis.contributingFactors) {
    const candidate = CATEGORY_TO_TARGET[factor.category];
    if (!seen.has(candidate)) {
      seen.add(candidate);
      secondaryTargets.push({
        target: candidate,
        sourceCategory: factor.category,
        reason: SECONDARY_REASONS[candidate],
      });
    }
  }

  // Special case: tactical_blunder implies candidate_move_generation
  if (
    diagnosis.primaryCategory === "tactical_blunder" &&
    !seen.has("candidate_move_generation")
  ) {
    secondaryTargets.push({
      target: "candidate_move_generation",
      sourceCategory: "tactical_blunder",
      reason: SECONDARY_REASONS["candidate_move_generation"],
    });
  }

  const summary = buildSummary(primaryTarget, secondaryTargets);

  return {
    gameId: diagnosis.gameId,
    repairNeeded: true,
    primaryTarget,
    primaryReason,
    secondaryTargets,
    summary,
    generatedAt: new Date().toISOString(),
  };
}
