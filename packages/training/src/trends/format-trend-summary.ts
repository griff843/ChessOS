/**
 * Format a trend-aware learner summary as markdown.
 *
 * Extends the M6C learner summary with:
 *   - Trend directions per category
 *   - Improving / worsening categories
 *   - Current difficulty policy
 *   - Recency-weighted adaptive weights
 */

import type { TrendProfile, TrendBucket, DifficultyPolicy } from "./types";

/**
 * Format a trend bucket as a table row.
 */
function formatTrendRow(key: string, b: TrendBucket): string {
  const lifetimeAcc = (b.lifetimeAccuracy * 100).toFixed(0);
  const recentAcc = b.recentSeen > 0 ? (b.recentAccuracy * 100).toFixed(0) + "%" : "—";
  const trend = b.trendDirection === "insufficient_data" ? "—" : b.trendDirection;
  const weight = b.adaptiveWeight.toFixed(2);
  return `| ${key} | ${b.lifetimeSeen} | ${b.lifetimeCorrect} | ${b.lifetimeIncorrect} | ${lifetimeAcc}% | ${b.recentSeen} | ${recentAcc} | ${trend} | ${weight} | ${b.dueCount} |`;
}

/**
 * Format the trend-aware learner summary as markdown.
 *
 * @param profile  Trend profile with all stats computed
 * @param policy   Difficulty auto-adjustment policy
 * @returns Markdown string for learner-summary.md
 */
export function formatTrendSummaryMd(
  profile: TrendProfile,
  policy: DifficultyPolicy
): string {
  const lines: string[] = [];

  lines.push("# Learner Summary");
  lines.push("");
  lines.push(`Generated: ${profile.generatedAt}`);
  lines.push("");

  // Overview
  lines.push("## Overview");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Total exercises | ${profile.totalExercises} |`);
  lines.push(`| Seen | ${profile.totalSeen} |`);
  lines.push(`| Correct | ${profile.totalCorrect} |`);
  lines.push(`| Incorrect | ${profile.totalIncorrect} |`);
  lines.push(`| Overall accuracy | ${(profile.overallAccuracy * 100).toFixed(1)}% |`);

  let overdueCount = 0;
  for (const b of Object.values(profile.byCategory)) overdueCount += b.dueCount;
  lines.push(`| Overdue for review | ${overdueCount} |`);
  lines.push("");

  // Strengths / weaknesses / trends
  const catEntries = Object.entries(profile.byCategory)
    .filter(([, b]) => b.lifetimeCorrect + b.lifetimeIncorrect > 0);

  const strongest = catEntries
    .filter(([, b]) => b.lifetimeAccuracy >= 0.7)
    .map(([k]) => k);
  const weakest = catEntries
    .filter(([, b]) => b.lifetimeAccuracy < 0.5)
    .map(([k]) => k);
  const improving = catEntries
    .filter(([, b]) => b.trendDirection === "improving")
    .map(([k]) => k);
  const worsening = catEntries
    .filter(([, b]) => b.trendDirection === "worsening")
    .map(([k]) => k);

  if (weakest.length === 0 && catEntries.length > 0) {
    const sorted = [...catEntries].sort(([, a], [, b]) => a.lifetimeAccuracy - b.lifetimeAccuracy);
    weakest.push(sorted[0][0]);
  }

  lines.push("## Strengths");
  lines.push("");
  lines.push(strongest.length > 0
    ? `- **Strongest categories:** ${strongest.join(", ")}`
    : "- No strong categories yet (need more data)");

  const diffEntries = Object.entries(profile.byDifficulty)
    .filter(([, b]) => b.lifetimeCorrect + b.lifetimeIncorrect > 0)
    .sort(([, a], [, b]) => b.lifetimeAccuracy - a.lifetimeAccuracy);
  if (diffEntries.length > 0) {
    lines.push(`- **Strongest difficulty:** ${diffEntries[0][0]}`);
  }
  lines.push("");

  lines.push("## Weaknesses");
  lines.push("");
  lines.push(weakest.length > 0
    ? `- **Weakest categories:** ${weakest.join(", ")}`
    : "- No weak categories identified yet");
  if (diffEntries.length > 0) {
    lines.push(`- **Weakest difficulty:** ${diffEntries[diffEntries.length - 1][0]}`);
  }
  lines.push("");

  lines.push("## Trends");
  lines.push("");
  lines.push(improving.length > 0
    ? `- **Improving:** ${improving.join(", ")}`
    : "- No improving categories detected");
  lines.push(worsening.length > 0
    ? `- **Worsening:** ${worsening.join(", ")}`
    : "- No worsening categories detected");
  lines.push("");

  // Difficulty policy
  lines.push("## Difficulty Policy");
  lines.push("");
  lines.push(`- **Baseline:** ${policy.baseline.easy} easy / ${policy.baseline.medium} medium / ${policy.baseline.hard} hard`);
  lines.push(`- **Adjusted:** ${policy.adjusted.easy} easy / ${policy.adjusted.medium} medium / ${policy.adjusted.hard} hard`);
  lines.push(`- **Reason:** ${policy.reason}`);
  lines.push("");

  // Category breakdown
  lines.push("## Performance by Category");
  lines.push("");
  lines.push("| Category | Seen | Correct | Incorrect | Lifetime Acc | Recent | Recent Acc | Trend | Weight | Due |");
  lines.push("|----------|------|---------|-----------|-------------|--------|------------|-------|--------|-----|");
  for (const [key, bucket] of Object.entries(profile.byCategory).sort(
    ([, a], [, b]) => b.adaptiveWeight - a.adaptiveWeight
  )) {
    lines.push(formatTrendRow(key, bucket));
  }
  lines.push("");

  // Difficulty breakdown
  lines.push("## Performance by Difficulty");
  lines.push("");
  lines.push("| Difficulty | Seen | Correct | Incorrect | Lifetime Acc | Recent | Recent Acc | Trend | Weight | Due |");
  lines.push("|------------|------|---------|-----------|-------------|--------|------------|-------|--------|-----|");
  for (const key of ["easy", "medium", "hard"]) {
    const bucket = profile.byDifficulty[key];
    if (bucket) lines.push(formatTrendRow(key, bucket));
  }
  lines.push("");

  return lines.join("\n");
}
