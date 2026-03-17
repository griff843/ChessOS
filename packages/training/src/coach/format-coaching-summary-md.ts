/**
 * Format the coaching summary as a markdown artifact.
 *
 * Pure function: no I/O.
 */

import type { CoachingSummary } from "./types.js";

function insightIcon(type: string): string {
  switch (type) {
    case "review":
      return "[!]";
    case "weakness":
      return "[-]";
    case "trend":
      return "[~]";
    case "strength":
      return "[+]";
    case "milestone":
      return "[*]";
    default:
      return "[ ]";
  }
}

/**
 * Format the coaching summary as markdown.
 */
export function formatCoachingSummaryMd(summary: CoachingSummary): string {
  const lines: string[] = [];

  lines.push("# Coaching Summary");
  lines.push("");
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push("");

  // Headline
  lines.push(`> **${summary.headline}**`);
  lines.push("");

  // Progress
  lines.push("## Progress");
  lines.push("");
  lines.push(summary.progressStatement);
  lines.push("");

  // Insights
  if (summary.insights.length > 0) {
    lines.push("## Insights");
    lines.push("");
    for (const insight of summary.insights) {
      lines.push(`- ${insightIcon(insight.type)} ${insight.message}`);
    }
    lines.push("");
  }

  // Next Step
  lines.push("## Next Step");
  lines.push("");
  lines.push(summary.nextStepStatement);
  lines.push("");

  return lines.join("\n");
}
