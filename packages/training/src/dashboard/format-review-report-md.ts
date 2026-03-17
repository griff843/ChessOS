/**
 * Format the review report as a markdown artifact.
 *
 * Pure function: no I/O.
 */

import type { ReviewReport, ReviewReportEntry } from "./types.js";

function fmtUrgency(u: number): string {
  return u.toFixed(2);
}

function fmtTier(tier: string | null): string {
  return tier ?? "—";
}

function formatItemsTable(
  items: ReviewReportEntry[],
  maxItems: number = 10
): string[] {
  const lines: string[] = [];
  if (items.length === 0) {
    lines.push("_None_");
    return lines;
  }

  lines.push(
    "| # | Exercise | Urgency | Mastery | Last Grade | Category | Difficulty |"
  );
  lines.push(
    "|---|----------|---------|---------|------------|----------|------------|"
  );
  const shown = items.slice(0, maxItems);
  for (let i = 0; i < shown.length; i++) {
    const e = shown[i];
    lines.push(
      `| ${i + 1} | ${e.exerciseId} | ${fmtUrgency(e.reviewUrgency)} | ${e.masteryState} | ${fmtTier(e.lastGradingTier)} | ${e.lessonCategory} | ${e.difficultyEstimate} |`
    );
  }
  if (items.length > maxItems) {
    lines.push(`| | _...and ${items.length - maxItems} more_ | | | | | |`);
  }
  return lines;
}

/**
 * Format the review report as markdown.
 */
export function formatReviewReportMd(report: ReviewReport): string {
  const lines: string[] = [];

  lines.push("# Review Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push("| Status | Count |");
  lines.push("|--------|------:|");
  lines.push(`| Overdue | ${report.totalOverdue} |`);
  lines.push(`| Due soon | ${report.totalDueSoon} |`);
  lines.push(`| Unstable | ${report.totalUnstable} |`);
  lines.push(
    `| **Total** | **${report.totalOverdue + report.totalDueSoon + report.totalUnstable}** |`
  );
  lines.push("");

  // Urgent Items
  lines.push("## Urgent Items (Overdue)");
  lines.push("");
  lines.push(...formatItemsTable(report.urgentItems));
  lines.push("");

  // Due Soon
  lines.push("## Due Soon");
  lines.push("");
  lines.push(...formatItemsTable(report.dueSoonItems));
  lines.push("");

  // Unstable
  lines.push("## Unstable Items");
  lines.push("");
  lines.push(...formatItemsTable(report.unstableItems));
  lines.push("");

  // Blunder-Prone
  lines.push("## Blunder-Prone Items");
  lines.push("");
  lines.push(...formatItemsTable(report.blunderProneItems));
  lines.push("");

  // Category Urgency
  if (report.categoryUrgency.length > 0) {
    lines.push("## Category Urgency");
    lines.push("");
    lines.push("| Category | Reviewable | Avg Urgency | Overdue |");
    lines.push("|----------|-----------|-------------|---------|");
    for (const cu of report.categoryUrgency) {
      lines.push(
        `| ${cu.category} | ${cu.totalReviewable} | ${fmtUrgency(cu.avgUrgency)} | ${cu.overdueCount} |`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
