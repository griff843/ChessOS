/**
 * Format the review queue as a human-readable markdown report.
 */

import type { ReviewQueue } from "./build-review-queue.js";
import type { MasteryState } from "./derive-mastery-state.js";

/**
 * Render the review queue as a markdown table with summary.
 */
export function formatReviewQueueMd(queue: ReviewQueue): string {
  const lines: string[] = [];

  lines.push("# Review Queue");
  lines.push("");
  lines.push(`Generated: ${queue.generatedAt}`);
  lines.push("");

  // Summary by mastery state
  const masteryCount: Record<string, number> = {};
  for (const e of queue.entries) {
    masteryCount[e.masteryState] = (masteryCount[e.masteryState] ?? 0) + 1;
  }

  lines.push("## Summary");
  lines.push("");
  lines.push(`Total entries: ${queue.totalEntries}`);
  lines.push("");
  if (queue.totalEntries > 0) {
    lines.push("| Mastery State | Count |");
    lines.push("|---------------|------:|");
    for (const [state, count] of Object.entries(masteryCount)) {
      lines.push(`| ${state} | ${count} |`);
    }
    lines.push("");
  }

  // Reason breakdown
  const reasonCount: Record<string, number> = {};
  for (const e of queue.entries) {
    reasonCount[e.reason] = (reasonCount[e.reason] ?? 0) + 1;
  }
  if (queue.totalEntries > 0) {
    lines.push("| Reason | Count |");
    lines.push("|--------|------:|");
    for (const [reason, count] of Object.entries(reasonCount)) {
      lines.push(`| ${reason} | ${count} |`);
    }
    lines.push("");
  }

  // Detail table
  if (queue.totalEntries > 0) {
    lines.push("## Entries");
    lines.push("");
    lines.push(
      "| # | Exercise | Mastery | Urgency | Last Grade | Quality | Interval | Reason |"
    );
    lines.push(
      "|---|----------|---------|---------|------------|---------|----------|--------|"
    );

    for (let i = 0; i < queue.entries.length; i++) {
      const e = queue.entries[i];
      const urgencyStr = (e.reviewUrgency ?? 0).toFixed(2);
      const qualityStr = (e.rollingQualityScore ?? 0).toFixed(2);
      const gradeStr = e.lastGradingTier ?? "—";
      const intervalStr = `${e.intervalDays ?? 0}d`;

      lines.push(
        `| ${i + 1} | ${e.exerciseId} | ${e.masteryState} | ${urgencyStr} | ${gradeStr} | ${qualityStr} | ${intervalStr} | ${e.reason} |`
      );
    }
    lines.push("");
  } else {
    lines.push("No exercises need review.");
    lines.push("");
  }

  return lines.join("\n");
}
