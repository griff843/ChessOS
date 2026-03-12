/**
 * Build a deterministic coaching summary from learner state.
 *
 * Pure function: produces a headline, insights, progress statement,
 * and next-step statement grounded in actual data. No LLM calls. No I/O.
 */

import type { LearnerOverview } from "../dashboard/types.js";
import type { TrendProfile } from "../trends/types.js";
import type {
  CoachingSummary,
  CoachingInsight,
  MistakePatterns,
  StudyPlan,
} from "./types.js";

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

/**
 * Build coaching summary from overview, mistake patterns, study plan, and trends.
 */
export function buildCoachingSummary(
  overview: LearnerOverview,
  mistakePatterns: MistakePatterns,
  studyPlan: StudyPlan,
  trendProfile: TrendProfile
): CoachingSummary {
  const now = new Date().toISOString();
  const insights: CoachingInsight[] = [];

  // ── Headline ────────────────────────────────────────────────────

  const primary = studyPlan.primaryFocus.category;
  let headline: string;

  if (overview.recentAccuracy === null) {
    headline = overview.totalSeen > 0
      ? `Getting started — ${overview.totalSeen} exercises attempted`
      : "Ready to begin — no exercises attempted yet";
  } else if (
    overview.recentAccuracy > overview.lifetimeAccuracy + 0.05
  ) {
    headline = `Improving steadily — focus on ${primary}`;
  } else if (
    overview.recentAccuracy < overview.lifetimeAccuracy - 0.05
  ) {
    // Find worst category
    const worst = mistakePatterns.categoryPatterns[0];
    const worstCat = worst ? worst.category : primary;
    headline = `Accuracy declining — review ${worstCat}`;
  } else {
    headline = `Steady progress — continue with ${primary}`;
  }

  // ── Insights ────────────────────────────────────────────────────

  // Review pressure (priority 9)
  if (overview.reviewLoad.overdueCount > 0) {
    insights.push({
      type: "review",
      message: `${overview.reviewLoad.overdueCount} exercise${overview.reviewLoad.overdueCount === 1 ? " is" : "s are"} overdue for review`,
      priority: 9,
    });
  }

  // Critical weakness patterns (priority 8)
  for (const pattern of mistakePatterns.categoryPatterns) {
    if (pattern.severity === "critical") {
      insights.push({
        type: "weakness",
        message: pattern.description,
        priority: 8,
      });
    }
  }

  // Worsening trends (priority 7)
  for (const cat of overview.trendSummary.worseningCategories) {
    const bucket = trendProfile.byCategory[cat];
    if (bucket) {
      insights.push({
        type: "trend",
        message: `${cat} is worsening: lifetime ${fmtPct(bucket.lifetimeAccuracy)} → recent ${fmtPct(bucket.recentAccuracy)}`,
        priority: 7,
      });
    }
  }

  // Milestones (priority 5)
  const seenPct = overview.totalExercises > 0
    ? overview.totalSeen / overview.totalExercises
    : 0;
  const milestones = [
    { threshold: 1.0, label: "all exercises" },
    { threshold: 0.75, label: "75% of exercises" },
    { threshold: 0.50, label: "50% of exercises" },
    { threshold: 0.25, label: "25% of exercises" },
  ];
  for (const m of milestones) {
    if (seenPct >= m.threshold) {
      insights.push({
        type: "milestone",
        message: `You've seen ${m.label} (${overview.totalSeen}/${overview.totalExercises})`,
        priority: 5,
      });
      break; // Only report the highest milestone
    }
  }

  // Improving trends (priority 4)
  for (const cat of overview.trendSummary.improvingCategories) {
    const bucket = trendProfile.byCategory[cat];
    if (bucket) {
      insights.push({
        type: "trend",
        message: `${cat} is improving: lifetime ${fmtPct(bucket.lifetimeAccuracy)} → recent ${fmtPct(bucket.recentAccuracy)}`,
        priority: 4,
      });
    }
  }

  // Strengths (priority 3)
  for (const [cat, bucket] of Object.entries(trendProfile.byCategory)) {
    if (bucket.lifetimeAccuracy >= 0.80 && bucket.lifetimeSeen >= 3) {
      insights.push({
        type: "strength",
        message: `Strong in ${cat} (${fmtPct(bucket.lifetimeAccuracy)} accuracy)`,
        priority: 3,
      });
    }
  }

  // Unstable mastery (priority 6)
  if (overview.reviewLoad.unstableCount > 0) {
    insights.push({
      type: "review",
      message: `${overview.reviewLoad.unstableCount} exercise${overview.reviewLoad.unstableCount === 1 ? " has" : "s have"} unstable mastery`,
      priority: 6,
    });
  }

  // Sort by priority descending
  insights.sort((a, b) => b.priority - a.priority);

  // ── Progress Statement ──────────────────────────────────────────

  const seenPctStr = overview.totalExercises > 0
    ? fmtPct(overview.totalSeen / overview.totalExercises)
    : "0.0%";
  const progressStatement = `You've seen ${overview.totalSeen} of ${overview.totalExercises} exercises (${seenPctStr}). Lifetime accuracy: ${fmtPct(overview.lifetimeAccuracy)}.`;

  // ── Next Step Statement ─────────────────────────────────────────

  const focusDiff = studyPlan.primaryFocus.difficulty
    ? ` at ${studyPlan.primaryFocus.difficulty} difficulty`
    : "";
  const nextStepStatement = `Next session: focus on ${studyPlan.primaryFocus.category}${focusDiff}. ${studyPlan.suggestedSessionSize} exercises recommended.`;

  return {
    generatedAt: now,
    headline,
    insights,
    progressStatement,
    nextStepStatement,
  };
}
