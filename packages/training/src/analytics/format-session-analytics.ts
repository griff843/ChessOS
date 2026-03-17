/**
 * Format session analytics as markdown.
 *
 * Follows the existing formatting pattern: header → overview table →
 * grade distribution → category breakdown → difficulty breakdown →
 * hardest missed positions.
 */

import type { SessionAnalytics } from "./build-session-analytics";

const fmtPct = (v: number): string => (v * 100).toFixed(1) + "%";
const fmtCp = (v: number | null): string =>
  v !== null ? `${Math.round(v)}cp` : "—";

/**
 * Render session analytics as a markdown report.
 */
export function formatSessionAnalyticsMd(
  analytics: SessionAnalytics
): string {
  const lines: string[] = [];
  const d = analytics.gradeDistribution;
  const total = analytics.totalExercises;
  const exactPct = total > 0 ? fmtPct(d.exact / total) : "—";

  // Header
  lines.push(`# Session Analytics — ${analytics.sessionId}`);
  lines.push("");
  lines.push(`Generated: ${analytics.generatedAt}`);
  lines.push("");

  // Overview
  lines.push("## Overview");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Total exercises | ${total} |`);
  lines.push(`| Exact matches | ${d.exact} (${exactPct}) |`);
  lines.push(
    `| Avg eval loss | ${fmtCp(analytics.evalLossStats.average)} |`
  );
  lines.push(
    `| Median eval loss | ${fmtCp(analytics.evalLossStats.median)} |`
  );
  lines.push(`| Max eval loss | ${fmtCp(analytics.evalLossStats.max)} |`);
  lines.push(
    `| Known eval losses | ${analytics.evalLossStats.count} / ${total - d.exact} |`
  );
  lines.push("");

  // Grade Distribution
  lines.push("## Grade Distribution");
  lines.push("");
  lines.push("| Grade | Count | % |");
  lines.push("|-------|------:|---:|");
  const tierOrder: Array<keyof typeof d> = [
    "exact",
    "acceptable",
    "inaccuracy",
    "mistake",
    "blunder",
    "illegal",
  ];
  for (const tier of tierOrder) {
    const count = d[tier];
    if (count > 0 || tier === "exact") {
      const pct = total > 0 ? fmtPct(count / total) : "—";
      lines.push(`| ${tier} | ${count} | ${pct} |`);
    }
  }
  lines.push("");

  // Category Miss Rates
  const catEntries = Object.entries(analytics.byCategoryMissRate).sort(
    ([, a], [, b]) => b.missRate - a.missRate
  );
  if (catEntries.length > 0) {
    lines.push("## Performance by Category");
    lines.push("");
    lines.push(
      "| Category | Total | Correct | Incorrect | Miss Rate | Avg Loss |"
    );
    lines.push(
      "|----------|------:|--------:|----------:|----------:|---------:|"
    );
    for (const [cat, bucket] of catEntries) {
      lines.push(
        `| ${cat} | ${bucket.total} | ${bucket.correct} | ${bucket.incorrect} | ${fmtPct(bucket.missRate)} | ${fmtCp(bucket.avgEvalLossCp)} |`
      );
    }
    lines.push("");
  }

  // Difficulty Miss Rates
  const diffOrder = ["easy", "medium", "hard"];
  const diffEntries = diffOrder
    .filter((d) => analytics.byDifficultyMissRate[d])
    .map((d) => [d, analytics.byDifficultyMissRate[d]] as const);

  if (diffEntries.length > 0) {
    lines.push("## Performance by Difficulty");
    lines.push("");
    lines.push(
      "| Difficulty | Total | Correct | Incorrect | Miss Rate | Avg Loss |"
    );
    lines.push(
      "|------------|------:|--------:|----------:|----------:|---------:|"
    );
    for (const [diff, bucket] of diffEntries) {
      lines.push(
        `| ${diff} | ${bucket.total} | ${bucket.correct} | ${bucket.incorrect} | ${fmtPct(bucket.missRate)} | ${fmtCp(bucket.avgEvalLossCp)} |`
      );
    }
    lines.push("");
  }

  // Hardest Missed
  if (analytics.hardestMissed.length > 0) {
    lines.push("## Hardest Missed Positions");
    lines.push("");
    lines.push(
      "| # | Exercise | Grade | Eval Loss | Category | Difficulty | Played | Best |"
    );
    lines.push(
      "|---|----------|-------|-----------|----------|------------|--------|------|"
    );
    for (let i = 0; i < analytics.hardestMissed.length; i++) {
      const m = analytics.hardestMissed[i];
      lines.push(
        `| ${i + 1} | ${m.exerciseId} | ${m.gradingTier} | ${fmtCp(m.evalLossCp)} | ${m.lessonCategory} | ${m.difficultyEstimate} | ${m.userMove} | ${m.engineMove} |`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
