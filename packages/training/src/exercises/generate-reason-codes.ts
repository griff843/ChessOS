/**
 * Generate structured reason codes for an exercise.
 *
 * Reason codes are machine-readable tags explaining why a position
 * is important for training. Multiple codes can apply to a single position.
 *
 * Code definitions:
 *   high_eval_swing   — |evalSwing| >= 200cp
 *   critical_position — criticalityScore >= 0.6
 *   blunder           — actualLabel is "blunder"
 *   late_blunder      — actualLabel is blunder or mistake AND ply >= 60
 *   endgame_mistake   — phase is endgame AND actualLabel is error
 *   opening_error     — phase is opening AND actualLabel is error
 *   long_calculation  — PV length >= 5
 *   near_equality     — |evalBefore| <= 50cp (position was near equal)
 *   high_risk_correct — targetType is critical_test
 */

import type { GamePhase, MistakeLabel } from "@chess-os/classifier";
import type { TrainingTargetType } from "../targets/types";
import type { ReasonCode } from "./types";

const ERROR_LABELS: MistakeLabel[] = ["inaccuracy", "mistake", "blunder"];

export function generateReasonCodes(
  evalSwing: number,
  evalBefore: number,
  criticalityScore: number,
  actualLabel: MistakeLabel,
  targetType: TrainingTargetType,
  phase: GamePhase,
  pvLength: number,
  ply: number
): ReasonCode[] {
  const codes: ReasonCode[] = [];

  if (Math.abs(evalSwing) >= 200) {
    codes.push("high_eval_swing");
  }

  if (criticalityScore >= 0.6) {
    codes.push("critical_position");
  }

  if (actualLabel === "blunder") {
    codes.push("blunder");
  }

  if (
    (actualLabel === "blunder" || actualLabel === "mistake") &&
    ply >= 60
  ) {
    codes.push("late_blunder");
  }

  if (phase === "endgame" && ERROR_LABELS.includes(actualLabel)) {
    codes.push("endgame_mistake");
  }

  if (phase === "opening" && ERROR_LABELS.includes(actualLabel)) {
    codes.push("opening_error");
  }

  if (pvLength >= 5) {
    codes.push("long_calculation");
  }

  if (Math.abs(evalBefore) <= 50) {
    codes.push("near_equality");
  }

  if (targetType === "critical_test") {
    codes.push("high_risk_correct");
  }

  return codes;
}
