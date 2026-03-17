/**
 * Extract engine answer key from a training dataset row.
 *
 * Uses the engine evaluation data already stored in the dataset row
 * (bestMove, PV, evalCp, swingCp) rather than re-running Stockfish,
 * since the same depth + position produces identical deterministic results.
 *
 * Converts bestMove from UCI to SAN using chess.js via chess-core.
 */

import { uciToSan } from "@chess-os/chess-core";
import type { ChessColor } from "@chess-os/chess-core";
import type { EngineAnswer } from "./types";

/**
 * Compute the eval after the played move (White's perspective).
 *
 * Engine eval is always from White's perspective:
 *   White move: swingCp = evalBefore - evalAfter → evalAfter = evalBefore - swingCp
 *   Black move: swingCp = evalAfter - evalBefore → evalAfter = evalBefore + swingCp
 */
function computeEvalAfter(
  evalBefore: number,
  swingCp: number,
  mover: ChessColor
): number {
  return mover === "white"
    ? evalBefore - swingCp
    : evalBefore + swingCp;
}

/**
 * Extract the engine answer key for a position.
 *
 * @param fen       FEN of the position before the move
 * @param bestMove  Engine best move in UCI format (e.g. "e2e4")
 * @param pv        Principal variation from engine (UCI move strings)
 * @param evalCp    Engine eval of pre-move position (White's perspective)
 * @param swingCp   Centipawn loss from mover's perspective (positive = bad)
 * @param mover     Side that played the move
 */
export function extractEngineAnswer(
  fen: string,
  bestMove: string | undefined,
  pv: string[] | undefined,
  evalCp: number,
  swingCp: number,
  mover: ChessColor
): EngineAnswer {
  const bestMoveSan = bestMove ? uciToSan(fen, bestMove) : undefined;
  const evalAfter = computeEvalAfter(evalCp, swingCp, mover);

  return {
    bestMoveUci: bestMove,
    bestMoveSan,
    pv: pv ?? [],
    evalBefore: evalCp,
    evalAfter,
    evalSwing: swingCp,
  };
}
