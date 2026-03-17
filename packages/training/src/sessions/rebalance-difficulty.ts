/**
 * Percentile-based difficulty rebalancing.
 *
 * The M5D difficulty heuristic produces meaningful relative scores,
 * but fixed thresholds (0.35 / 0.60) don't match the actual score
 * distribution — most exercises cluster above 0.60, yielding 92% "hard".
 *
 * This module computes percentile-based thresholds from the full
 * exercise corpus:
 *
 *   easy:   bottom 30%  (difficultyScore <= p30)
 *   medium: middle 40%  (p30 < score <= p70)
 *   hard:   top 30%     (score > p70)
 *
 * The thresholds are deterministic for a given dataset.
 */

import type { DifficultyEstimate } from "../exercises/types";
import type { DifficultyCalibration } from "./types";

/**
 * Compute percentile-based difficulty calibration from an array of scores.
 *
 * @param scores All difficultyScore values from the exercise corpus
 * @returns Calibration thresholds and distribution counts
 */
export function computeDifficultyCalibration(
  scores: number[]
): DifficultyCalibration {
  if (scores.length === 0) {
    return {
      totalExercises: 0,
      easyUpperBound: 0.35,
      hardLowerBound: 0.60,
      distribution: { easy: 0, medium: 0, hard: 0 },
      percentiles: {
        p10: 0, p20: 0, p30: 0, p40: 0, p50: 0,
        p60: 0, p70: 0, p80: 0, p90: 0,
      },
      calibratedAt: new Date().toISOString(),
    };
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const n = sorted.length;

  const percentile = (p: number): number =>
    sorted[Math.min(Math.floor(n * p / 100), n - 1)];

  const easyUpperBound = percentile(30);
  const hardLowerBound = percentile(70);

  // Count distribution using computed thresholds
  let easy = 0;
  let medium = 0;
  let hard = 0;
  for (const s of sorted) {
    if (s <= easyUpperBound) easy++;
    else if (s > hardLowerBound) hard++;
    else medium++;
  }

  return {
    totalExercises: n,
    easyUpperBound,
    hardLowerBound,
    distribution: { easy, medium, hard },
    percentiles: {
      p10: percentile(10),
      p20: percentile(20),
      p30: percentile(30),
      p40: percentile(40),
      p50: percentile(50),
      p60: percentile(60),
      p70: percentile(70),
      p80: percentile(80),
      p90: percentile(90),
    },
    calibratedAt: new Date().toISOString(),
  };
}

/**
 * Reassign a difficulty estimate using calibrated percentile thresholds.
 *
 * @param score           The raw difficultyScore from M5D
 * @param calibration     Calibration thresholds from computeDifficultyCalibration
 * @returns The rebalanced difficulty tier
 */
export function rebalanceDifficulty(
  score: number,
  calibration: DifficultyCalibration
): DifficultyEstimate {
  if (score <= calibration.easyUpperBound) return "easy";
  if (score > calibration.hardLowerBound) return "hard";
  return "medium";
}
