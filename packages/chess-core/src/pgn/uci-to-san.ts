import { Chess } from "chess.js";

/**
 * Convert a UCI move string (e.g. "e2e4") to SAN (e.g. "e4").
 *
 * Requires the FEN of the position before the move so that
 * chess.js can disambiguate and format correctly.
 *
 * Returns undefined if the move is invalid or cannot be parsed.
 */
export function uciToSan(fen: string, uciMove: string): string | undefined {
  if (!uciMove || uciMove.length < 4) return undefined;

  try {
    const chess = new Chess(fen);
    const from = uciMove.slice(0, 2);
    const to = uciMove.slice(2, 4);
    const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

    const result = chess.move({ from, to, promotion });
    return result?.san;
  } catch {
    return undefined;
  }
}
