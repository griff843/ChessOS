import type { EvaluatedPosition } from "@chess-os/engine";
import type { GamePhase } from "../features/types";
import type { MistakeClassification } from "./types";
import { computeSwingCp } from "./eval-delta";
import { labelFromSwing } from "./thresholds";

/**
 * Classify a single move from two consecutive evaluated positions.
 *
 * positionBefore: the position from which the move was played (sideToMove = the mover)
 * positionAfter:  the position after the move (playedMove = the move SAN)
 */
export function classifySingleMove(
  positionBefore: EvaluatedPosition,
  positionAfter: EvaluatedPosition,
  phase: GamePhase
): MistakeClassification {
  const mover = positionBefore.sideToMove;
  const swingCp = computeSwingCp(
    positionBefore.evalCp,
    positionAfter.evalCp,
    mover
  );

  return {
    gameId: positionBefore.gameId,
    positionId: positionBefore.id,
    ply: positionAfter.ply,
    moveSan: positionAfter.playedMove ?? "",
    mover,
    evalBeforeCp: positionBefore.evalCp,
    evalAfterCp: positionAfter.evalCp,
    swingCp,
    label: labelFromSwing(swingCp),
    phase,
  };
}
