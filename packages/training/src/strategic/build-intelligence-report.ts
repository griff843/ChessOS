/**
 * Intelligence report: top-level transparency artifact.
 *
 * Assembles pattern intelligence, readiness forecast, difficulty policy,
 * and review queue into a single auditable report.
 *
 * Pure function — no I/O, deterministic.
 */

import type { ReviewQueue } from "../mastery/build-review-queue.js";
import type { DifficultyPolicy } from "../trends/types.js";
import type {
  PatternIntelligence,
  ReadinessForecast,
  IntelligenceReport,
} from "./types.js";

/**
 * Build the intelligence report transparency artifact.
 */
export function buildIntelligenceReport(
  patternIntelligence: PatternIntelligence,
  readiness: ReadinessForecast,
  policy: DifficultyPolicy,
  reviewQueue: ReviewQueue
): IntelligenceReport {
  const overdueCount = reviewQueue.entries.filter(
    (e) => e.reason === "overdue"
  ).length;
  const totalQueue = reviewQueue.totalEntries;

  // Review strategy
  let reviewStrategy: string;
  if (totalQueue === 0) {
    reviewStrategy = "No exercises in review queue.";
  } else if (overdueCount > 10) {
    reviewStrategy = `Heavy review burden: ${overdueCount} overdue of ${totalQueue} total. Prioritizing overdue exercises with enhanced urgency scoring.`;
  } else if (overdueCount > 0) {
    reviewStrategy = `Moderate review load: ${overdueCount} overdue of ${totalQueue} total. Enhanced urgency scoring active.`;
  } else {
    reviewStrategy = `Light review load: ${totalQueue} in queue, none overdue. Maintaining spaced repetition schedule.`;
  }

  // Difficulty strategy
  const difficultyStrategy = `Policy: ${policy.reason}. Mix: easy=${policy.adjusted.easy}, medium=${policy.adjusted.medium}, hard=${policy.adjusted.hard}.`;

  // Recommendations
  const recommendations: string[] = [];

  if (readiness.state === "repair_mode") {
    recommendations.push(
      "Focus on fundamentals — complete sessions at reduced difficulty before expanding."
    );
  }
  if (readiness.state === "hold_steady") {
    recommendations.push(
      "Maintain current practice level — address weaknesses before increasing challenge."
    );
  }
  if (readiness.state === "ready_to_expand") {
    recommendations.push(
      "Ready for increased challenge — consider harder exercises and new categories."
    );
  }

  if (patternIntelligence.recurringWeaknesses.length > 0) {
    recommendations.push(
      `Address recurring weaknesses: ${patternIntelligence.recurringWeaknesses.join(", ")}.`
    );
  }

  if (overdueCount > 5) {
    recommendations.push(
      `Clear review backlog: ${overdueCount} exercises overdue.`
    );
  }

  if (patternIntelligence.topVulnerability) {
    const v = patternIntelligence.topVulnerability;
    recommendations.push(
      `Top vulnerability: ${v.category} at ${v.difficulty} difficulty (${(v.missRate * 100).toFixed(0)}% miss rate).`
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    readiness,
    patternSummary: {
      recurringCount: patternIntelligence.recurringWeaknesses.length,
      topWeakness: patternIntelligence.recurringWeaknesses[0] ?? null,
      topVulnerability: patternIntelligence.topVulnerability,
    },
    reviewStrategy,
    difficultyStrategy,
    recommendations,
  };
}
