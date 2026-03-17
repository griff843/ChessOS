/**
 * Build training exercises for a game.
 *
 * Orchestrates: target loading → engine answer extraction →
 *   lesson classification → difficulty estimation → reason codes.
 *
 * Input: training targets (from M5C) + training dataset rows (for engine data).
 * Output: enriched exercises with answer key and explanation scaffold.
 */

import type { TrainingDatasetRow } from "../dataset/types";
import type { TrainingTarget, TrainingTargetsResult } from "../targets/types";
import type { TrainingExercise, TrainingExercisesResult } from "./types";
import { extractEngineAnswer } from "./extract-engine-answer";
import { classifyLessonCategory } from "./classify-lesson-category";
import { estimateDifficulty } from "./estimate-difficulty";
import { generateReasonCodes } from "./generate-reason-codes";

/**
 * Build exercises for a single game.
 *
 * @param targetsResult  Training targets result from M5C
 * @param rows           All dataset rows for the game (for engine data lookup)
 */
export function buildGameTrainingExercises(
  targetsResult: TrainingTargetsResult,
  rows: TrainingDatasetRow[]
): TrainingExercisesResult {
  // Index rows by positionId for fast lookup
  const rowsByPosition = new Map<string, TrainingDatasetRow>();
  for (const row of rows) {
    rowsByPosition.set(row.positionId, row);
  }

  const exercises: TrainingExercise[] = [];

  for (const target of targetsResult.targets) {
    const row = rowsByPosition.get(target.positionId);
    if (!row) continue;

    // Part A: Engine answer extraction
    const engineAnswer = extractEngineAnswer(
      row.fen,
      row.bestMove,
      row.pv,
      row.evalCp,
      row.swingCp,
      row.mover
    );

    // Part B: Lesson category classification
    const lessonCategory = classifyLessonCategory(
      target.targetType,
      engineAnswer.evalSwing,
      target.phase,
      engineAnswer.pv.length
    );

    // Part C: Difficulty estimate
    const { estimate: difficultyEstimate, score: difficultyScore } =
      estimateDifficulty(
        engineAnswer.pv.length,
        target.predictedRisk,
        engineAnswer.evalSwing,
        target.phase
      );

    // Part D: Reason codes
    const reasonCodes = generateReasonCodes(
      engineAnswer.evalSwing,
      engineAnswer.evalBefore,
      target.criticalityScore,
      target.actualLabel,
      target.targetType,
      target.phase,
      engineAnswer.pv.length,
      target.ply
    );

    const exercise: TrainingExercise = {
      gameId: target.gameId,
      positionId: target.positionId,
      ply: target.ply,
      fen: target.fen,
      sideToMove: target.mover,
      heroColor: target.heroColor,
      perspective: target.perspective,
      phase: target.phase,

      playedMoveSan: target.moveSan,

      engineAnswer,

      targetType: target.targetType,
      targetPriority: target.targetPriority,
      predictedRisk: target.predictedRisk,
      criticalityScore: target.criticalityScore,
      criticalityFactors: target.criticalityFactors,
      priorityFactors: target.priorityFactors,
      actualLabel: target.actualLabel,

      explanation: {
        lessonCategory,
        reasonCodes,
        difficultyEstimate,
        difficultyScore,
      },

      rank: target.rank,
    };

    exercises.push(exercise);
  }

  return {
    gameId: targetsResult.gameId,
    totalTargets: targetsResult.targets.length,
    exercises,
    generatedAt: new Date().toISOString(),
  };
}
