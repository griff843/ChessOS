/**
 * Compute a difficulty auto-adjustment policy based on trend data.
 *
 * Gently adjusts the default 3/4/3 (easy/medium/hard) mix:
 *
 * Enhanced rules (when readiness/patternIntelligence provided):
 *   R1. Repair mode → 5/3/2 (reduce difficulty)
 *   R2. Recurring weakness at hard with missRate ≥ 50% → 4/4/2
 *
 * Base rules applied in order (first match wins):
 *   1. If hard recentAccuracy < 0.30 AND recentSeen >= 3:
 *      → 4/4/2 (reduce hard, add easy)
 *   2. If easy recentAccuracy > 0.80 AND hard recentAccuracy > 0.60
 *      AND both recentSeen >= 3 (only if ready_to_expand or no readiness):
 *      → 2/4/4 (reduce easy, add hard)
 *   3. If medium recentAccuracy < 0.30 AND recentSeen >= 3:
 *      → 2/5/3 (reduce easy, add medium)
 *
 * Enhanced trailing rule:
 *   R3. Hold steady → 3/5/2 (moderate difficulty)
 *
 *   4. Otherwise: keep default 3/4/3
 *
 * Total always equals sessionSize.
 */

import type { TrendProfile, DifficultyPolicy } from "./types";
import { MIN_TREND_ATTEMPTS } from "./types";
import type { ReadinessForecast } from "../strategic/types.js";
import type { PatternIntelligence } from "../strategic/types.js";

/** Threshold below which accuracy is considered poor. */
const POOR_ACCURACY = 0.30;
/** Threshold above which accuracy is considered strong. */
const STRONG_ACCURACY_EASY = 0.80;
const STRONG_ACCURACY_HARD = 0.60;

/**
 * Compute difficulty policy from trend profile.
 *
 * @param profile              Trend profile with recent stats computed
 * @param sessionSize          Target session size (default 10)
 * @param readiness            Optional readiness forecast for enhanced rules
 * @param patternIntelligence  Optional pattern intelligence for enhanced rules
 * @returns DifficultyPolicy with baseline and adjusted mixes
 */
export function computeDifficultyPolicy(
  profile: TrendProfile,
  sessionSize: number = 10,
  readiness?: ReadinessForecast,
  patternIntelligence?: PatternIntelligence
): DifficultyPolicy {
  const baseline = { easy: 3, medium: 4, hard: 3 };
  const now = new Date().toISOString();

  const easyBucket = profile.byDifficulty["easy"];
  const mediumBucket = profile.byDifficulty["medium"];
  const hardBucket = profile.byDifficulty["hard"];

  // ── Enhanced Rule R1: Repair mode ──────────────────────────────
  if (readiness?.state === "repair_mode") {
    return {
      generatedAt: now,
      reason: `Repair mode — reducing difficulty to rebuild confidence (${readiness.reason})`,
      baseline,
      adjusted: { easy: 5, medium: 3, hard: 2 },
      sessionSize,
    };
  }

  // ── Enhanced Rule R2: Recurring weakness at hard ───────────────
  if (patternIntelligence) {
    const hardVuln = patternIntelligence.crossTable.find(
      (cell) =>
        cell.difficulty === "hard" &&
        patternIntelligence.recurringWeaknesses.includes(cell.category) &&
        cell.missRate >= 0.5 &&
        cell.seenCount >= 3
    );
    if (hardVuln) {
      return {
        generatedAt: now,
        reason: `Recurring weakness at hard difficulty: ${hardVuln.category} (${(hardVuln.missRate * 100).toFixed(0)}% miss rate)`,
        baseline,
        adjusted: { easy: 4, medium: 4, hard: 2 },
        sessionSize,
      };
    }
  }

  // ── Base Rule 1: Hard exercises too difficult ──────────────────
  if (
    hardBucket &&
    hardBucket.recentSeen >= MIN_TREND_ATTEMPTS &&
    hardBucket.recentAccuracy < POOR_ACCURACY
  ) {
    return {
      generatedAt: now,
      reason: `Hard exercises too difficult (recent accuracy ${(hardBucket.recentAccuracy * 100).toFixed(0)}% < 30%)`,
      baseline,
      adjusted: { easy: 4, medium: 4, hard: 2 },
      sessionSize,
    };
  }

  // ── Base Rule 2: Strong across the board (gated by readiness) ──
  const canExpand =
    readiness === undefined || readiness.state === "ready_to_expand";
  if (
    canExpand &&
    easyBucket &&
    hardBucket &&
    easyBucket.recentSeen >= MIN_TREND_ATTEMPTS &&
    hardBucket.recentSeen >= MIN_TREND_ATTEMPTS &&
    easyBucket.recentAccuracy > STRONG_ACCURACY_EASY &&
    hardBucket.recentAccuracy > STRONG_ACCURACY_HARD
  ) {
    return {
      generatedAt: now,
      reason: `Strong performance (easy ${(easyBucket.recentAccuracy * 100).toFixed(0)}% > 80%, hard ${(hardBucket.recentAccuracy * 100).toFixed(0)}% > 60%)`,
      baseline,
      adjusted: { easy: 2, medium: 4, hard: 4 },
      sessionSize,
    };
  }

  // ── Base Rule 3: Medium exercises need reinforcement ───────────
  if (
    mediumBucket &&
    mediumBucket.recentSeen >= MIN_TREND_ATTEMPTS &&
    mediumBucket.recentAccuracy < POOR_ACCURACY
  ) {
    return {
      generatedAt: now,
      reason: `Medium exercises need reinforcement (recent accuracy ${(mediumBucket.recentAccuracy * 100).toFixed(0)}% < 30%)`,
      baseline,
      adjusted: { easy: 2, medium: 5, hard: 3 },
      sessionSize,
    };
  }

  // ── Enhanced Rule R3: Hold steady ──────────────────────────────
  if (readiness?.state === "hold_steady") {
    return {
      generatedAt: now,
      reason: `Hold steady — focusing on medium difficulty (${readiness.reason})`,
      baseline,
      adjusted: { easy: 3, medium: 5, hard: 2 },
      sessionSize,
    };
  }

  // Default: no adjustment
  return {
    generatedAt: now,
    reason: "Default balanced mix (no adjustment triggered)",
    baseline,
    adjusted: { ...baseline },
    sessionSize,
  };
}
