/**
 * Generate recall exercises from the training corpus.
 *
 * Recall exercises show a position briefly, then require the user
 * to reconstruct it from memory by placing pieces on an empty board.
 *
 * Selection criteria: prefer positions with >= 12 pieces,
 * middlegame phase, avoid trivial endgames.
 */

import type { TrainingExercise, DifficultyEstimate } from "../exercises/types";
import type { CognitiveSessionExercise } from "./types";

/** Viewing window durations in milliseconds by difficulty */
const VIEWING_WINDOWS: Record<DifficultyEstimate, number> = {
  easy: 15_000,
  medium: 10_000,
  hard: 7_000,
};

/**
 * Count pieces in a FEN string (excluding kings since they're always there).
 */
function countPieces(fen: string): number {
  const boardPart = fen.split(" ")[0];
  let count = 0;
  for (const ch of boardPart) {
    if (/[pnbrqkPNBRQK]/.test(ch)) count++;
  }
  return count;
}

/**
 * Score a position for recall suitability.
 * Higher = better candidate for recall training.
 */
function recallScore(ex: TrainingExercise): number {
  const pieces = countPieces(ex.fen);

  // Prefer positions with many pieces (more to memorize)
  const pieceScore = Math.min(pieces / 32, 1.0);

  // Prefer middlegame over endgame or opening
  const phaseScore =
    ex.phase === "middlegame" ? 1.0 :
    ex.phase === "opening" ? 0.7 :
    0.4;

  return pieceScore * 0.6 + phaseScore * 0.4;
}

/**
 * Generate recall exercises from the training corpus.
 *
 * @param exercises  Available training exercises
 * @param count      Number of recall exercises to generate
 * @param config     Optional configuration
 * @returns Array of CognitiveSessionExercise with exerciseType "recall"
 */
export function generateRecallExercises(
  exercises: TrainingExercise[],
  count: number,
  config?: { viewingWindowMs?: number }
): CognitiveSessionExercise[] {
  if (count <= 0) return [];

  // Filter: need enough pieces to make recall meaningful
  const candidates = exercises.filter((ex) => {
    const pieces = countPieces(ex.fen);
    return pieces >= 12;
  });

  // Sort by recall suitability
  const sorted = [...candidates].sort((a, b) => recallScore(b) - recallScore(a));

  // Take top candidates
  const selected = sorted.slice(0, count);

  return selected.map((ex) => {
    const viewingWindowMs =
      config?.viewingWindowMs ??
      VIEWING_WINDOWS[ex.explanation.difficultyEstimate];

    return {
      exerciseId: ex.positionId,
      exerciseType: "recall" as const,
      gameId: ex.gameId,
      ply: ex.ply,
      fen: ex.fen,
      sideToMove: ex.sideToMove,
      heroColor: ex.heroColor,
      perspective: ex.perspective,
      phase: ex.phase,
      lessonCategory: ex.explanation.lessonCategory,
      difficultyEstimate: ex.explanation.difficultyEstimate,
      difficultyScore: ex.explanation.difficultyScore,
      targetPriority: ex.targetPriority,
      recallData: { viewingWindowMs },
    };
  });
}
