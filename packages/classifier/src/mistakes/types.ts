import type { ChessColor } from "@chess-os/chess-core";
import type { GamePhase } from "../features/types";

export type MistakeLabel = "best_or_ok" | "inaccuracy" | "mistake" | "blunder";

export interface MistakeClassification {
  gameId: string;
  positionId: string;
  ply: number;
  moveSan: string;
  mover: ChessColor;
  evalBeforeCp: number;
  evalAfterCp: number;
  swingCp: number;
  label: MistakeLabel;
  phase: GamePhase;
}
