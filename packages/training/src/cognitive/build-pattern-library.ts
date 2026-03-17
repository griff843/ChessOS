/**
 * Build a tactical pattern library from exercise corpus and progress data.
 *
 * Cross-references detected patterns with the progress store to compute
 * per-pattern accuracy, miss rates, severity, trend, and difficulty spread.
 */

import type { TrainingExercise, DifficultyEstimate } from "../exercises/types";
import type { ProgressStore } from "../progress/types";
import type { TacticalPattern, PatternLibrary, PatternLibraryEntry } from "./types";
import { detectTacticalPatterns } from "./detect-patterns";

interface PatternAccumulator {
  totalSeen: number;
  totalCorrect: number;
  recentResults: boolean[];
  exampleExerciseIds: string[];
  difficultyDistribution: Record<DifficultyEstimate, number>;
}

function severityFromMissRate(missRate: number): PatternLibraryEntry["severity"] {
  if (missRate >= 0.5) return "critical";
  if (missRate >= 0.3) return "moderate";
  return "minor";
}

export function buildPatternLibrary(
  exercises: TrainingExercise[],
  store: ProgressStore,
  patternCache?: Map<string, TacticalPattern[]>
): PatternLibrary {
  const accumulators = new Map<TacticalPattern, PatternAccumulator>();
  let totalPatterned = 0;

  for (const ex of exercises) {
    if (!ex.engineAnswer.bestMoveUci || !ex.engineAnswer.bestMoveSan) continue;

    const patterns =
      patternCache?.get(ex.positionId) ??
      detectTacticalPatterns(ex.fen, ex.engineAnswer.bestMoveUci, ex.phase);

    if (patterns.length === 1 && patterns[0] === "unclassified") continue;

    totalPatterned++;
    const progress = store.exercises[ex.positionId];

    for (const pattern of patterns) {
      if (pattern === "unclassified") continue;

      let acc = accumulators.get(pattern);
      if (!acc) {
        acc = {
          totalSeen: 0,
          totalCorrect: 0,
          recentResults: [],
          exampleExerciseIds: [],
          difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
        };
        accumulators.set(pattern, acc);
      }

      acc.difficultyDistribution[ex.explanation.difficultyEstimate]++;

      if (progress && progress.timesSeen > 0) {
        acc.totalSeen += progress.timesSeen;
        acc.totalCorrect += progress.timesCorrect;
        if (progress.lastResult !== null) {
          acc.recentResults.push(progress.lastResult === "correct");
        }
      }

      if (acc.exampleExerciseIds.length < 5) {
        acc.exampleExerciseIds.push(ex.positionId);
      }
    }
  }

  const entries: PatternLibraryEntry[] = [];

  for (const [pattern, acc] of accumulators) {
    const accuracy = acc.totalSeen > 0 ? acc.totalCorrect / acc.totalSeen : 0;
    const missRate = 1 - accuracy;

    let recentAccuracy: number | null = null;
    let trendDirection: PatternLibraryEntry["trendDirection"] = "insufficient_data";
    let improvementTrend: number | null = null;

    if (acc.recentResults.length >= 3) {
      const recentCorrect = acc.recentResults.filter(Boolean).length;
      recentAccuracy = recentCorrect / acc.recentResults.length;
      improvementTrend = Number((recentAccuracy - accuracy).toFixed(4));

      if (recentAccuracy >= accuracy + 0.1) trendDirection = "improving";
      else if (recentAccuracy <= accuracy - 0.1) trendDirection = "worsening";
      else trendDirection = "stable";
    }

    entries.push({
      pattern,
      totalSeen: acc.totalSeen,
      totalCorrect: acc.totalCorrect,
      accuracy,
      missRate,
      severity: severityFromMissRate(missRate),
      trendDirection,
      recentAccuracy,
      improvementTrend,
      difficultyDistribution: acc.difficultyDistribution,
      exampleExerciseIds: acc.exampleExerciseIds,
    });
  }

  entries.sort((a, b) => b.missRate - a.missRate);

  return {
    generatedAt: new Date().toISOString(),
    entries,
    totalPatternedExercises: totalPatterned,
  };
}
