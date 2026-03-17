import type { ChessColor } from "@chess-os/chess-core";

/**
 * Compute centipawn swing from the mover's perspective.
 *
 * Engine eval is always from White's perspective:
 *   White move: swing = evalBefore - evalAfter  (positive = White lost ground)
 *   Black move: swing = evalAfter - evalBefore  (positive = Black lost ground)
 *
 * Positive swing = the mover's position got worse (bad move).
 * Negative swing = the mover's position improved (good move or opponent worsened).
 */
export function computeSwingCp(
  evalBeforeCp: number,
  evalAfterCp: number,
  mover: ChessColor
): number {
  return mover === "white"
    ? evalBeforeCp - evalAfterCp
    : evalAfterCp - evalBeforeCp;
}
