/**
 * Compute training target priority.
 *
 * Formula:
 *   targetPriority =
 *       criticalityScore × W_CRIT      (composite position score from M5A)
 *     + labelSeverity    × W_LABEL     (severity of actual error)
 *     + evalTension      × W_TENSION   (positions near equality)
 *     + phaseWeight      × W_PHASE     (middlegame complexity boost)
 *
 * Weights:
 *   W_CRIT    = 0.40
 *   W_LABEL   = 0.35
 *   W_TENSION = 0.15
 *   W_PHASE   = 0.10
 *
 * Range: [0, 1]. Higher = more valuable for training.
 */

import type { GamePhase, MistakeLabel } from "@chess-os/classifier";
import type { TargetPriorityFactors } from "./types";

const W_CRIT = 0.40;
const W_LABEL = 0.35;
const W_TENSION = 0.15;
const W_PHASE = 0.10;

const LABEL_SEVERITY: Record<MistakeLabel, number> = {
  blunder: 1.0,
  mistake: 0.7,
  inaccuracy: 0.4,
  best_or_ok: 0.1,
};

const PHASE_WEIGHTS: Record<GamePhase, number> = {
  opening: 0.3,
  middlegame: 1.0,
  endgame: 0.7,
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function evalTension(evalCp: number): number {
  return 1 - clamp01(Math.abs(evalCp) / 300);
}

/**
 * Compute the training target priority for a position.
 */
export function computeTargetPriority(
  criticalityScore: number,
  actualLabel: MistakeLabel,
  evalCp: number,
  phase: GamePhase
): { priority: number; factors: TargetPriorityFactors } {
  const criticalityComponent = clamp01(criticalityScore) * W_CRIT;
  const labelSeverityComponent = (LABEL_SEVERITY[actualLabel] ?? 0.1) * W_LABEL;
  const tensionComponent = evalTension(evalCp) * W_TENSION;
  const phaseComponent = (PHASE_WEIGHTS[phase] ?? 0.5) * W_PHASE;

  const priority =
    criticalityComponent +
    labelSeverityComponent +
    tensionComponent +
    phaseComponent;

  return {
    priority,
    factors: {
      criticalityComponent,
      labelSeverityComponent,
      tensionComponent,
      phaseComponent,
    },
  };
}
