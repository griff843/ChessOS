import type { ChessColor } from "@chess-os/chess-core";
import type { FeatureVector, GamePhase, MistakeLabel } from "@chess-os/classifier";
import type { ExercisePerspective } from "../perspective/player-perspective";

/**
 * One row of the training dataset.
 *
 * Represents a single classified move: the pre-move position,
 * the move that was played, its engine evaluation, and its
 * classification label with the full feature vector.
 *
 * Row count per game = N-1 (N evaluated positions, N-1 moves classified).
 */
export interface TrainingDatasetRow {
  // Position identity (the pre-move position)
  gameId: string;
  positionId: string;
  ply: number;
  fen: string;
  mover: ChessColor;
  heroColor: ChessColor | null;
  perspective: ExercisePerspective;

  // The move played from this position
  moveSan: string;

  // Engine evaluation of the pre-move position
  evalCp: number;
  depth: number;
  bestMove?: string;
  pv?: string[];

  // Move classification
  swingCp: number;
  label: MistakeLabel;
  phase: GamePhase;

  // Full feature vector of the pre-move position
  features: FeatureVector;
}
