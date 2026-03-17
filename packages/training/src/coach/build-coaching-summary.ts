/**
 * Build a deterministic coaching summary from learner state.
 *
 * Pure function: produces a headline, insights, progress statement,
 * and next-step statement grounded in actual data. No LLM calls. No I/O.
 */

import type { LearnerOverview } from "../dashboard/types.js";
import type { TrendProfile } from "../trends/types.js";
import type { ConceptStateReport } from "../concepts/types.js";
import type { OpeningReport } from "../openings/types.js";
import type {
  RepertoireDrillMemoryReport,
  RepertoireDrillQueueReport,
  RepertoireRepairOutcomesReport,
  RepertoireRepairQueueReport,
  RepertoireRepairReport,
  RepertoireReviewReport,
  RepertoireTransferCoachingReport,
  RepertoireTransferReport,
} from "../repertoire/types.js";
import type {
  CoachingSummary,
  CoachingInsight,
  MistakePatterns,
  StudyPlan,
} from "./types.js";

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

export function buildCoachingSummary(
  overview: LearnerOverview,
  mistakePatterns: MistakePatterns,
  studyPlan: StudyPlan,
  trendProfile: TrendProfile,
  conceptState?: ConceptStateReport,
  openingReport?: OpeningReport,
  repertoireReview?: RepertoireReviewReport,
  repertoireTransfer?: RepertoireTransferReport,
  repertoireTransferCoaching?: RepertoireTransferCoachingReport,
  repertoireDrillMemory?: RepertoireDrillMemoryReport,
  repertoireDrillQueue?: RepertoireDrillQueueReport,
  repertoireRepair?: RepertoireRepairReport,
  repertoireRepairQueue?: RepertoireRepairQueueReport,
  repertoireRepairOutcomes?: RepertoireRepairOutcomesReport
): CoachingSummary {
  const now = new Date().toISOString();
  const insights: CoachingInsight[] = [];

  const primary = studyPlan.primaryFocus.category;
  let headline: string;

  if (overview.recentAccuracy === null) {
    headline = overview.totalSeen > 0
      ? `Getting started - ${overview.totalSeen} exercises attempted`
      : "Ready to begin - no exercises attempted yet";
  } else if (overview.recentAccuracy > overview.lifetimeAccuracy + 0.05) {
    headline = `Improving steadily - focus on ${primary}`;
  } else if (overview.recentAccuracy < overview.lifetimeAccuracy - 0.05) {
    const worst = mistakePatterns.categoryPatterns[0];
    const worstCat = worst ? worst.category : primary;
    headline = `Accuracy declining - review ${worstCat}`;
  } else {
    headline = `Steady progress - continue with ${primary}`;
  }

  if (overview.reviewLoad.overdueCount > 0) {
    insights.push({
      type: "review",
      message: `${overview.reviewLoad.overdueCount} exercise${overview.reviewLoad.overdueCount === 1 ? " is" : "s are"} overdue for review`,
      priority: 9,
    });
  }

  for (const pattern of mistakePatterns.categoryPatterns) {
    if (pattern.severity === "critical") {
      insights.push({
        type: "weakness",
        message: pattern.description,
        priority: 8,
      });
    }
  }

  for (const cat of overview.trendSummary.worseningCategories) {
    const bucket = trendProfile.byCategory[cat];
    if (bucket) {
      insights.push({
        type: "trend",
        message: `${cat} is worsening: lifetime ${fmtPct(bucket.lifetimeAccuracy)} -> recent ${fmtPct(bucket.recentAccuracy)}`,
        priority: 7,
      });
    }
  }

  const seenPct = overview.totalExercises > 0 ? overview.totalSeen / overview.totalExercises : 0;
  const milestones = [
    { threshold: 1.0, label: "all exercises" },
    { threshold: 0.75, label: "75% of exercises" },
    { threshold: 0.5, label: "50% of exercises" },
    { threshold: 0.25, label: "25% of exercises" },
  ];
  for (const m of milestones) {
    if (seenPct >= m.threshold) {
      insights.push({
        type: "milestone",
        message: `You've seen ${m.label} (${overview.totalSeen}/${overview.totalExercises})`,
        priority: 5,
      });
      break;
    }
  }

  for (const cat of overview.trendSummary.improvingCategories) {
    const bucket = trendProfile.byCategory[cat];
    if (bucket) {
      insights.push({
        type: "trend",
        message: `${cat} is improving: lifetime ${fmtPct(bucket.lifetimeAccuracy)} -> recent ${fmtPct(bucket.recentAccuracy)}`,
        priority: 4,
      });
    }
  }

  for (const [cat, bucket] of Object.entries(trendProfile.byCategory)) {
    if (bucket.lifetimeAccuracy >= 0.8 && bucket.lifetimeSeen >= 3) {
      insights.push({
        type: "strength",
        message: `Strong in ${cat} (${fmtPct(bucket.lifetimeAccuracy)} accuracy)`,
        priority: 3,
      });
    }
  }

  if (overview.reviewLoad.unstableCount > 0) {
    insights.push({
      type: "review",
      message: `${overview.reviewLoad.unstableCount} exercise${overview.reviewLoad.unstableCount === 1 ? " has" : "s have"} unstable mastery`,
      priority: 6,
    });
  }

  if (conceptState?.recommendedFocuses[0]) {
    const focus = conceptState.recommendedFocuses[0];
    insights.push({
      type: "weakness",
      message: `Concept repair should start with ${focus.conceptName}: ${focus.explanation}`,
      priority: 8,
    });
  }

  if (conceptState?.prerequisiteHotspots[0]) {
    const hotspot = conceptState.prerequisiteHotspots[0];
    insights.push({
      type: "review",
      message: `${hotspot.conceptKey} is blocked by prerequisite gaps in ${hotspot.missingPrerequisites.join(", ")}`,
      priority: 7,
    });
  }

  if (openingReport?.topWeaknesses[0]) {
    const weakness = openingReport.topWeaknesses[0];
    insights.push({
      type: "weakness",
      message: `Opening pressure is highest in ${weakness.openingName}: ${weakness.theme.replace(/_/g, " ")}.`,
      priority: 7,
    });
  }

  if (repertoireReview?.topLinesToReview[0]) {
    const line = repertoireReview.topLinesToReview[0];
    insights.push({
      type: "review",
      message: `Repertoire drift is highest in ${line.lineName}: ${line.recommendedAction}`,
      priority: 8,
    });
  }

  if (repertoireTransferCoaching?.fragileLines[0]) {
    const line = repertoireTransferCoaching.fragileLines[0];
    insights.push({
      type: "review",
      message: `First bad moment review: ${line.lineName} breaks at ply ${line.firstBadMomentPly ?? "?"}${line.firstBadMomentMove ? ` with ${line.firstBadMomentMove}` : ""}.`,
      priority: 9,
    });
  }

  if (repertoireDrillMemory?.fragileLines[0]) {
    const line = repertoireDrillMemory.fragileLines[0];
    insights.push({
      type: "review",
      message: `Drill memory risk is highest in ${line.lineName}: ${(line.forgettingRisk * 100).toFixed(0)}% forgetting risk.`,
      priority: 8,
    });
  }
  if (argsHasRepair(repertoireRepair)) {
    const repair = repertoireRepair.urgentGames[0];
    if (repair) {
      insights.push({
        type: "review",
        message: `Import-to-repair should start with ${repair.lineName} from ${repair.sourceGameId}: ${repair.scheduledDrillReason}`,
        priority: 9,
      });
    }
  }
  if (repertoireRepairOutcomes?.repairsStillFragile[0]) {
    const outcome = repertoireRepairOutcomes.repairsStillFragile[0];
    insights.push({
      type: "review",
      message: `Repair outcome check: ${outcome.lineName} is still fragile - ${outcome.nextAction}`,
      priority: 9,
    });
  }
  if (repertoireRepairOutcomes?.repairsThatWorked[0]) {
    const outcome = repertoireRepairOutcomes.repairsThatWorked[0];
    insights.push({
      type: "strength",
      message: `Repair transfer worked in ${outcome.lineName}: ${outcome.outcomeReason}`,
      priority: 5,
    });
  }

  if (conceptState?.strongestConcepts[0]) {
    const strongest = conceptState.strongestConcepts[0];
    insights.push({
      type: "strength",
      message: `${strongest.conceptName} is a current concept strength (${fmtPct(strongest.masteryScore)} mastery)`,
      priority: 4,
    });
  }

  insights.sort((a, b) => b.priority - a.priority);

  const seenPctStr = overview.totalExercises > 0 ? fmtPct(overview.totalSeen / overview.totalExercises) : "0.0%";
  const progressStatement = `You've seen ${overview.totalSeen} of ${overview.totalExercises} exercises (${seenPctStr}). Lifetime accuracy: ${fmtPct(overview.lifetimeAccuracy)}.`;

  const focusDiff = studyPlan.primaryFocus.difficulty ? ` at ${studyPlan.primaryFocus.difficulty} difficulty` : "";
  const conceptSentence = studyPlan.conceptFocuses[0]
    ? ` Reinforce ${studyPlan.conceptFocuses[0].conceptName}${studyPlan.conceptFocuses[0].prerequisiteGaps.length > 0 ? ` after revisiting ${studyPlan.conceptFocuses[0].prerequisiteGaps.join(", ")}` : ""}.`
    : "";
  const openingSentence = studyPlan.openingFocuses[0]
    ? ` Opening work should emphasize ${studyPlan.openingFocuses.join(", ")}.`
    : "";
  const repertoireSentence = studyPlan.repertoireFocuses[0]
    ? ` Repertoire work should begin with ${studyPlan.repertoireFocuses.map((entry) => entry.lineName).join(", ")}.`
    : "";
  const transferSentence = studyPlan.repertoireTransferFocuses[0]
    ? ` Repair the first bad moment in ${studyPlan.repertoireTransferFocuses.map((entry) => entry.lineName).join(", ")}.`
    : "";
  const drillSentence = studyPlan.repertoireDrillFocuses[0]
    ? ` Review ${studyPlan.repertoireDrillFocuses.map((entry) => entry.lineName).join(", ")} from the drill queue.`
    : "";
  const repairSentence = studyPlan.repertoireRepairFocuses[0]
    ? ` Repair ${studyPlan.repertoireRepairFocuses.map((entry) => entry.lineName).join(", ")} from the latest imported games first.`
    : "";
  const repairOutcomeSentence = studyPlan.repertoireRepairOutcomeFocuses[0]
    ? ` Outcome tracking should follow ${studyPlan.repertoireRepairOutcomeFocuses.map((entry) => entry.lineName).join(", ")} next.`
    : "";
  const nextStepStatement = `Next session: focus on ${studyPlan.primaryFocus.category}${focusDiff}. ${studyPlan.suggestedSessionSize} exercises recommended.${conceptSentence}${openingSentence}${repertoireSentence}${transferSentence}${drillSentence}${repairSentence}${repairOutcomeSentence}`;

  return {
    generatedAt: now,
    headline,
    insights,
    progressStatement,
    nextStepStatement,
    conceptSnapshot: conceptState
      ? {
          topUnstableConcepts: conceptState.topUnstableConcepts.slice(0, 3).map((entry) => ({
            conceptKey: entry.conceptKey,
            conceptName: entry.conceptName,
            reviewPriority: entry.reviewPriority,
          })),
          strongestConcepts: conceptState.strongestConcepts.slice(0, 3).map((entry) => ({
            conceptKey: entry.conceptKey,
            conceptName: entry.conceptName,
            masteryScore: entry.masteryScore,
          })),
          prerequisiteHotspots: conceptState.prerequisiteHotspots.slice(0, 3),
        }
      : null,
    openingSnapshot: openingReport
      ? {
          topFamilies: openingReport.familySummaries.slice(0, 3).map((entry) => ({
            openingFamily: entry.openingFamily,
            openingName: entry.openingName,
            mistakes: entry.mistakes,
          })),
          recurringMistakes: openingReport.recurringMistakes.slice(0, 3).map((entry) => ({
            theme: entry.theme,
            count: entry.count,
          })),
        }
      : null,
    repertoireSnapshot: repertoireReview
      ? {
          currentRepertoireHealth: repertoireReview.currentRepertoireHealth.slice(0, 3).map((entry) => ({
            repertoireKey: entry.repertoireKey,
            repertoireName: entry.repertoireName,
            reviewPriority: entry.reviewPriority,
          })),
          topLinesToReview: repertoireReview.topLinesToReview.slice(0, 3).map((entry) => ({
            repertoireName: entry.repertoireName,
            lineName: entry.lineName,
            reviewPriority: entry.reviewPriority,
          })),
        }
      : repertoireTransfer?.repertoireBuckets[0]
        ? {
            currentRepertoireHealth: repertoireTransfer.repertoireBuckets.slice(0, 3).map((entry) => ({
              repertoireKey: entry.repertoireKey,
              repertoireName: entry.repertoireName,
              reviewPriority: entry.reviewPriority,
            })),
            topLinesToReview: [],
          }
        : null,
    repertoireTransferSnapshot: repertoireTransferCoaching
      ? {
          fragileLines: repertoireTransferCoaching.fragileLines.slice(0, 3).map((entry) => ({
            repertoireName: entry.repertoireName,
            lineName: entry.lineName,
            urgency: entry.urgency,
            transferFailureType: entry.transferFailureType,
          })),
          topActions: repertoireTransferCoaching.topActions.slice(0, 3).map((entry) => ({
            lineName: entry.lineName,
            urgency: entry.urgency,
            action: entry.action,
          })),
        }
      : null,
    repertoireDrillSnapshot: repertoireDrillMemory
      ? {
          fragileLines: repertoireDrillMemory.fragileLines.slice(0, 3).map((entry) => ({
            lineName: entry.lineName,
            forgettingRisk: entry.forgettingRisk,
            recallConfidence: entry.recallConfidence,
          })),
          nextLinesToReview: (repertoireDrillQueue?.nextLinesToReview ?? []).slice(0, 3).map((entry) => ({
            lineName: entry.lineName,
            urgency: entry.urgency,
            nextRecommendedReviewAt: entry.nextRecommendedReviewAt,
          })),
        }
      : null,
    repertoireRepairSnapshot: repertoireRepairQueue
      ? {
          urgentGames: repertoireRepairQueue.urgentGames.slice(0, 3).map((entry) => ({
            sourceGameId: entry.sourceGameId,
            lineName: entry.lineName,
            repairType: entry.repairType,
            urgency: entry.urgencyScore,
          })),
          topRepairLines: repertoireRepairQueue.topRepairLines.slice(0, 3).map((entry) => ({
            lineName: entry.lineName,
            urgency: entry.urgencyScore,
            scheduledDrillReason: entry.scheduledDrillReason,
          })),
        }
      : null,
    repertoireRepairOutcomeSnapshot: repertoireRepairOutcomes
      ? {
          repairsThatWorked: repertoireRepairOutcomes.repairsThatWorked.slice(0, 3).map((entry) => ({
            lineName: entry.lineName,
            outcomeVerdict: entry.outcomeVerdict,
            outcomeReason: entry.outcomeReason,
          })),
          repairsStillFragile: repertoireRepairOutcomes.repairsStillFragile.slice(0, 3).map((entry) => ({
            lineName: entry.lineName,
            outcomeVerdict: entry.outcomeVerdict,
            nextAction: entry.nextAction,
          })),
        }
      : null,
  };
}

function argsHasRepair(
  repair?: RepertoireRepairReport
): repair is RepertoireRepairReport {
  return Boolean(repair && repair.urgentGames.length >= 0);
}
