/**
 * Grade a reconstruction exercise attempt.
 *
 * Three-way comparison:
 *   1. Exact match with game move → exact tier, isCorrect = true
 *   2. Match with engine best → acceptable tier, isCorrect = true
 *   3. Neither → grade by eval loss, isCorrect = false
 */

import type { EnrichedExercise } from "../runner/types";
import type { ReconstructionGradeResult } from "./types";
import { classifyMoveQuality } from "../grading/classify-move-quality";
import { validateMove } from "@chess-os/chess-core";

/**
 * Grade a reconstruction attempt.
 *
 * @param exercise  The enriched exercise (has both game move and engine best)
 * @param userSan   User's move in SAN notation
 * @returns Grading result with three-way comparison
 */
export function gradeReconstruction(
  exercise: EnrichedExercise,
  userSan: string
): ReconstructionGradeResult {
  // Validate user move to get UCI
  const validation = validateMove(exercise.fen, userSan);
  if (!validation.valid || !validation.uci) {
    return {
      userMove: userSan,
      gameMove: exercise.playedMoveSan,
      engineMove: exercise.bestMoveSan,
      isExactGameMove: false,
      isEngineMove: false,
      gradingTier: "illegal",
      evalLossCp: null,
      isCorrect: false,
    };
  }

  const userUci = validation.uci;

  // Compute played move UCI for comparison
  const playedValidation = validateMove(exercise.fen, exercise.playedMoveSan);
  const playedMoveUci = playedValidation.valid ? playedValidation.uci : null;

  // 1. Check if user played the original game move
  const isExactGameMove =
    playedMoveUci !== null && userUci === playedMoveUci;

  // 2. Check if user played the engine's best move
  const isEngineMove =
    exercise.bestMoveUci !== undefined && userUci === exercise.bestMoveUci;

  if (isExactGameMove) {
    return {
      userMove: userSan,
      gameMove: exercise.playedMoveSan,
      engineMove: exercise.bestMoveSan,
      isExactGameMove: true,
      isEngineMove,
      gradingTier: "exact",
      evalLossCp: 0,
      isCorrect: true,
    };
  }

  if (isEngineMove) {
    return {
      userMove: userSan,
      gameMove: exercise.playedMoveSan,
      engineMove: exercise.bestMoveSan,
      isExactGameMove: false,
      isEngineMove: true,
      gradingTier: "acceptable",
      evalLossCp: 0,
      isCorrect: true,
    };
  }

  // 3. Neither — classify using eval loss
  const quality = classifyMoveQuality(
    userUci,
    exercise.bestMoveUci,
    playedMoveUci,
    exercise.evalSwing
  );

  return {
    userMove: userSan,
    gameMove: exercise.playedMoveSan,
    engineMove: exercise.bestMoveSan,
    isExactGameMove: false,
    isEngineMove: false,
    gradingTier: quality.gradingTier,
    evalLossCp: quality.evalLossCp,
    isCorrect: false,
  };
}
