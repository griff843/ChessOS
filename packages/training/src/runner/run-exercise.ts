/**
 * Pure exercise runner — processes a single puzzle attempt.
 *
 * Takes a validated user move and the enriched exercise data,
 * returns a PuzzleAttempt recording correctness.
 */

import type { PuzzleAttempt, EnrichedExercise } from "./types";

/**
 * Build a PuzzleAttempt from a validated user move.
 *
 * @param exercise   Enriched exercise with engine answer
 * @param index      0-based exercise index in the session
 * @param userSan    User's move in SAN notation (already validated)
 * @param userUci    User's move in UCI notation (already validated)
 * @returns A completed PuzzleAttempt
 */
export function runExercise(
  exercise: EnrichedExercise,
  index: number,
  userSan: string,
  userUci: string
): PuzzleAttempt {
  const isCorrect = userUci === exercise.bestMoveUci;

  return {
    exerciseId: exercise.exerciseId,
    exerciseIndex: index,
    fen: exercise.fen,
    sideToMove: exercise.sideToMove,
    lessonCategory: exercise.lessonCategory,
    difficultyEstimate: exercise.difficultyEstimate,
    playedMoveSan: exercise.playedMoveSan,
    userMove: userSan,
    userMoveUci: userUci,
    engineMove: exercise.bestMoveSan ?? exercise.bestMoveUci,
    engineMoveUci: exercise.bestMoveUci,
    isCorrect,
    gradingTier: isCorrect ? "exact" : "inaccuracy",
    evalLossCp: isCorrect ? 0 : null,
    timestamp: new Date().toISOString(),
  };
}
