/**
 * Build a trend profile from the progress store and session history.
 *
 * Computes both lifetime stats (from ProgressStore) and recent stats
 * (from the last N attempts per bucket in session history).
 *
 * Recent window: last RECENT_WINDOW_SIZE (10) attempts per bucket,
 * extracted from completed sessions in chronological order.
 */

import type { ProgressStore, SessionHistoryRecord } from "../progress/types";
import type { TrendProfile, TrendBucket } from "./types";
import { RECENT_WINDOW_SIZE } from "./types";

/**
 * A single attempt record extracted from session history.
 */
interface AttemptRecord {
  exerciseId: string;
  result: "correct" | "incorrect";
  category: string;
  difficulty: string;
}

/**
 * Create an empty trend bucket.
 */
function emptyTrendBucket(): TrendBucket {
  return {
    lifetimeSeen: 0,
    lifetimeCorrect: 0,
    lifetimeIncorrect: 0,
    lifetimeAccuracy: 0,
    lifetimeMissRate: 0,
    recentSeen: 0,
    recentCorrect: 0,
    recentIncorrect: 0,
    recentAccuracy: 0,
    recentMissRate: 0,
    trendDirection: "insufficient_data",
    recencyWeightedMissRate: 0,
    adaptiveWeight: 1.0,
    dueCount: 0,
  };
}

/**
 * Ensure a bucket exists for a key, returning it.
 */
function ensureBucket(
  buckets: Record<string, TrendBucket>,
  key: string
): TrendBucket {
  if (!buckets[key]) {
    buckets[key] = emptyTrendBucket();
  }
  return buckets[key];
}

/**
 * Extract a chronological list of attempt records from session history.
 *
 * Only includes completed sessions (completedAt != null, results != null).
 * Results are ordered by session completedAt, then by position within session.
 *
 * @param history  Session history records (in append order from JSONL)
 * @param store    Progress store for exercise metadata lookup
 * @returns Chronological attempt records with category/difficulty
 */
function extractAttempts(
  history: SessionHistoryRecord[],
  store: ProgressStore
): AttemptRecord[] {
  // Filter to completed sessions with results
  const completed = history.filter(
    (h) => h.completedAt !== null && h.results !== null && h.results.length > 0
  );

  // Sort by completedAt ascending (chronological)
  completed.sort((a, b) =>
    (a.completedAt ?? "").localeCompare(b.completedAt ?? "")
  );

  const attempts: AttemptRecord[] = [];
  for (const session of completed) {
    for (const result of session.results!) {
      const entry = store.exercises[result.exerciseId];
      if (!entry) continue;

      attempts.push({
        exerciseId: result.exerciseId,
        result: result.result,
        category: entry.lessonCategory,
        difficulty: entry.difficultyEstimate,
      });
    }
  }

  return attempts;
}

/**
 * Build a trend profile from progress data and session history.
 *
 * @param store    Current progress store
 * @param history  Session history records from JSONL
 * @returns TrendProfile with lifetime stats populated and recent stats
 *          from the last RECENT_WINDOW_SIZE attempts per bucket.
 *          Trend direction and adaptive weights are NOT computed yet —
 *          call determineTrendDirections() and computeRecencyWeights()
 *          after this.
 */
export function buildTrendProfile(
  store: ProgressStore,
  history: SessionHistoryRecord[]
): TrendProfile {
  const byCategory: Record<string, TrendBucket> = {};
  const byDifficulty: Record<string, TrendBucket> = {};

  let totalSeen = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;

  // 1. Compute lifetime stats from progress store
  for (const entry of Object.values(store.exercises)) {
    const catBucket = ensureBucket(byCategory, entry.lessonCategory);
    const diffBucket = ensureBucket(byDifficulty, entry.difficultyEstimate);

    const seen = entry.timesSeen > 0;
    if (seen) {
      totalSeen++;
      catBucket.lifetimeSeen++;
      diffBucket.lifetimeSeen++;
    }

    catBucket.lifetimeCorrect += entry.timesCorrect;
    catBucket.lifetimeIncorrect += entry.timesIncorrect;
    diffBucket.lifetimeCorrect += entry.timesCorrect;
    diffBucket.lifetimeIncorrect += entry.timesIncorrect;

    totalCorrect += entry.timesCorrect;
    totalIncorrect += entry.timesIncorrect;

    if (entry.status === "due_for_review") {
      catBucket.dueCount++;
      diffBucket.dueCount++;
    }
  }

  // Compute lifetime accuracy and missRate
  for (const bucket of [
    ...Object.values(byCategory),
    ...Object.values(byDifficulty),
  ]) {
    const attempts = Math.max(
      bucket.lifetimeCorrect + bucket.lifetimeIncorrect,
      1
    );
    bucket.lifetimeAccuracy = bucket.lifetimeCorrect / attempts;
    bucket.lifetimeMissRate = Math.min(
      bucket.lifetimeIncorrect / Math.max(bucket.lifetimeSeen, 1),
      1.0
    );
  }

  // 2. Compute recent stats from session history
  const attempts = extractAttempts(history, store);

  // Group attempts by bucket, keeping last N per bucket
  const recentByCategory = new Map<string, AttemptRecord[]>();
  const recentByDifficulty = new Map<string, AttemptRecord[]>();

  for (const attempt of attempts) {
    // Category
    if (!recentByCategory.has(attempt.category)) {
      recentByCategory.set(attempt.category, []);
    }
    recentByCategory.get(attempt.category)!.push(attempt);

    // Difficulty
    if (!recentByDifficulty.has(attempt.difficulty)) {
      recentByDifficulty.set(attempt.difficulty, []);
    }
    recentByDifficulty.get(attempt.difficulty)!.push(attempt);
  }

  // Fill recent stats (last N per bucket)
  for (const [key, records] of recentByCategory) {
    const bucket = ensureBucket(byCategory, key);
    const recent = records.slice(-RECENT_WINDOW_SIZE);
    bucket.recentSeen = recent.length;
    bucket.recentCorrect = recent.filter((r) => r.result === "correct").length;
    bucket.recentIncorrect = recent.filter(
      (r) => r.result === "incorrect"
    ).length;
    const recentAttempts = Math.max(
      bucket.recentCorrect + bucket.recentIncorrect,
      1
    );
    bucket.recentAccuracy = bucket.recentCorrect / recentAttempts;
    bucket.recentMissRate = Math.min(
      bucket.recentIncorrect / Math.max(bucket.recentSeen, 1),
      1.0
    );
  }

  for (const [key, records] of recentByDifficulty) {
    const bucket = ensureBucket(byDifficulty, key);
    const recent = records.slice(-RECENT_WINDOW_SIZE);
    bucket.recentSeen = recent.length;
    bucket.recentCorrect = recent.filter((r) => r.result === "correct").length;
    bucket.recentIncorrect = recent.filter(
      (r) => r.result === "incorrect"
    ).length;
    const recentAttempts = Math.max(
      bucket.recentCorrect + bucket.recentIncorrect,
      1
    );
    bucket.recentAccuracy = bucket.recentCorrect / recentAttempts;
    bucket.recentMissRate = Math.min(
      bucket.recentIncorrect / Math.max(bucket.recentSeen, 1),
      1.0
    );
  }

  const totalAttempts = Math.max(totalCorrect + totalIncorrect, 1);

  return {
    generatedAt: new Date().toISOString(),
    recentWindowSize: RECENT_WINDOW_SIZE,
    totalExercises: store.totalExercises,
    totalSeen,
    totalCorrect,
    totalIncorrect,
    overallAccuracy: totalCorrect / totalAttempts,
    byCategory,
    byDifficulty,
  };
}
