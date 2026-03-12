/**
 * Build a personalized multi-session curriculum plan.
 *
 * Pure function: synthesizes LearnerOverview, MistakePatterns,
 * TrendProfile, and ReviewQueue into a sequenced curriculum
 * with themed sessions and progression gates. No I/O.
 */

import type { LearnerOverview, FocusRecommendation } from "../dashboard/types.js";
import type { MistakePatterns } from "../coach/types.js";
import type { TrendProfile } from "../trends/types.js";
import type { ReviewQueue } from "../mastery/build-review-queue.js";
import type { ProgressStore } from "../progress/types.js";
import type {
  CurriculumPlan,
  CurriculumTheme,
  ThemeAssignment,
} from "./types.js";
import { CURRICULUM_CONFIG } from "./types.js";
import { buildSessionRoadmap } from "./build-session-roadmap.js";
import { buildProgressionGates } from "./build-progression-gates.js";

/** Theme sequencing order: lower = earlier in curriculum. */
const THEME_ORDER: Record<CurriculumTheme, number> = {
  blunder_cleanup: 0,
  instability_reduction: 1,
  tactical_repair: 2,
  consolidation: 3,
  difficulty_expansion: 4,
};

/**
 * Build a personalized curriculum plan from current learner state.
 */
export function buildCurriculumPlan(
  overview: LearnerOverview,
  mistakePatterns: MistakePatterns,
  trendProfile: TrendProfile,
  reviewQueue: ReviewQueue,
  store: ProgressStore,
  focusRecommendations: FocusRecommendation[],
  sessionCount: number = CURRICULUM_CONFIG.defaultSessionCount
): CurriculumPlan {
  const now = new Date().toISOString();
  const { themeThresholds } = CURRICULUM_CONFIG;

  // ── 1. Compute progression gates ───────────────────────────────

  const progressionGates = buildProgressionGates(overview, trendProfile, store);

  // ── 2. Assign themes using priority cascade ────────────────────

  const assignments: ThemeAssignment[] = [];
  let remaining = sessionCount;

  // 2a. Blunder cleanup: totalBlunders >= threshold OR critical severity
  const hasCritical = mistakePatterns.categoryPatterns.some(
    (p) => p.severity === "critical"
  );
  const totalBlunders = mistakePatterns.blunderProfile.totalBlunders;
  if (
    totalBlunders >= themeThresholds.blunderCleanupMinBlunders ||
    (themeThresholds.blunderCleanupOnCritical && hasCritical)
  ) {
    const count = Math.min(
      2,
      Math.ceil(totalBlunders / 5),
      remaining
    );
    // Ensure at least 1 if triggered
    const blunderSessions = Math.max(count, Math.min(1, remaining));
    for (let i = 0; i < blunderSessions; i++) {
      assignments.push({
        sessionIndex: -1, // reindexed after sequencing
        theme: "blunder_cleanup",
        reason: hasCritical
          ? "Critical severity pattern detected"
          : `${totalBlunders} blunders exceed cleanup threshold`,
        triggerMetric: hasCritical ? "criticalPatterns" : "totalBlunders",
        triggerValue: hasCritical ? 1 : totalBlunders,
      });
    }
    remaining -= blunderSessions;
  }

  // 2b. Tactical repair: tactical categories worsening
  if (remaining > 0) {
    const worseningTactical = themeThresholds.tacticalRepairCategories.filter(
      (cat) => {
        const bucket = trendProfile.byCategory[cat];
        return bucket?.trendDirection === "worsening";
      }
    );
    const tacticalSessions = Math.min(worseningTactical.length, 2, remaining);
    for (let i = 0; i < tacticalSessions; i++) {
      assignments.push({
        sessionIndex: -1,
        theme: "tactical_repair",
        reason: `${worseningTactical[i]} is worsening`,
        triggerMetric: "worseningTacticalCategories",
        triggerValue: worseningTactical.length,
      });
    }
    remaining -= tacticalSessions;
  }

  // 2c. Instability reduction: high unstable ratio
  if (remaining > 0) {
    const unstableRatio =
      overview.reviewLoad.unstableCount / Math.max(overview.totalSeen, 1);
    if (unstableRatio >= themeThresholds.instabilityRatioThreshold) {
      assignments.push({
        sessionIndex: -1,
        theme: "instability_reduction",
        reason: `Unstable ratio ${(unstableRatio * 100).toFixed(1)}% exceeds threshold`,
        triggerMetric: "unstableRatio",
        triggerValue: unstableRatio,
      });
      remaining--;
    }
  }

  // 2d. Difficulty expansion: all gates pass → last session only
  let expansionSlotReserved = false;
  if (remaining > 0 && progressionGates.overallReadiness) {
    const unstableRatio =
      overview.reviewLoad.unstableCount / Math.max(overview.totalSeen, 1);
    if (
      overview.lifetimeAccuracy >= themeThresholds.expansionMinAccuracy &&
      unstableRatio < themeThresholds.expansionMaxUnstableRatio &&
      overview.trendSummary.worseningCategories.length === 0
    ) {
      expansionSlotReserved = true;
      remaining--; // reserve one slot for expansion at the end
    }
  }

  // 2e. Consolidation: fill remaining slots
  if (remaining > 0) {
    const improvingCount = overview.trendSummary.improvingCategories.length;
    const unstableCount = overview.reviewLoad.unstableCount;
    const reason =
      improvingCount >= themeThresholds.consolidationMinImproving &&
      unstableCount > 0
        ? `${improvingCount} improving categor${improvingCount === 1 ? "y" : "ies"} with ${unstableCount} unstable exercise${unstableCount === 1 ? "" : "s"}`
        : "Default fill — strengthen current progress";
    for (let i = 0; i < remaining; i++) {
      assignments.push({
        sessionIndex: -1,
        theme: "consolidation",
        reason,
        triggerMetric: "consolidationFill",
        triggerValue: remaining,
      });
    }
  }

  // Add expansion at the end if reserved
  if (expansionSlotReserved) {
    assignments.push({
      sessionIndex: -1,
      theme: "difficulty_expansion",
      reason: "All progression gates passed — ready for harder material",
      triggerMetric: "overallReadiness",
      triggerValue: 1,
    });
  }

  // ── 3. Sequence by theme priority ──────────────────────────────

  assignments.sort((a, b) => THEME_ORDER[a.theme] - THEME_ORDER[b.theme]);

  // Reindex after sorting
  for (let i = 0; i < assignments.length; i++) {
    assignments[i].sessionIndex = i;
  }

  // ── 4. Build per-session roadmaps ──────────────────────────────

  const sessions = assignments.map((assignment) =>
    buildSessionRoadmap(
      assignment.sessionIndex,
      assignment.theme,
      overview,
      mistakePatterns,
      focusRecommendations,
      reviewQueue,
      trendProfile
    )
  );

  // ── 5. Assemble overall rationale ──────────────────────────────

  const themeCounts: Partial<Record<CurriculumTheme, number>> = {};
  for (const a of assignments) {
    themeCounts[a.theme] = (themeCounts[a.theme] ?? 0) + 1;
  }
  const themeDescriptions: string[] = [];
  for (const [theme, count] of Object.entries(themeCounts)) {
    const label = theme.replace(/_/g, " ");
    themeDescriptions.push(`${count} ${label}`);
  }

  const rationaleParts: string[] = [];
  rationaleParts.push(
    `${sessionCount}-session curriculum: ${themeDescriptions.join(", ")}.`
  );
  if (progressionGates.overallReadiness) {
    rationaleParts.push("All progression gates passed.");
  } else {
    const failedCount = progressionGates.gates.filter(
      (g) => !g.allPassed
    ).length;
    rationaleParts.push(
      `${failedCount} progression gate${failedCount === 1 ? "" : "s"} not yet passed.`
    );
  }
  rationaleParts.push(
    `Review load: ${overview.reviewLoad.overdueCount} overdue, ${overview.reviewLoad.unstableCount} unstable.`
  );

  return {
    generatedAt: now,
    sessionCount,
    themeAssignments: assignments,
    sessions,
    progressionGates,
    overallRationale: rationaleParts.join(" "),
  };
}
