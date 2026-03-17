/**
 * Adaptive session generation types.
 *
 * The weakness profile aggregates learner performance along multiple axes
 * to enable adaptive session selection that emphasizes weak areas.
 */

import type { LessonCategory, DifficultyEstimate } from "../exercises/types";

/**
 * A single performance bucket along any axis.
 *
 * Contains raw counts, derived rates, and the computed adaptive weight.
 */
export interface PerformanceBucket {
  /** Number of exercises in this bucket that have been seen at least once */
  seenCount: number;
  /** Total correct answers across exercises in this bucket */
  correctCount: number;
  /** Total incorrect answers across exercises in this bucket */
  incorrectCount: number;
  /** correctCount / max(correctCount + incorrectCount, 1) */
  accuracy: number;
  /** incorrectCount / max(seenCount, 1), clamped to [0, 1] */
  missRate: number;
  /** Number of exercises currently due for review in this bucket */
  dueCount: number;
  /** Adaptive selection weight: 1.0 + missRate, bounded [1.0, 2.0] */
  adaptiveWeight: number;
}

/**
 * Weakness profile derived from exercise progress data.
 *
 * Aggregates performance along three axes:
 *   1. Lesson category (e.g., material_loss, calculation_error)
 *   2. Difficulty estimate (easy, medium, hard)
 *   3. Game phase (opening, middlegame, endgame)
 *
 * Used to compute adaptive weights for session generation.
 */
export interface WeaknessProfile {
  generatedAt: string;
  totalExercises: number;
  totalSeen: number;
  totalCorrect: number;
  totalIncorrect: number;
  overallAccuracy: number;
  overallMissRate: number;
  byCategory: Record<string, PerformanceBucket>;
  byDifficulty: Record<string, PerformanceBucket>;
  byPhase: Record<string, PerformanceBucket>;
}

/**
 * Adaptive weights extracted from a WeaknessProfile for quick lookup.
 */
export interface AdaptiveWeights {
  categoryWeights: Record<string, number>;
  difficultyWeights: Record<string, number>;
  phaseWeights: Record<string, number>;
}

/**
 * Learner summary for the markdown report.
 */
export interface LearnerSummary {
  generatedAt: string;
  totalExercises: number;
  totalSeen: number;
  totalCorrect: number;
  totalIncorrect: number;
  overallAccuracy: number;
  overdueCount: number;
  strongestCategories: string[];
  weakestCategories: string[];
  strongestDifficulty: string | null;
  weakestDifficulty: string | null;
}
