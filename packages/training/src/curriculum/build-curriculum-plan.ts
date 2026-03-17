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
import type { ConceptStateReport } from "../concepts/types.js";
import type { OpeningReport } from "../openings/types.js";
import type {
  RepertoireDrillQueueReport,
  RepertoireRepairOutcomesReport,
  RepertoireRepairQueueReport,
  RepertoireReviewReport,
  RepertoireTransferCoachingReport,
} from "../repertoire/types.js";
import type {
  CurriculumPlan,
  CurriculumTheme,
  ThemeAssignment,
} from "./types.js";
import { CURRICULUM_CONFIG } from "./types.js";
import { buildSessionRoadmap } from "./build-session-roadmap.js";
import { buildProgressionGates } from "./build-progression-gates.js";

const THEME_ORDER: Record<CurriculumTheme, number> = {
  blunder_cleanup: 0,
  instability_reduction: 1,
  tactical_repair: 2,
  consolidation: 3,
  difficulty_expansion: 4,
};

export function buildCurriculumPlan(
  overview: LearnerOverview,
  mistakePatterns: MistakePatterns,
  trendProfile: TrendProfile,
  reviewQueue: ReviewQueue,
  store: ProgressStore,
  focusRecommendations: FocusRecommendation[],
  conceptState?: ConceptStateReport,
  openingReport?: OpeningReport,
  repertoireReview?: RepertoireReviewReport,
  repertoireTransferCoaching?: RepertoireTransferCoachingReport,
  repertoireDrillQueue?: RepertoireDrillQueueReport,
  repertoireRepairQueue?: RepertoireRepairQueueReport,
  repertoireRepairOutcomes?: RepertoireRepairOutcomesReport,
  sessionCount: number = CURRICULUM_CONFIG.defaultSessionCount
): CurriculumPlan {
  const now = new Date().toISOString();
  const { themeThresholds } = CURRICULUM_CONFIG;

  const progressionGates = buildProgressionGates(overview, trendProfile, store);

  const assignments: ThemeAssignment[] = [];
  let remaining = sessionCount;

  const hasCritical = mistakePatterns.categoryPatterns.some((p) => p.severity === "critical");
  const totalBlunders = mistakePatterns.blunderProfile.totalBlunders;
  if (totalBlunders >= themeThresholds.blunderCleanupMinBlunders || (themeThresholds.blunderCleanupOnCritical && hasCritical)) {
    const count = Math.min(2, Math.ceil(totalBlunders / 5), remaining);
    const blunderSessions = Math.max(count, Math.min(1, remaining));
    for (let i = 0; i < blunderSessions; i++) {
      assignments.push({
        sessionIndex: -1,
        theme: "blunder_cleanup",
        reason: hasCritical ? "Critical severity pattern detected" : `${totalBlunders} blunders exceed cleanup threshold`,
        triggerMetric: hasCritical ? "criticalPatterns" : "totalBlunders",
        triggerValue: hasCritical ? 1 : totalBlunders,
      });
    }
    remaining -= blunderSessions;
  }

  if (remaining > 0) {
    const worseningTactical = themeThresholds.tacticalRepairCategories.filter((cat) => {
      const bucket = trendProfile.byCategory[cat];
      return bucket?.trendDirection === "worsening";
    });
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

  if (remaining > 0) {
    const unstableRatio = overview.reviewLoad.unstableCount / Math.max(overview.totalSeen, 1);
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

  let expansionSlotReserved = false;
  if (remaining > 0 && progressionGates.overallReadiness) {
    const unstableRatio = overview.reviewLoad.unstableCount / Math.max(overview.totalSeen, 1);
    if (overview.lifetimeAccuracy >= themeThresholds.expansionMinAccuracy && unstableRatio < themeThresholds.expansionMaxUnstableRatio && overview.trendSummary.worseningCategories.length === 0) {
      expansionSlotReserved = true;
      remaining--;
    }
  }

  if (remaining > 0) {
    const improvingCount = overview.trendSummary.improvingCategories.length;
    const unstableCount = overview.reviewLoad.unstableCount;
    const reason = improvingCount >= themeThresholds.consolidationMinImproving && unstableCount > 0
      ? `${improvingCount} improving categor${improvingCount === 1 ? "y" : "ies"} with ${unstableCount} unstable exercise${unstableCount === 1 ? "" : "s"}`
      : "Default fill - strengthen current progress";
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

  if (expansionSlotReserved) {
    assignments.push({
      sessionIndex: -1,
      theme: "difficulty_expansion",
      reason: "All progression gates passed - ready for harder material",
      triggerMetric: "overallReadiness",
      triggerValue: 1,
    });
  }

  assignments.sort((a, b) => THEME_ORDER[a.theme] - THEME_ORDER[b.theme]);
  for (let i = 0; i < assignments.length; i++) {
    assignments[i].sessionIndex = i;
  }

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

  const conceptSequence = (conceptState?.recommendedFocuses ?? []).slice(0, sessionCount).map((focus, index) => ({
    sessionIndex: index,
    conceptKey: focus.conceptKey,
    conceptName: focus.conceptName,
    rationale: focus.explanation,
    prerequisiteConcepts: focus.prerequisiteGaps,
  }));

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
  rationaleParts.push(`${sessionCount}-session curriculum: ${themeDescriptions.join(", ")}.`);
  if (progressionGates.overallReadiness) {
    rationaleParts.push("All progression gates passed.");
  } else {
    const failedCount = progressionGates.gates.filter((g) => !g.allPassed).length;
    rationaleParts.push(`${failedCount} progression gate${failedCount === 1 ? "" : "s"} not yet passed.`);
  }
  rationaleParts.push(`Review load: ${overview.reviewLoad.overdueCount} overdue, ${overview.reviewLoad.unstableCount} unstable.`);
  if (conceptSequence.length > 0) {
    rationaleParts.push(`Concept sequence: ${conceptSequence.map((entry) => entry.conceptName).join(", ")}.`);
  }
  if ((openingReport?.topWeaknesses.length ?? 0) > 0) {
    rationaleParts.push(`Opening focus: ${openingReport!.topWeaknesses.slice(0, 3).map((entry) => entry.openingName).join(", ")}.`);
  }
  if ((repertoireReview?.topLinesToReview.length ?? 0) > 0) {
    rationaleParts.push(`Repertoire review lines: ${repertoireReview!.topLinesToReview.slice(0, 3).map((entry) => entry.lineName).join(", ")}.`);
  }
  if ((repertoireTransferCoaching?.fragileLines.length ?? 0) > 0) {
    rationaleParts.push(`Transfer repair lines: ${repertoireTransferCoaching!.fragileLines.slice(0, 3).map((entry) => entry.lineName).join(", ")}.`);
  }
  if ((repertoireDrillQueue?.nextLinesToReview.length ?? 0) > 0) {
    rationaleParts.push(`Drill queue lines: ${repertoireDrillQueue!.nextLinesToReview.slice(0, 3).map((entry) => entry.lineName).join(", ")}.`);
  }
  if ((repertoireRepairQueue?.topRepairLines.length ?? 0) > 0) {
    rationaleParts.push(`Import-to-repair lines: ${repertoireRepairQueue!.topRepairLines.slice(0, 3).map((entry) => entry.lineName).join(", ")}.`);
  }
  if ((repertoireRepairOutcomes?.nextActions.length ?? 0) > 0) {
    rationaleParts.push(`Repair outcomes now need follow-up on ${repertoireRepairOutcomes!.nextActions.slice(0, 3).map((entry) => entry.lineName).join(", ")}.`);
  }

  return {
    generatedAt: now,
    sessionCount,
    themeAssignments: assignments,
    sessions,
    progressionGates,
    conceptSequence,
    openingFocuses: openingReport?.topWeaknesses.slice(0, sessionCount).map((entry) => ({
      openingFamily: entry.openingFamily,
      openingName: entry.openingName,
      theme: entry.theme,
      count: entry.count,
    })) ?? [],
    repertoireFocuses: repertoireReview?.topLinesToReview.slice(0, sessionCount).map((entry) => ({
      repertoireKey: entry.repertoireKey,
      repertoireName: entry.repertoireName,
      lineName: entry.lineName,
      recommendedAction: entry.recommendedAction,
      reviewPriority: entry.reviewPriority,
    })) ?? [],
    repertoireTransferFocuses: repertoireTransferCoaching?.fragileLines.slice(0, sessionCount).map((entry) => ({
      repertoireKey: entry.repertoireKey,
      lineName: entry.lineName,
      transferFailureType: entry.transferFailureType,
      recommendedReviewLine: entry.recommendedReviewLine,
      urgency: entry.urgency,
    })) ?? [],
    repertoireDrillFocuses: repertoireDrillQueue?.entries.slice(0, sessionCount).map((entry) => ({
      lineId: entry.lineId,
      lineName: entry.lineName,
      urgency: entry.urgency,
      nextRecommendedReviewAt: entry.nextRecommendedReviewAt,
      recommendedAction: entry.recommendedAction,
    })) ?? [],
    repertoireRepairFocuses: repertoireRepairQueue?.entries.slice(0, sessionCount).map((entry) => ({
      sourceGameId: entry.sourceGameId,
      lineId: entry.lineId,
      lineName: entry.lineName,
      repairType: entry.repairType,
      urgency: entry.urgencyScore,
      scheduledDrillReason: entry.scheduledDrillReason,
    })) ?? [],
    repertoireRepairOutcomeFocuses: repertoireRepairOutcomes?.nextActions.slice(0, sessionCount).map((entry) => ({
      repairId: entry.repairId,
      lineId: entry.lineId,
      lineName: entry.lineName,
      outcomeVerdict: entry.outcomeVerdict,
      urgency: entry.urgency,
      nextAction: entry.nextAction,
    })) ?? [],
    overallRationale: rationaleParts.join(" "),
  };
}
