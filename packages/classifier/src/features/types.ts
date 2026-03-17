import type { ChessColor } from "@chess-os/chess-core";

export type EvalBucket =
  | "crushing_advantage"
  | "winning"
  | "slight_advantage"
  | "equal"
  | "slight_disadvantage"
  | "losing"
  | "crushing_disadvantage";

export type GamePhase = "opening" | "middlegame" | "endgame";

export interface FeatureVector {
  // Core metadata
  gameId: string;
  positionId: string;
  ply: number;
  sideToMove: ChessColor;

  // Engine features
  evalCp: number;
  evalBucket: EvalBucket;
  depth: number;
  bestMovePresent: boolean;
  pvLength: number;

  // FEN / game-state features
  halfmoveClock: number;
  fullmoveNumber: number;
  castlingRightsWhiteKingside: boolean;
  castlingRightsWhiteQueenside: boolean;
  castlingRightsBlackKingside: boolean;
  castlingRightsBlackQueenside: boolean;
  enPassantAvailable: boolean;

  // Material features
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

  // Phase
  phase: GamePhase;
}
