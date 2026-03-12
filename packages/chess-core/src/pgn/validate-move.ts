/**
 * Validate a chess move from user input (SAN or UCI notation).
 *
 * Tries SAN first, then UCI. Returns structured result with both
 * SAN and UCI forms for valid moves.
 */

import { Chess } from "chess.js";

/**
 * Result of move validation.
 */
export interface MoveValidationResult {
  /** Whether the move is legal in the given position */
  valid: boolean;
  /** SAN notation of the validated move (e.g. "Nxd5") */
  san: string | null;
  /** UCI notation of the validated move (e.g. "g1f3") */
  uci: string | null;
  /** Error message if the move is invalid */
  error: string | null;
}

/**
 * Validate a user-entered move against a position.
 *
 * Accepts both SAN (e.g. "Nxd5", "O-O") and UCI (e.g. "g1f3", "e7e8q").
 *
 * @param fen    Position FEN before the move
 * @param input  User's move input (SAN or UCI)
 * @returns Validation result with SAN and UCI forms if valid
 */
export function validateMove(
  fen: string,
  input: string
): MoveValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, san: null, uci: null, error: "Empty input" };
  }

  // Try as SAN first
  try {
    const chess = new Chess(fen);
    const result = chess.move(trimmed);
    if (result) {
      const uci =
        result.from + result.to + (result.promotion ?? "");
      return { valid: true, san: result.san, uci, error: null };
    }
  } catch {
    // SAN parse failed, try UCI below
  }

  // Try as UCI
  if (trimmed.length >= 4) {
    try {
      const chess = new Chess(fen);
      const from = trimmed.slice(0, 2);
      const to = trimmed.slice(2, 4);
      const promotion = trimmed.length > 4 ? trimmed[4] : undefined;

      const result = chess.move({ from, to, promotion });
      if (result) {
        const uci =
          result.from + result.to + (result.promotion ?? "");
        return { valid: true, san: result.san, uci, error: null };
      }
    } catch {
      // UCI parse also failed
    }
  }

  return {
    valid: false,
    san: null,
    uci: null,
    error: `Illegal move: "${trimmed}"`,
  };
}
