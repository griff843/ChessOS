/**
 * Repair-target-to-exercise matching for targeted session generation.
 *
 * Maps RepairTarget values to the LessonCategory values that represent
 * exercises relevant to that repair focus. Provides a pure boost function
 * consumed by rankAdaptiveCandidates() to bias session selection toward
 * the diagnosed weakness.
 */

import type { LessonCategory } from "../exercises/types.js";
import type { CoachingEmphasis, EvidenceStatus, RepairTarget, ReviewSessionRequest, ReviewWeightingStrength } from "./types.js";

// ── Mapping: RepairTarget → exercise lesson categories ──────────────

export const REPAIR_TARGET_TO_LESSON_CATEGORIES: Record<RepairTarget, LessonCategory[]> = {
  tactical_pattern_recognition: ["tactical_miss", "material_loss"],
  calculation_discipline: ["calculation_error"],
  endgame_technique: ["endgame_technique"],
  opening_line_recall: ["opening_inaccuracy"],
  opening_concept_understanding: ["opening_inaccuracy"],
  strategic_planning: ["positional_error"],
  candidate_move_generation: ["tactical_miss", "calculation_error"],
  time_management: ["tactical_miss", "calculation_error", "material_loss"],
  practical_stabilization: ["material_loss", "tactical_miss", "calculation_error"],
};

export const OPENING_REPAIR_TARGETS = new Set<RepairTarget>([
  "opening_line_recall",
  "opening_concept_understanding",
]);

/** All valid repair targets in a stable order for iteration. */
export const ALL_REPAIR_TARGETS: RepairTarget[] = [
  "tactical_pattern_recognition",
  "calculation_discipline",
  "endgame_technique",
  "opening_line_recall",
  "opening_concept_understanding",
  "strategic_planning",
  "candidate_move_generation",
  "time_management",
  "practical_stabilization",
];

// ── Boost magnitude by strength tier ────────────────────────────────

const PRIMARY_BOOST: Record<Exclude<ReviewWeightingStrength, "none">, number> = {
  strong: 0.6,
  moderate: 0.4,
  weak: 0.2,
};

const SECONDARY_RATIO = 0.5;
const OPENING_PHASE_BONUS = 0.1;

// ── Pure boost computation ──────────────────────────────────────────

export interface RepairTargetBoostInput {
  lessonCategory: LessonCategory;
  phase: string;
}

/**
 * Compute the additive repair-target boost for a single exercise.
 *
 * Returns 0 when:
 * - request is null/undefined
 * - targetBoostStrength is "none" (system already improving)
 * - exercise does not match any repair target
 *
 * Pure function, no I/O, deterministic.
 */
export function computeRepairTargetBoost(
  exercise: RepairTargetBoostInput,
  request: ReviewSessionRequest | null | undefined
): number {
  if (!request) return 0;
  if (request.targetBoostStrength === "none") return 0;

  const baseMagnitude = PRIMARY_BOOST[request.targetBoostStrength];
  const primaryCategories = REPAIR_TARGET_TO_LESSON_CATEGORIES[request.primaryTarget];

  // Check primary target match
  if (primaryCategories.includes(exercise.lessonCategory)) {
    let boost = baseMagnitude;
    if (OPENING_REPAIR_TARGETS.has(request.primaryTarget) && exercise.phase === "opening") {
      boost += OPENING_PHASE_BONUS;
    }
    return boost;
  }

  // Check secondary target matches (first match wins, no stacking)
  for (const secondaryTarget of request.secondaryTargets) {
    const secondaryCategories = REPAIR_TARGET_TO_LESSON_CATEGORIES[secondaryTarget];
    if (secondaryCategories.includes(exercise.lessonCategory)) {
      let boost = baseMagnitude * SECONDARY_RATIO;
      if (OPENING_REPAIR_TARGETS.has(secondaryTarget) && exercise.phase === "opening") {
        boost += OPENING_PHASE_BONUS * SECONDARY_RATIO;
      }
      return boost;
    }
  }

  // Opening phase bonus alone (no category match but opening target + opening phase)
  if (OPENING_REPAIR_TARGETS.has(request.primaryTarget) && exercise.phase === "opening") {
    return OPENING_PHASE_BONUS;
  }

  return 0;
}

// ── Emphasis-aware boost derivation ───────────────────────────────

/**
 * Derive boost strength from coaching emphasis + evidence status.
 *
 * When coaching memory provides an emphasis recommendation, it overrides
 * the evidence-only derivation. When emphasis is "monitor" or absent,
 * falls through to the evidence-based mapping (backward compatible).
 */
export function deriveEmphasisAwareBoostStrength(
  evidenceStatus: EvidenceStatus | null,
  emphasis: CoachingEmphasis | null | undefined
): ReviewWeightingStrength {
  // Emphasis overrides when actionable
  switch (emphasis) {
    case "increase":
      return "strong";
    case "maintain":
      return "moderate";
    case "reduce":
      return "weak";
  }

  // "monitor" or null/undefined → fall through to evidence-based
  if (evidenceStatus === null) return "moderate";
  switch (evidenceStatus) {
    case "recurring":
    case "persistent":
      return "strong";
    case "emerging":
      return "moderate";
    case "isolated":
      return "weak";
    case "improving":
      return "none";
  }
}
