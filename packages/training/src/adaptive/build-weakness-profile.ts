/**
 * Build a weakness profile from the progress store and exercise metadata.
 *
 * Aggregates performance along three axes:
 *   1. Lesson category (from ExerciseProgress)
 *   2. Difficulty estimate (from ExerciseProgress)
 *   3. Game phase (from TrainingExercise corpus)
 *
 * The profile is canonical input for adaptive weighting and objective selection.
 */

import type { ProgressStore } from "../progress/types";
import type { TrainingExercise } from "../exercises/types";
import type { WeaknessProfile, PerformanceBucket } from "./types";

function emptyBucket(): PerformanceBucket {
  return {
    seenCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    accuracy: 0,
    missRate: 0,
    dueCount: 0,
    adaptiveWeight: 1.0,
  };
}

function ensureBucket(
  buckets: Record<string, PerformanceBucket>,
  key: string
): PerformanceBucket {
  if (!buckets[key]) {
    buckets[key] = emptyBucket();
  }
  return buckets[key];
}

function finalizeBuckets(buckets: Record<string, PerformanceBucket>): void {
  for (const bucket of Object.values(buckets)) {
    const attempts = Math.max(bucket.correctCount + bucket.incorrectCount, 1);
    bucket.accuracy = bucket.correctCount / attempts;
    bucket.missRate = Math.min(bucket.incorrectCount / Math.max(bucket.seenCount, 1), 1.0);
  }
}

export function buildWeaknessProfile(
  store: ProgressStore,
  exercises: TrainingExercise[]
): WeaknessProfile {
  const phaseByExerciseId = new Map<string, string>();
  for (const ex of exercises) {
    phaseByExerciseId.set(ex.positionId, ex.phase);
  }

  const byCategory: Record<string, PerformanceBucket> = {};
  const byDifficulty: Record<string, PerformanceBucket> = {};
  const byPhase: Record<string, PerformanceBucket> = {};

  let totalSeen = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;

  for (const entry of Object.values(store.exercises)) {
    const catBucket = ensureBucket(byCategory, entry.lessonCategory);
    const diffBucket = ensureBucket(byDifficulty, entry.difficultyEstimate);

    const phase = phaseByExerciseId.get(entry.exerciseId);
    const phaseBucket = phase ? ensureBucket(byPhase, phase) : null;

    if (entry.timesSeen > 0) {
      totalSeen++;
      catBucket.seenCount++;
      diffBucket.seenCount++;
      if (phaseBucket) phaseBucket.seenCount++;
    }

    catBucket.correctCount += entry.timesCorrect;
    catBucket.incorrectCount += entry.timesIncorrect;
    diffBucket.correctCount += entry.timesCorrect;
    diffBucket.incorrectCount += entry.timesIncorrect;
    if (phaseBucket) {
      phaseBucket.correctCount += entry.timesCorrect;
      phaseBucket.incorrectCount += entry.timesIncorrect;
    }

    totalCorrect += entry.timesCorrect;
    totalIncorrect += entry.timesIncorrect;

    if (entry.status === "due_for_review") {
      catBucket.dueCount++;
      diffBucket.dueCount++;
      if (phaseBucket) phaseBucket.dueCount++;
    }
  }

  finalizeBuckets(byCategory);
  finalizeBuckets(byDifficulty);
  finalizeBuckets(byPhase);

  const totalAttempts = Math.max(totalCorrect + totalIncorrect, 1);

  return {
    generatedAt: new Date().toISOString(),
    totalExercises: store.totalExercises,
    totalSeen,
    totalCorrect,
    totalIncorrect,
    overallAccuracy: totalCorrect / totalAttempts,
    overallMissRate: Math.min(totalIncorrect / Math.max(totalSeen, 1), 1.0),
    byCategory,
    byDifficulty,
    byPhase,
  };
}
