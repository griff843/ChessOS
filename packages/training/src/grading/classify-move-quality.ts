/**
 * Classify move quality given eval loss information.
 *
 * Pure function: no I/O, no Stockfish.
 */

import type { GradingTier } from "./eval-loss-bands";
import { tierFromEvalLoss, DEFAULT_UNKNOWN_TIER } from "./eval-loss-bands";

/**
 * Result of move quality classification.
 */
export interface MoveQualityResult {
  /** Assigned grading tier */
  gradingTier: GradingTier;
  /** Centipawn loss from best move (null if unknown) */
  evalLossCp: number | null;
  /** Whether the move exactly matches the engine's best */
  isExact: boolean;
  /** Whether the move matches the original game move */
  isGameMove: boolean;
}

/**
 * Classify the quality of a user's move attempt.
 *
 * Logic:
 *   1. Exact match with best move → exact, evalLossCp = 0
 *   2. Matches original game move → grade by known evalSwing
 *   3. Otherwise → unknown eval loss, apply default tier
 *
 * @param userMoveUci     User's move in UCI notation
 * @param bestMoveUci     Engine's best move in UCI notation
 * @param playedMoveUci   Original game move in UCI (null if unknown)
 * @param evalSwing       Known eval swing of the original game move (cp)
 * @param unknownTier     Tier to assign when eval loss is unknown
 */
export function classifyMoveQuality(
  userMoveUci: string,
  bestMoveUci: string,
  playedMoveUci: string | null,
  evalSwing: number,
  unknownTier: GradingTier = DEFAULT_UNKNOWN_TIER
): MoveQualityResult {
  // 1. Exact match with engine best move
  if (userMoveUci === bestMoveUci) {
    return {
      gradingTier: "exact",
      evalLossCp: 0,
      isExact: true,
      isGameMove: userMoveUci === playedMoveUci,
    };
  }

  // 2. User played the original game move — eval loss is known
  const isGameMove = playedMoveUci !== null && userMoveUci === playedMoveUci;
  if (isGameMove) {
    const lossCp = Math.max(0, evalSwing);
    return {
      gradingTier: tierFromEvalLoss(lossCp),
      evalLossCp: lossCp,
      isExact: false,
      isGameMove: true,
    };
  }

  // 3. Unknown move — no eval data without engine
  return {
    gradingTier: unknownTier,
    evalLossCp: null,
    isExact: false,
    isGameMove: false,
  };
}
