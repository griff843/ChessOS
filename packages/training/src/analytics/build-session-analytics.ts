/**
 * Build aggregated session analytics from graded puzzle attempts.
 *
 * Pure function: computes grade distribution, eval loss stats,
 * category/difficulty miss rates, and hardest missed positions.
 */

import type { PuzzleAttempt } from "../runner/types";
import type { GradingTier } from "../grading/eval-loss-bands";
import type { LessonCategory, DifficultyEstimate } from "../exercises/types";

/** Grade distribution counts. */
export type GradeDistribution = Record<GradingTier, number>;

/** Miss rate breakdown for a bucket (category or difficulty). */
export interface BucketMissRate {
  total: number;
  correct: number;
  incorrect: number;
  missRate: number;
  avgEvalLossCp: number | null;
}

/** A single hard-missed exercise for the "hardest missed" list. */
export interface HardMiss {
  exerciseId: string;
  exerciseIndex: number;
  fen: string;
  lessonCategory: LessonCategory;
  difficultyEstimate: DifficultyEstimate;
  userMove: string;
  engineMove: string;
  gradingTier: GradingTier;
  evalLossCp: number | null;
  sortKey: number;
}

/** Full session analytics artifact. */
export interface SessionAnalytics {
  sessionId: string;
  totalExercises: number;
  generatedAt: string;
  gradeDistribution: GradeDistribution;
  evalLossStats: {
    count: number;
    total: number;
    average: number | null;
    median: number | null;
    max: number | null;
  };
  byCategoryMissRate: Record<string, BucketMissRate>;
  byDifficultyMissRate: Record<string, BucketMissRate>;
  hardestMissed: HardMiss[];
}

const DIFFICULTY_ORDINAL: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

function emptyGradeDistribution(): GradeDistribution {
  return {
    exact: 0,
    acceptable: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
    illegal: 0,
  };
}

function computeBucketMissRate(
  attempts: PuzzleAttempt[]
): BucketMissRate {
  const total = attempts.length;
  const correct = attempts.filter((a) => a.isCorrect).length;
  const incorrect = total - correct;

  const knownLosses = attempts
    .filter((a) => !a.isCorrect && a.evalLossCp !== null)
    .map((a) => a.evalLossCp!);

  return {
    total,
    correct,
    incorrect,
    missRate: total > 0 ? incorrect / total : 0,
    avgEvalLossCp:
      knownLosses.length > 0
        ? knownLosses.reduce((s, v) => s + v, 0) / knownLosses.length
        : null,
  };
}

function computeMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Build session analytics from completed graded attempts.
 *
 * @param sessionId  Session identifier
 * @param attempts   All graded attempts from the session
 * @param topN       Number of hardest misses to include (default 5)
 */
export function buildSessionAnalytics(
  sessionId: string,
  attempts: PuzzleAttempt[],
  topN: number = 5
): SessionAnalytics {
  // Grade distribution
  const gradeDistribution = emptyGradeDistribution();
  for (const a of attempts) {
    const tier = a.gradingTier ?? (a.isCorrect ? "exact" : "inaccuracy");
    gradeDistribution[tier]++;
  }

  // Eval loss stats (over known non-zero losses)
  const knownLosses = attempts
    .filter((a) => a.evalLossCp !== null && a.evalLossCp > 0)
    .map((a) => a.evalLossCp!);

  const evalLossStats = {
    count: knownLosses.length,
    total: knownLosses.reduce((s, v) => s + v, 0),
    average:
      knownLosses.length > 0
        ? knownLosses.reduce((s, v) => s + v, 0) / knownLosses.length
        : null,
    median: computeMedian(knownLosses),
    max: knownLosses.length > 0 ? Math.max(...knownLosses) : null,
  };

  // Category miss rates
  const byCategory = new Map<string, PuzzleAttempt[]>();
  for (const a of attempts) {
    const cat = a.lessonCategory;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(a);
  }
  const byCategoryMissRate: Record<string, BucketMissRate> = {};
  for (const [cat, group] of byCategory) {
    byCategoryMissRate[cat] = computeBucketMissRate(group);
  }

  // Difficulty miss rates
  const byDifficulty = new Map<string, PuzzleAttempt[]>();
  for (const a of attempts) {
    const diff = a.difficultyEstimate;
    if (!byDifficulty.has(diff)) byDifficulty.set(diff, []);
    byDifficulty.get(diff)!.push(a);
  }
  const byDifficultyMissRate: Record<string, BucketMissRate> = {};
  for (const [diff, group] of byDifficulty) {
    byDifficultyMissRate[diff] = computeBucketMissRate(group);
  }

  // Hardest missed: non-exact, sorted by evalLossCp desc (known first),
  // then difficulty ordinal desc for unknown losses
  const missed = attempts
    .filter((a) => !a.isCorrect)
    .map((a): HardMiss => ({
      exerciseId: a.exerciseId,
      exerciseIndex: a.exerciseIndex,
      fen: a.fen,
      lessonCategory: a.lessonCategory,
      difficultyEstimate: a.difficultyEstimate,
      userMove: a.userMove,
      engineMove: a.engineMove,
      gradingTier: a.gradingTier,
      evalLossCp: a.evalLossCp,
      sortKey:
        a.evalLossCp !== null
          ? a.evalLossCp
          : DIFFICULTY_ORDINAL[a.difficultyEstimate] ?? 2,
    }))
    .sort((a, b) => {
      // Known losses first (higher = worse), then unknown by difficulty
      const aKnown = a.evalLossCp !== null ? 1 : 0;
      const bKnown = b.evalLossCp !== null ? 1 : 0;
      if (aKnown !== bKnown) return bKnown - aKnown;
      return b.sortKey - a.sortKey;
    })
    .slice(0, topN);

  return {
    sessionId,
    totalExercises: attempts.length,
    generatedAt: new Date().toISOString(),
    gradeDistribution,
    evalLossStats,
    byCategoryMissRate,
    byDifficultyMissRate,
    hardestMissed: missed,
  };
}
