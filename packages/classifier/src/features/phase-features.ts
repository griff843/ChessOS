/**
 * Derive game phase from material counts and ply.
 * Pure function — no I/O.
 *
 * Heuristic:
 *   total non-pawn material = knights + bishops + rooks + queens (both sides)
 *   Starting value: 2*(320+330+500+900) * 2 sides = ~4200 per side
 *
 *   endgame:    total non-pawn material <= 2600 (queens off, few minors remain)
 *   opening:    ply <= 20 AND total non-pawn material >= 5800
 *   middlegame: everything else
 */

import type { GamePhase } from "./types";
import type { MaterialFeatures } from "./material-features";

const ENDGAME_THRESHOLD = 2600;
const OPENING_MATERIAL_FLOOR = 5800;
const OPENING_PLY_CEILING = 20;

export function extractPhase(
  material: MaterialFeatures,
  ply: number
): GamePhase {
  const nonPawnWhite =
    material.whiteKnightCount * 320 +
    material.whiteBishopCount * 330 +
    material.whiteRookCount * 500 +
    material.whiteQueenCount * 900;

  const nonPawnBlack =
    material.blackKnightCount * 320 +
    material.blackBishopCount * 330 +
    material.blackRookCount * 500 +
    material.blackQueenCount * 900;

  const totalNonPawn = nonPawnWhite + nonPawnBlack;

  if (totalNonPawn <= ENDGAME_THRESHOLD) return "endgame";
  if (ply <= OPENING_PLY_CEILING && totalNonPawn >= OPENING_MATERIAL_FLOOR)
    return "opening";
  return "middlegame";
}
