/**
 * Pattern intelligence: structural weakness profiling.
 *
 * Cross-tabulates category × difficulty performance, computes
 * recurrence scores per category, and tracks eval loss trends.
 *
 * All pure — no I/O, deterministic given inputs.
 */

import type { ProgressStore } from "../progress/types.js";
import type { TrendProfile } from "../trends/types.js";
import type { ReviewQueue } from "../mastery/build-review-queue.js";
import type {
  PatternIntelligence,
  CrossCell,
  RecurrenceEntry,
  RecurrenceFactors,
  StrategicEvalLossTrend,
  RecurrenceSeverity,
} from "./types.js";

// ── Helpers ───────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const DIRECTION_FACTOR: Record<string, number> = {
  worsening: 1.0,
  stable: 0.5,
  improving: 0.0,
  insufficient_data: 0.25,
};

/** Recurrence threshold — categories with score >= this are recurring. */
const RECURRENCE_THRESHOLD = 0.4;

/** Minimum exercises with eval data to compute eval loss trend. */
const MIN_EVAL_EXERCISES = 3;

/** Eval loss delta threshold in centipawns. */
const EVAL_LOSS_DELTA_THRESHOLD = 20;

// ── Severity Classification ──────────────────────────────────────

function classifySeverity(
  missRate: number,
  trendDirection: string
): RecurrenceSeverity {
  if (missRate >= 0.5) return "critical";
  if (trendDirection === "worsening" && missRate >= 0.3) return "critical";
  if (missRate >= 0.25) return "moderate";
  return "minor";
}

// ── Cross-Tabulation ─────────────────────────────────────────────

interface CellAccumulator {
  seen: number;
  correct: number;
  incorrect: number;
  evalLossSum: number;
  evalLossCount: number;
}

function buildCrossTable(store: ProgressStore): CrossCell[] {
  const cells = new Map<string, CellAccumulator>();

  for (const ex of Object.values(store.exercises)) {
    const key = `${ex.lessonCategory}:${ex.difficultyEstimate}`;
    let cell = cells.get(key);
    if (!cell) {
      cell = { seen: 0, correct: 0, incorrect: 0, evalLossSum: 0, evalLossCount: 0 };
      cells.set(key, cell);
    }
    cell.seen += ex.timesSeen;
    cell.correct += ex.timesCorrect;
    cell.incorrect += ex.timesIncorrect;
    if (ex.averageEvalLossCp !== null) {
      cell.evalLossSum += ex.averageEvalLossCp;
      cell.evalLossCount++;
    }
  }

  const result: CrossCell[] = [];
  for (const [key, cell] of cells.entries()) {
    const [category, difficulty] = key.split(":");
    const total = cell.correct + cell.incorrect;
    const accuracy = total > 0 ? cell.correct / total : 1;
    result.push({
      category,
      difficulty,
      seenCount: cell.seen,
      correctCount: cell.correct,
      incorrectCount: cell.incorrect,
      accuracy,
      missRate: 1 - accuracy,
      avgEvalLossCp:
        cell.evalLossCount > 0
          ? cell.evalLossSum / cell.evalLossCount
          : null,
    });
  }

  return result.sort((a, b) => b.missRate - a.missRate);
}

// ── Per-Category Aggregation ─────────────────────────────────────

interface CategoryStats {
  totalExercises: number;
  seenCount: number;
  correctCount: number;
  incorrectCount: number;
  lifetimeMissRate: number;
}

function aggregateByCategory(store: ProgressStore): Map<string, CategoryStats> {
  const map = new Map<string, CategoryStats>();

  for (const ex of Object.values(store.exercises)) {
    const cat = ex.lessonCategory;
    let stats = map.get(cat);
    if (!stats) {
      stats = {
        totalExercises: 0,
        seenCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        lifetimeMissRate: 0,
      };
      map.set(cat, stats);
    }
    stats.totalExercises++;
    stats.seenCount += ex.timesSeen;
    stats.correctCount += ex.timesCorrect;
    stats.incorrectCount += ex.timesIncorrect;
  }

  // Compute miss rates
  for (const stats of map.values()) {
    const total = stats.correctCount + stats.incorrectCount;
    stats.lifetimeMissRate = total > 0 ? stats.incorrectCount / total : 0;
  }

  return map;
}

// ── Recurrence Scoring ───────────────────────────────────────────

function buildRecurrenceEntries(
  categoryStats: Map<string, CategoryStats>,
  trendProfile: TrendProfile,
  overdueByCategory: Map<string, number>
): RecurrenceEntry[] {
  const entries: RecurrenceEntry[] = [];

  for (const [category, stats] of categoryStats.entries()) {
    const bucket = trendProfile.byCategory[category];
    const direction = bucket?.trendDirection ?? "insufficient_data";
    const overdueCount = overdueByCategory.get(category) ?? 0;

    const factors: RecurrenceFactors = {
      persistenceFactor: clamp(stats.lifetimeMissRate, 0, 1),
      directionFactor: DIRECTION_FACTOR[direction] ?? 0.25,
      reviewBurdenFactor: Math.min(
        overdueCount / Math.max(stats.seenCount, 1),
        1.0
      ),
      frequencyFactor: Math.min(
        stats.incorrectCount / Math.max(stats.totalExercises, 1),
        1.0
      ),
    };

    const recurrenceScore =
      factors.persistenceFactor * 0.35 +
      factors.directionFactor * 0.25 +
      factors.reviewBurdenFactor * 0.2 +
      factors.frequencyFactor * 0.2;

    entries.push({
      category,
      recurrenceScore,
      factors,
      severity: classifySeverity(stats.lifetimeMissRate, direction),
      isRecurring: recurrenceScore >= RECURRENCE_THRESHOLD,
    });
  }

  return entries.sort((a, b) => b.recurrenceScore - a.recurrenceScore);
}

// ── Eval Loss Trends ─────────────────────────────────────────────

function buildEvalLossTrends(
  store: ProgressStore,
  categoryStats: Map<string, CategoryStats>
): StrategicEvalLossTrend[] {
  // Accumulate per-category eval loss data
  const recentByCat = new Map<string, { sum: number; count: number }>();
  const lifetimeByCat = new Map<string, { sum: number; count: number }>();

  for (const ex of Object.values(store.exercises)) {
    const cat = ex.lessonCategory;
    if (ex.recentEvalLossCp !== null) {
      let r = recentByCat.get(cat);
      if (!r) {
        r = { sum: 0, count: 0 };
        recentByCat.set(cat, r);
      }
      r.sum += ex.recentEvalLossCp;
      r.count++;
    }
    if (ex.averageEvalLossCp !== null) {
      let l = lifetimeByCat.get(cat);
      if (!l) {
        l = { sum: 0, count: 0 };
        lifetimeByCat.set(cat, l);
      }
      l.sum += ex.averageEvalLossCp;
      l.count++;
    }
  }

  const trends: StrategicEvalLossTrend[] = [];
  for (const category of categoryStats.keys()) {
    const recent = recentByCat.get(category);
    const lifetime = lifetimeByCat.get(category);

    const recentAvg =
      recent && recent.count >= MIN_EVAL_EXERCISES
        ? recent.sum / recent.count
        : null;
    const lifetimeAvg =
      lifetime && lifetime.count >= MIN_EVAL_EXERCISES
        ? lifetime.sum / lifetime.count
        : null;

    let direction: StrategicEvalLossTrend["direction"] = "insufficient_data";
    if (recentAvg !== null && lifetimeAvg !== null) {
      const delta = recentAvg - lifetimeAvg;
      if (delta > EVAL_LOSS_DELTA_THRESHOLD) direction = "worsening";
      else if (delta < -EVAL_LOSS_DELTA_THRESHOLD) direction = "improving";
      else direction = "stable";
    }

    trends.push({
      category,
      recentAvgEvalLossCp: recentAvg,
      lifetimeAvgEvalLossCp: lifetimeAvg,
      direction,
    });
  }

  return trends;
}

// ── Top Vulnerability ────────────────────────────────────────────

function findTopVulnerability(
  crossTable: CrossCell[],
  recurringCategories: Set<string>
): PatternIntelligence["topVulnerability"] {
  let best: PatternIntelligence["topVulnerability"] = null;

  for (const cell of crossTable) {
    if (!recurringCategories.has(cell.category)) continue;
    if (cell.seenCount < 3) continue;
    if (!best || cell.missRate > best.missRate) {
      best = {
        category: cell.category,
        difficulty: cell.difficulty,
        missRate: cell.missRate,
      };
    }
  }

  return best;
}

// ── Main ─────────────────────────────────────────────────────────

/**
 * Build pattern intelligence from store, trend profile, and review queue.
 *
 * Pure function — no I/O, deterministic.
 */
export function buildPatternIntelligence(
  store: ProgressStore,
  trendProfile: TrendProfile,
  reviewQueue: ReviewQueue
): PatternIntelligence {
  // Count overdue exercises per category
  const overdueByCategory = new Map<string, number>();
  for (const entry of reviewQueue.entries) {
    if (entry.reason === "overdue") {
      const ex = store.exercises[entry.exerciseId];
      if (ex) {
        overdueByCategory.set(
          ex.lessonCategory,
          (overdueByCategory.get(ex.lessonCategory) ?? 0) + 1
        );
      }
    }
  }

  const categoryStats = aggregateByCategory(store);
  const crossTable = buildCrossTable(store);
  const recurrenceEntries = buildRecurrenceEntries(
    categoryStats,
    trendProfile,
    overdueByCategory
  );
  const evalLossTrends = buildEvalLossTrends(store, categoryStats);

  const recurringWeaknesses = recurrenceEntries
    .filter((e) => e.isRecurring)
    .map((e) => e.category);

  const recurringSet = new Set(recurringWeaknesses);
  const topVulnerability = findTopVulnerability(crossTable, recurringSet);

  return {
    generatedAt: new Date().toISOString(),
    crossTable,
    recurrenceEntries,
    evalLossTrends,
    recurringWeaknesses,
    topVulnerability,
  };
}
