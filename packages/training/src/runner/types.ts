/**
 * Types for the M7A interactive puzzle runner.
 *
 * The runner steps through a study session's exercises, prompts the
 * learner for move guesses, and records correctness.
 */

import type { ChessColor } from "@chess-os/chess-core";
import type { LessonCategory, DifficultyEstimate } from "../exercises/types";
import type { GradingTier } from "../grading/eval-loss-bands";

/**
 * A single exercise attempt by the learner.
 */
export interface PuzzleAttempt {
  exerciseId: string;
  exerciseIndex: number;
  fen: string;
  sideToMove: ChessColor;
  lessonCategory: LessonCategory;
  difficultyEstimate: DifficultyEstimate;
  playedMoveSan: string;
  userMove: string;
  userMoveUci: string;
  engineMove: string;
  engineMoveUci: string;
  isCorrect: boolean;
  /** Tiered move quality grade (M7B) */
  gradingTier: GradingTier;
  /** Centipawn loss from best move (null if unknown) */
  evalLossCp: number | null;
  timestamp: string;
}

/**
 * Full result of a puzzle-solving session.
 */
export interface PuzzleResult {
  sessionId: string;
  startedAt: string;
  completedAt: string;
  totalExercises: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  attempts: PuzzleAttempt[];
}

/**
 * Enriched exercise data combining SessionExercise with
 * engine answer details from the full TrainingExercise corpus.
 */
export interface EnrichedExercise {
  exerciseId: string;
  gameId: string;
  ply: number;
  fen: string;
  sideToMove: ChessColor;
  /** The player's color — used for board orientation. Null for legacy exercises. */
  heroColor: ChessColor | null;
  phase: string;
  playedMoveSan: string;
  bestMoveSan: string | undefined;
  bestMoveUci: string;
  pv: string[];
  evalBefore: number;
  evalAfter: number;
  evalSwing: number;
  lessonCategory: LessonCategory;
  difficultyEstimate: DifficultyEstimate;
  difficultyScore: number;
  reasonCodes: string[];
  targetPriority: number;
  /** UCI form of the original game move (for eval loss lookup) */
  playedMoveUci: string | undefined;
}
