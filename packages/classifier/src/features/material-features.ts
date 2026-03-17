/**
 * Extract material features by counting pieces in the FEN piece-placement field.
 * Pure function — no I/O.
 *
 * Standard piece values: P=100, N=320, B=330, R=500, Q=900
 */

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
};

export interface MaterialFeatures {
  whitePawnCount: number;
  whiteKnightCount: number;
  whiteBishopCount: number;
  whiteRookCount: number;
  whiteQueenCount: number;
  blackPawnCount: number;
  blackKnightCount: number;
  blackBishopCount: number;
  blackRookCount: number;
  blackQueenCount: number;
  materialWhite: number;
  materialBlack: number;
  materialDiff: number;
}

export function extractMaterialFeatures(fen: string): MaterialFeatures {
  const piecePlacement = fen.split(" ")[0];

  const counts: Record<string, number> = {
    P: 0, N: 0, B: 0, R: 0, Q: 0,
    p: 0, n: 0, b: 0, r: 0, q: 0,
  };

  for (const ch of piecePlacement) {
    if (ch in counts) {
      counts[ch]++;
    }
  }

  const materialWhite =
    counts.P * PIECE_VALUES.p +
    counts.N * PIECE_VALUES.n +
    counts.B * PIECE_VALUES.b +
    counts.R * PIECE_VALUES.r +
    counts.Q * PIECE_VALUES.q;

  const materialBlack =
    counts.p * PIECE_VALUES.p +
    counts.n * PIECE_VALUES.n +
    counts.b * PIECE_VALUES.b +
    counts.r * PIECE_VALUES.r +
    counts.q * PIECE_VALUES.q;

  return {
    whitePawnCount: counts.P,
    whiteKnightCount: counts.N,
    whiteBishopCount: counts.B,
    whiteRookCount: counts.R,
    whiteQueenCount: counts.Q,
    blackPawnCount: counts.p,
    blackKnightCount: counts.n,
    blackBishopCount: counts.b,
    blackRookCount: counts.r,
    blackQueenCount: counts.q,
    materialWhite,
    materialBlack,
    materialDiff: materialWhite - materialBlack,
  };
}
