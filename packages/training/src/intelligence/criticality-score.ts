/**
 * Criticality scoring for chess positions.
 *
 * A position is "critical" if it is both high-risk for error AND high-consequence.
 *
 * Formula:
 *   criticalityScore =
 *       predictedRisk   * W_RISK       (model-predicted error probability)
 *     + evalTension     * W_TENSION    (positions near equality are most consequential)
 *     + phaseWeight     * W_PHASE      (middlegame = most complex, opening = least)
 *     + swingSeverity   * W_SWING      (actual observed centipawn damage)
 *
 * Weights:
 *   W_RISK    = 0.50  (primary signal — the model's prediction)
 *   W_TENSION = 0.20  (near-equality positions have highest stakes)
 *   W_PHASE   = 0.15  (middlegame complexity boost)
 *   W_SWING   = 0.15  (severity of actual error if it occurred)
 *
 * All components are normalized to [0, 1]. Maximum score = 1.0.
 * Deterministic — no randomness.
 */

import type { GamePhase } from "@chess-os/classifier";
import type { CriticalityFactors } from "./types";

const W_RISK = 0.50;
const W_TENSION = 0.20;
const W_PHASE = 0.15;
const W_SWING = 0.15;

/** Clamp value to [0, 1]. */
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Eval tension: positions near equality are most consequential.
 * evalTension = 1 - clamp(|evalCp| / 300, 0, 1)
 *
 * At evalCp = 0:    tension = 1.0 (maximum — game hangs in the balance)
 * At evalCp = ±150: tension = 0.5
 * At evalCp = ±300+: tension = 0.0 (game is already decided)
 */
function evalTension(evalCp: number): number {
  return 1 - clamp01(Math.abs(evalCp) / 300);
}

/**
 * Phase weight: middlegame positions are most complex and error-prone.
 * opening = 0.3, middlegame = 1.0, endgame = 0.7
 */
const PHASE_WEIGHTS: Record<GamePhase, number> = {
  opening: 0.3,
  middlegame: 1.0,
  endgame: 0.7,
};

function phaseWeight(phase: GamePhase): number {
  return PHASE_WEIGHTS[phase] ?? 0.5;
}

/**
 * Swing severity: how much damage the move actually caused.
 * swingSeverity = clamp(|swingCp| / 300, 0, 1)
 *
 * Larger swings → more critical moments.
 */
function swingSeverity(swingCp: number): number {
  return clamp01(Math.abs(swingCp) / 300);
}

/**
 * Compute the criticality score for a position.
 * Returns the score and the individual factor components.
 */
export function computeCriticalityScore(
  predictedRisk: number,
  evalCp: number,
  phase: GamePhase,
  swingCp: number
): { score: number; factors: CriticalityFactors } {
  const riskComponent = predictedRisk * W_RISK;
  const tensionComponent = evalTension(evalCp) * W_TENSION;
  const phaseComponent = phaseWeight(phase) * W_PHASE;
  const swingComponent = swingSeverity(swingCp) * W_SWING;

  const score =
    riskComponent + tensionComponent + phaseComponent + swingComponent;

  return {
    score,
    factors: {
      riskComponent,
      tensionComponent,
      phaseComponent,
      swingComponent,
    },
  };
}
