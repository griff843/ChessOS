/**
 * Deterministic difficulty estimation for exercises.
 *
 * Composite score from four normalized inputs:
 *   pvLength_norm × 0.35   — longer PV = harder to calculate
 *   risk_norm    × 0.25    — higher predicted risk = harder position
 *   swing_norm   × 0.25    — larger eval swing = more to see
 *   phase_weight × 0.15    — middlegame hardest, opening easiest
 *
 * Thresholds:
 *   score >= 0.60 → hard
 *   score >= 0.35 → medium
 *   score <  0.35 → easy
 */

import type { GamePhase } from "@chess-os/classifier";
import type { DifficultyEstimate } from "./types";

const W_PV = 0.35;
const W_RISK = 0.25;
const W_SWING = 0.25;
const W_PHASE = 0.15;

const PV_NORM_MAX = 8;
const SWING_NORM_MAX = 400;

const HARD_THRESHOLD = 0.60;
const MEDIUM_THRESHOLD = 0.35;

const PHASE_WEIGHTS: Record<GamePhase, number> = {
  opening: 0.3,
  middlegame: 1.0,
  endgame: 0.5,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface DifficultyResult {
  estimate: DifficultyEstimate;
  score: number;
}

/**
 * Estimate the difficulty of an exercise position.
 *
 * @param pvLength      Length of the principal variation
 * @param predictedRisk P(mistake_or_worse) from model ∈ [0, 1]
 * @param evalSwing     Centipawn loss (positive = bad move)
 * @param phase         Game phase at time of move
 */
export function estimateDifficulty(
  pvLength: number,
  predictedRisk: number,
  evalSwing: number,
  phase: GamePhase
): DifficultyResult {
  const pvNorm = clamp(pvLength / PV_NORM_MAX, 0, 1);
  const riskNorm = clamp(predictedRisk, 0, 1);
  const swingNorm = clamp(Math.abs(evalSwing) / SWING_NORM_MAX, 0, 1);
  const phaseWeight = PHASE_WEIGHTS[phase];

  const score =
    pvNorm * W_PV +
    riskNorm * W_RISK +
    swingNorm * W_SWING +
    phaseWeight * W_PHASE;

  let estimate: DifficultyEstimate;
  if (score >= HARD_THRESHOLD) {
    estimate = "hard";
  } else if (score >= MEDIUM_THRESHOLD) {
    estimate = "medium";
  } else {
    estimate = "easy";
  }

  return { estimate, score };
}
