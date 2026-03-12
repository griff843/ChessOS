/**
 * Extract game-state features from FEN string fields.
 * Pure function — no I/O.
 *
 * FEN format: "<pieces> <active> <castling> <en-passant> <halfmove> <fullmove>"
 */

export interface FenFeatures {
  halfmoveClock: number;
  fullmoveNumber: number;
  castlingRightsWhiteKingside: boolean;
  castlingRightsWhiteQueenside: boolean;
  castlingRightsBlackKingside: boolean;
  castlingRightsBlackQueenside: boolean;
  enPassantAvailable: boolean;
}

export function extractFenFeatures(fen: string): FenFeatures {
  const parts = fen.split(" ");
  const castling = parts[2] ?? "-";
  const enPassant = parts[3] ?? "-";
  const halfmove = parts[4] ?? "0";
  const fullmove = parts[5] ?? "1";

  return {
    halfmoveClock: parseInt(halfmove, 10),
    fullmoveNumber: parseInt(fullmove, 10),
    castlingRightsWhiteKingside: castling.includes("K"),
    castlingRightsWhiteQueenside: castling.includes("Q"),
    castlingRightsBlackKingside: castling.includes("k"),
    castlingRightsBlackQueenside: castling.includes("q"),
    enPassantAvailable: enPassant !== "-",
  };
}
