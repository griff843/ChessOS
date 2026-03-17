/**
 * Deterministic lesson category classification.
 *
 * Classifies each exercise into exactly one lesson category based on
 * available signals: eval swing, phase, PV length, and target type.
 *
 * Cascade priority (first match wins):
 *   1. critical_defense   — target type is critical_test
 *   2. endgame_technique  — phase is endgame
 *   3. material_loss      — |evalSwing| >= 300cp (roughly a minor piece)
 *   4. opening_inaccuracy — phase is opening
 *   5. calculation_error  — PV length >= 5 AND |evalSwing| >= 150cp
 *   6. tactical_miss      — |evalSwing| >= 200cp
 *   7. positional_error   — default
 */

import type { GamePhase } from "@chess-os/classifier";
import type { TrainingTargetType } from "../targets/types";
import type { LessonCategory } from "./types";

/** Threshold for material-level loss (roughly a minor piece). */
const MATERIAL_LOSS_THRESHOLD = 300;

/** Threshold for tactical miss (significant eval swing). */
const TACTICAL_MISS_THRESHOLD = 200;

/** Minimum PV length suggesting complex calculation. */
const CALCULATION_PV_MIN = 5;

/** Minimum swing to qualify as calculation error. */
const CALCULATION_SWING_MIN = 150;

export function classifyLessonCategory(
  targetType: TrainingTargetType,
  evalSwing: number,
  phase: GamePhase,
  pvLength: number
): LessonCategory {
  const absSwing = Math.abs(evalSwing);

  // 1. Critical test positions: player found the right move under danger
  if (targetType === "critical_test") {
    return "critical_defense";
  }

  // 2. Endgame errors
  if (phase === "endgame") {
    return "endgame_technique";
  }

  // 3. Large material swing
  if (absSwing >= MATERIAL_LOSS_THRESHOLD) {
    return "material_loss";
  }

  // 4. Opening errors
  if (phase === "opening") {
    return "opening_inaccuracy";
  }

  // 5. Long PV with moderate swing → calculation needed
  if (pvLength >= CALCULATION_PV_MIN && absSwing >= CALCULATION_SWING_MIN) {
    return "calculation_error";
  }

  // 6. Significant swing in middlegame → tactical miss
  if (absSwing >= TACTICAL_MISS_THRESHOLD) {
    return "tactical_miss";
  }

  // 7. Default: moderate positional error
  return "positional_error";
}
