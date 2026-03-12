/**
 * Format the learner overview as a markdown artifact.
 *
 * Pure function: no I/O.
 */

import type { LearnerOverview } from "./types.js";

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

/**
 * Format the learner overview dashboard as markdown.
 */
export function formatLearnerOverviewMd(overview: LearnerOverview): string {
  const lines: string[] = [];

  lines.push("# Learner Overview");
  lines.push("");
  lines.push(`Generated: ${overview.generatedAt}`);
  lines.push("");

  // Overview
  lines.push("## Progress Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Total exercises | ${overview.totalExercises} |`);
  lines.push(`| Seen | ${overview.totalSeen} |`);
  lines.push(`| Unseen | ${overview.totalUnseen} |`);
  lines.push(`| Correct (lifetime) | ${overview.totalCorrect} |`);
  lines.push(`| Incorrect (lifetime) | ${overview.totalIncorrect} |`);
  lines.push(`| Lifetime accuracy | ${fmtPct(overview.lifetimeAccuracy)} |`);
  if (overview.recentAccuracy !== null) {
    lines.push(
      `| Recent accuracy (${overview.recentSessionCount} sessions) | ${fmtPct(overview.recentAccuracy)} |`
    );
  } else {
    lines.push("| Recent accuracy | No sessions completed |");
  }
  lines.push("");

  // Mastery Distribution
  lines.push("## Mastery Distribution");
  lines.push("");
  lines.push("| State | Count |");
  lines.push("|-------|------:|");
  const masteryOrder = ["mastered", "improving", "learning", "unstable", "unseen"] as const;
  for (const state of masteryOrder) {
    const count = overview.masteryDistribution[state] ?? 0;
    if (count > 0) {
      lines.push(`| ${state} | ${count} |`);
    }
  }
  lines.push("");

  // Review Load
  lines.push("## Review Load");
  lines.push("");
  lines.push("| Status | Count |");
  lines.push("|--------|------:|");
  lines.push(`| Overdue | ${overview.reviewLoad.overdueCount} |`);
  lines.push(`| Due soon | ${overview.reviewLoad.dueSoonCount} |`);
  lines.push(`| Unstable | ${overview.reviewLoad.unstableCount} |`);
  lines.push(`| **Total reviewable** | **${overview.reviewLoad.totalReviewable}** |`);
  lines.push("");

  // Weakness Highlights
  if (overview.topWeakCategories.length > 0) {
    lines.push("## Weakness Highlights");
    lines.push("");
    lines.push("### Weakest Categories");
    lines.push("");
    lines.push("| Category | Accuracy | Miss Rate | Due | Trend |");
    lines.push("|----------|----------|-----------|-----|-------|");
    for (const w of overview.topWeakCategories) {
      const trend = w.trendDirection ?? "—";
      lines.push(
        `| ${w.key} | ${fmtPct(w.accuracy)} | ${fmtPct(w.missRate)} | ${w.dueCount} | ${trend} |`
      );
    }
    lines.push("");
  }

  if (overview.topWeakDifficulties.length > 0) {
    lines.push("### Weakest Difficulty Bands");
    lines.push("");
    lines.push("| Difficulty | Accuracy | Miss Rate | Due | Trend |");
    lines.push("|------------|----------|-----------|-----|-------|");
    for (const w of overview.topWeakDifficulties) {
      const trend = w.trendDirection ?? "—";
      lines.push(
        `| ${w.key} | ${fmtPct(w.accuracy)} | ${fmtPct(w.missRate)} | ${w.dueCount} | ${trend} |`
      );
    }
    lines.push("");
  }

  // Trend Summary
  const ts = overview.trendSummary;
  const hasTrends =
    ts.improvingCategories.length > 0 ||
    ts.worseningCategories.length > 0 ||
    ts.stableCategories.length > 0;
  if (hasTrends) {
    lines.push("## Trend Summary");
    lines.push("");
    if (ts.improvingCategories.length > 0) {
      lines.push(`- **Improving:** ${ts.improvingCategories.join(", ")}`);
    }
    if (ts.worseningCategories.length > 0) {
      lines.push(`- **Worsening:** ${ts.worseningCategories.join(", ")}`);
    }
    if (ts.stableCategories.length > 0) {
      lines.push(`- **Stable:** ${ts.stableCategories.join(", ")}`);
    }
    if (ts.insufficientDataCategories.length > 0) {
      lines.push(
        `- **Insufficient data:** ${ts.insufficientDataCategories.join(", ")}`
      );
    }
    lines.push("");
  }

  // Recent Sessions
  if (overview.recentSessions.length > 0) {
    lines.push("## Recent Sessions");
    lines.push("");
    lines.push("| Session | Completed | Exercises | Accuracy |");
    lines.push("|---------|-----------|-----------|----------|");
    for (const ss of overview.recentSessions) {
      const date = ss.completedAt.slice(0, 10);
      lines.push(
        `| ${ss.sessionId} | ${date} | ${ss.exerciseCount} | ${fmtPct(ss.accuracy)} |`
      );
    }
    lines.push("");
  }

  // Focus Recommendations
  if (overview.focusRecommendations.length > 0) {
    lines.push("## Focus Recommendations");
    lines.push("");
    lines.push("| # | Category | Difficulty | Score | Reason |");
    lines.push("|---|----------|------------|-------|--------|");
    for (const rec of overview.focusRecommendations) {
      const diff = rec.difficulty ?? "any";
      lines.push(
        `| ${rec.rank} | ${rec.category} | ${diff} | ${rec.focusScore.toFixed(3)} | ${rec.reason} |`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
