/**
 * Load or initialize the exercise progress store.
 *
 * If the store file exists, loads it. Otherwise, initializes all
 * exercises from the corpus as "unseen".
 */

import type { TrainingExercise } from "../exercises/types";
import type { ExerciseProgress, ProgressStore } from "./types";
import { rebalanceDifficulty } from "../sessions/rebalance-difficulty";
import type { DifficultyCalibration } from "../sessions/types";

/**
 * Initialize a fresh progress entry for an exercise.
 */
function initExerciseProgress(
  exercise: TrainingExercise,
  calibration: DifficultyCalibration
): ExerciseProgress {
  return {
    exerciseId: exercise.positionId,
    gameId: exercise.gameId,
    positionId: exercise.positionId,
    lessonCategory: exercise.explanation.lessonCategory,
    difficultyEstimate: rebalanceDifficulty(
      exercise.explanation.difficultyScore,
      calibration
    ),
    status: "unseen",
    firstSeenAt: null,
    lastSeenAt: null,
    timesSeen: 0,
    timesCorrect: 0,
    timesIncorrect: 0,
    lastResult: null,
    nextReviewAt: null,
    intervalDays: 0,

    // M7C defaults
    lastGradingTier: null,
    rollingQualityScore: 0,
    averageEvalLossCp: null,
    recentEvalLossCp: null,
    reviewUrgency: 0,
    masteryState: "unseen",
  };
}

/**
 * Initialize a progress store from a full exercise corpus.
 *
 * @param exercises    All exercises
 * @param calibration  Difficulty calibration for rebalanced labels
 */
export function initProgressStore(
  exercises: TrainingExercise[],
  calibration: DifficultyCalibration
): ProgressStore {
  const store: Record<string, ExerciseProgress> = {};

  for (const ex of exercises) {
    store[ex.positionId] = initExerciseProgress(ex, calibration);
  }

  return {
    totalExercises: exercises.length,
    exercises: store,
    lastUpdatedAt: new Date().toISOString(),
  };
}

/**
 * Merge a loaded progress store with the current exercise corpus.
 *
 * New exercises not in the store are added as "unseen".
 * Existing entries are preserved.
 *
 * @param existing     Previously persisted store
 * @param exercises    Current full exercise corpus
 * @param calibration  Difficulty calibration
 */
export function mergeProgressStore(
  existing: ProgressStore,
  exercises: TrainingExercise[],
  calibration: DifficultyCalibration
): ProgressStore {
  const merged = { ...existing.exercises };

  for (const ex of exercises) {
    if (!merged[ex.positionId]) {
      merged[ex.positionId] = initExerciseProgress(ex, calibration);
    } else {
      // Backfill M7C fields for pre-M7C entries
      const entry = merged[ex.positionId];
      if (entry.lastGradingTier === undefined) {
        entry.lastGradingTier = null;
        entry.rollingQualityScore = 0;
        entry.averageEvalLossCp = null;
        entry.recentEvalLossCp = null;
        entry.reviewUrgency = 0;
        entry.masteryState =
          entry.timesSeen === 0 ? "unseen" : "learning";
      }
    }
  }

  return {
    totalExercises: Object.keys(merged).length,
    exercises: merged,
    lastUpdatedAt: new Date().toISOString(),
  };
}
