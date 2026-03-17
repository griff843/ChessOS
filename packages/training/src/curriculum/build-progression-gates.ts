/**
 * Build deterministic progression gates from learner state.
 *
 * Pure function: evaluates readiness criteria for advancing
 * difficulty/complexity. No I/O.
 */

import type { LearnerOverview } from "../dashboard/types.js";
import type { TrendProfile } from "../trends/types.js";
import type { ProgressStore } from "../progress/types.js";
import type { ProgressionGates, ProgressionGate, GateCriterion } from "./types.js";
import { CURRICULUM_CONFIG } from "./types.js";

const { gateThresholds } = CURRICULUM_CONFIG;

/**
 * Build progression gates from current learner state.
 */
export function buildProgressionGates(
  overview: LearnerOverview,
  trendProfile: TrendProfile,
  store: ProgressStore
): ProgressionGates {
  const now = new Date().toISOString();
  const gates: ProgressionGate[] = [];

  // ── Gate 1: Accuracy ────────────────────────────────────────────

  const accuracyValue = overview.recentAccuracy ?? overview.lifetimeAccuracy;
  const accuracyCriterion: GateCriterion = {
    name: "Recent Accuracy",
    description: "Recent session accuracy meets minimum threshold",
    currentValue: accuracyValue,
    threshold: gateThresholds.accuracyMinRecent,
    passed: accuracyValue >= gateThresholds.accuracyMinRecent,
  };
  gates.push({
    gateName: "Accuracy Gate",
    gateType: "accuracy",
    criteria: [accuracyCriterion],
    allPassed: accuracyCriterion.passed,
    recommendation: accuracyCriterion.passed
      ? "Accuracy is strong — ready for new challenges."
      : `Accuracy is ${(accuracyValue * 100).toFixed(1)}%, below the ${(gateThresholds.accuracyMinRecent * 100).toFixed(0)}% threshold. Focus on consolidation.`,
  });

  // ── Gate 2: Mastery ─────────────────────────────────────────────

  const improvingCount = overview.masteryDistribution.improving ?? 0;
  const masteredCount = overview.masteryDistribution.mastered ?? 0;
  const totalSeen = Math.max(overview.totalSeen, 1);
  const masteryRatio = (improvingCount + masteredCount) / totalSeen;
  const masteryCriterion: GateCriterion = {
    name: "Mastery Ratio",
    description: "Proportion of seen exercises at improving or mastered level",
    currentValue: masteryRatio,
    threshold: gateThresholds.masteryMinRatio,
    passed: masteryRatio >= gateThresholds.masteryMinRatio,
  };
  gates.push({
    gateName: "Mastery Gate",
    gateType: "mastery",
    criteria: [masteryCriterion],
    allPassed: masteryCriterion.passed,
    recommendation: masteryCriterion.passed
      ? "Mastery distribution is healthy — sufficient exercises at improving/mastered level."
      : `Only ${(masteryRatio * 100).toFixed(1)}% of seen exercises are improving/mastered. Need ${(gateThresholds.masteryMinRatio * 100).toFixed(0)}%.`,
  });

  // ── Gate 3: Review Load ─────────────────────────────────────────

  const overdueCount = overview.reviewLoad.overdueCount;
  const reviewCriterion: GateCriterion = {
    name: "Overdue Count",
    description: "Number of overdue exercises is below maximum",
    currentValue: overdueCount,
    threshold: gateThresholds.reviewMaxOverdue,
    passed: overdueCount < gateThresholds.reviewMaxOverdue,
  };
  gates.push({
    gateName: "Review Load Gate",
    gateType: "review_load",
    criteria: [reviewCriterion],
    allPassed: reviewCriterion.passed,
    recommendation: reviewCriterion.passed
      ? "Review load is manageable — overdue queue is under control."
      : `${overdueCount} overdue exercises — clear the review backlog before advancing.`,
  });

  // ── Gate 4: Trends ──────────────────────────────────────────────

  const worseningCount = overview.trendSummary.worseningCategories.length;
  const trendCriterion: GateCriterion = {
    name: "Worsening Categories",
    description: "No categories have worsening accuracy trends",
    currentValue: worseningCount,
    threshold: gateThresholds.trendMaxWorsening,
    passed: worseningCount <= gateThresholds.trendMaxWorsening,
  };
  gates.push({
    gateName: "Trend Gate",
    gateType: "trend",
    criteria: [trendCriterion],
    allPassed: trendCriterion.passed,
    recommendation: trendCriterion.passed
      ? "All category trends are stable or improving."
      : `${worseningCount} worsening categor${worseningCount === 1 ? "y" : "ies"}: ${overview.trendSummary.worseningCategories.join(", ")}. Stabilize before advancing.`,
  });

  // ── Gate 5: Eval Loss ───────────────────────────────────────────

  let evalLossSum = 0;
  let evalLossCount = 0;
  for (const ex of Object.values(store.exercises)) {
    if (ex.averageEvalLossCp != null && ex.timesSeen > 0) {
      evalLossSum += ex.averageEvalLossCp;
      evalLossCount++;
    }
  }
  const avgEvalLoss = evalLossCount > 0 ? evalLossSum / evalLossCount : 0;
  const evalLossCriterion: GateCriterion = {
    name: "Average Eval Loss",
    description: "Average centipawn loss across seen exercises is below threshold",
    currentValue: avgEvalLoss,
    threshold: gateThresholds.evalLossMaxAvg,
    passed: avgEvalLoss < gateThresholds.evalLossMaxAvg,
  };
  gates.push({
    gateName: "Eval Loss Gate",
    gateType: "eval_loss",
    criteria: [evalLossCriterion],
    allPassed: evalLossCriterion.passed,
    recommendation: evalLossCriterion.passed
      ? "Average eval loss is within acceptable range."
      : `Average eval loss is ${avgEvalLoss.toFixed(0)}cp, above the ${gateThresholds.evalLossMaxAvg}cp threshold. Work on reducing blunders.`,
  });

  // ── Overall Readiness ───────────────────────────────────────────

  const overallReadiness = gates.every((g) => g.allPassed);
  const failedGates = gates.filter((g) => !g.allPassed);
  const readinessSummary = overallReadiness
    ? "Ready for difficulty expansion — all progression gates passed."
    : `Not yet ready — ${failedGates.length} gate${failedGates.length === 1 ? "" : "s"} not passed: ${failedGates.map((g) => g.gateName).join(", ")}.`;

  return {
    generatedAt: now,
    gates,
    overallReadiness,
    readinessSummary,
  };
}
