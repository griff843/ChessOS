/**
 * Grade a puzzle attempt with tiered move quality.
 *
 * Replaces runExercise as the primary attempt builder for M7B+.
 * Returns a PuzzleAttempt with gradingTier and evalLossCp populated
 * alongside the existing isCorrect for backward compatibility.
 */

import type { EnrichedExercise, PuzzleAttempt } from "../runner/types";
import type { GradingTier } from "./eval-loss-bands";
import { classifyMoveQuality } from "./classify-move-quality";
import { DEFAULT_UNKNOWN_TIER } from "./eval-loss-bands";

/**
 * Build a graded PuzzleAttempt from a validated user move.
 *
 * @param exercise     Enriched exercise with engine answer and playedMoveUci
 * @param index        0-based exercise index in the session
 * @param userSan      User's move in SAN notation (already validated)
 * @param userUci      User's move in UCI notation (already validated)
 * @param unknownTier  Tier for moves with unknown eval loss
 */
export function gradeAttempt(
  exercise: EnrichedExercise,
  index: number,
  userSan: string,
  userUci: string,
  unknownTier: GradingTier = DEFAULT_UNKNOWN_TIER
): PuzzleAttempt {
  const quality = classifyMoveQuality(
    userUci,
    exercise.bestMoveUci,
    exercise.playedMoveUci ?? null,
    exercise.evalSwing,
    unknownTier
  );

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
    isCorrect: quality.isExact,
    gradingTier: quality.gradingTier,
    evalLossCp: quality.evalLossCp,
    timestamp: new Date().toISOString(),
  };
}
