export type GameSource = "chesscom" | "lichess" | "pgn-upload";

export type ChessColor = "white" | "black";

export type GameResult = "win" | "loss" | "draw" | "unknown";

export interface ImportedGame {
  id: string;
  source: GameSource;
  sourceGameId?: string;
  pgn: string;
  playedAt?: string;
  timeControl?: string;
  color?: ChessColor;
  opening?: string;
  result?: GameResult;
  opponentName?: string;
}

export interface PositionSnapshot {
  id: string;
  gameId: string;
  ply: number;
  fen: string;
  sideToMove: ChessColor;
  playedMove?: string;
  bestMove?: string;
  evalBeforeCp?: number;
  evalAfterCp?: number;
  evalLossCp?: number;
}

export type MistakeSeverity = "inaccuracy" | "mistake" | "blunder";

export interface MistakeEvent {
  id: string;
  gameId: string;
  positionId: string;
  ply: number;
  severity: MistakeSeverity;
  evalLossCp: number;
  playedMove?: string;
  bestMove?: string;
  isMissedWin: boolean;
  isDefensiveMiss: boolean;
  notes?: string;
}

export type MotifTag =
  | "fork"
  | "pin"
  | "skewer"
  | "discovered-attack"
  | "hanging-piece"
  | "mate-threat"
  | "back-rank"
  | "removal-of-defender"
  | "overloaded-defender"
  | "endgame-technique"
  | "unknown";

export interface TrainingItem {
  id: string;
  sourcePositionId: string;
  fen: string;
  prompt: string;
  correctMove: string;
  motifTags: MotifTag[];
  difficulty: number;
  nextDueAt?: string;
  masteryScore: number;
  failureCount: number;
}
