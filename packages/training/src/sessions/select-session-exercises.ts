/**
 * Deterministic session exercise selection.
 *
 * Algorithm:
 *   1. Rebalance all exercises using percentile-based difficulty thresholds
 *   2. Group exercises by rebalanced difficulty tier
 *   3. Sort within each group by targetPriority descending
 *   4. Pick target distribution (default: 3 easy, 4 medium, 3 hard)
 *   5. For each slot, pick the highest-priority exercise that:
 *      a. Has not already been selected
 *      b. Does not violate category cap (max 40% from same category)
 *   6. If a pool is exhausted, degrade gracefully:
 *      fill from adjacent pools (medium → easy/hard)
 *
 * The algorithm is fully deterministic: same input → same output.
 */

import type { TrainingExercise, LessonCategory, DifficultyEstimate } from "../exercises/types";
import type { DifficultyCalibration, SessionExercise, SessionConfig } from "./types";
import { DEFAULT_SESSION_CONFIG } from "./types";
import { rebalanceDifficulty } from "./rebalance-difficulty";

interface CandidateExercise {
  exercise: TrainingExercise;
  rebalancedDifficulty: DifficultyEstimate;
}

/**
 * Check if adding a category would violate the max category constraint.
 */
function wouldViolateCategoryCap(
  categoryCounts: Map<string, number>,
  category: LessonCategory,
  currentSize: number,
  maxCategoryPercent: number,
  sessionSize: number
): boolean {
  const currentCount = categoryCounts.get(category) ?? 0;
  const maxAllowed = Math.floor(sessionSize * maxCategoryPercent);
  return currentCount + 1 > maxAllowed;
}

/**
 * Pick exercises from a pool respecting category constraints.
 * Returns the picked exercises and mutates selectedIds and categoryCounts.
 */
function pickFromPool(
  pool: CandidateExercise[],
  count: number,
  selectedIds: Set<string>,
  categoryCounts: Map<string, number>,
  currentSessionSize: number,
  config: SessionConfig
): SessionExercise[] {
  const picked: SessionExercise[] = [];
  let filled = 0;

  for (const candidate of pool) {
    if (filled >= count) break;

    const ex = candidate.exercise;
    const exId = ex.positionId;

    // Skip duplicates
    if (selectedIds.has(exId)) continue;

    // Skip exercises without a valid engine answer
    if (!ex.engineAnswer.bestMoveSan) continue;

    // Check category cap
    if (
      wouldViolateCategoryCap(
        categoryCounts,
        ex.explanation.lessonCategory,
        currentSessionSize + filled,
        config.maxCategoryPercent,
        config.sessionSize
      )
    ) {
      continue;
    }

    selectedIds.add(exId);
    categoryCounts.set(
      ex.explanation.lessonCategory,
      (categoryCounts.get(ex.explanation.lessonCategory) ?? 0) + 1
    );

    picked.push({
      exerciseId: exId,
      gameId: ex.gameId,
      ply: ex.ply,
      fen: ex.fen,
      sideToMove: ex.sideToMove,
      phase: ex.phase,
      playedMoveSan: ex.playedMoveSan,
      bestMoveSan: ex.engineAnswer.bestMoveSan,
      lessonCategory: ex.explanation.lessonCategory,
      difficultyEstimate: candidate.rebalancedDifficulty,
      difficultyScore: ex.explanation.difficultyScore,
      predictedRisk: ex.predictedRisk,
      targetPriority: ex.targetPriority,
    });

    filled++;
  }

  return picked;
}

/**
 * Select exercises for a study session.
 *
 * @param exercises     All available exercises
 * @param calibration   Difficulty calibration thresholds
 * @param config        Session generation config
 * @returns Selected session exercises in priority order
 */
export function selectSessionExercises(
  exercises: TrainingExercise[],
  calibration: DifficultyCalibration,
  config: SessionConfig = DEFAULT_SESSION_CONFIG
): SessionExercise[] {
  // 1. Rebalance and group by difficulty
  const candidates: CandidateExercise[] = exercises.map((ex) => ({
    exercise: ex,
    rebalancedDifficulty: rebalanceDifficulty(
      ex.explanation.difficultyScore,
      calibration
    ),
  }));

  const pools: Record<DifficultyEstimate, CandidateExercise[]> = {
    easy: [],
    medium: [],
    hard: [],
  };

  for (const c of candidates) {
    pools[c.rebalancedDifficulty].push(c);
  }

  // 2. Preserve input order within each pool.
  //    The caller is responsible for pre-sorting exercises (e.g., by
  //    progress priority then targetPriority via prioritizeByProgress).
  //    If the input is not pre-sorted, the natural corpus order is used.

  // 3. Pick target distribution
  const selectedIds = new Set<string>();
  const categoryCounts = new Map<string, number>();
  const selected: SessionExercise[] = [];

  const tierOrder: DifficultyEstimate[] = ["easy", "medium", "hard"];
  const targets = config.difficultyDistribution;

  for (const tier of tierOrder) {
    const wanted = targets[tier];
    const picked = pickFromPool(
      pools[tier],
      wanted,
      selectedIds,
      categoryCounts,
      selected.length,
      config
    );
    selected.push(...picked);
  }

  // 4. Graceful degradation: if we didn't fill the session, pull from
  //    any pool (prioritizing medium → easy → hard)
  const remaining = config.sessionSize - selected.length;
  if (remaining > 0) {
    const fallbackOrder: DifficultyEstimate[] = ["medium", "easy", "hard"];
    for (const tier of fallbackOrder) {
      if (selected.length >= config.sessionSize) break;
      const needed = config.sessionSize - selected.length;
      const picked = pickFromPool(
        pools[tier],
        needed,
        selectedIds,
        categoryCounts,
        selected.length,
        config
      );
      selected.push(...picked);
    }
  }

  return selected;
}
