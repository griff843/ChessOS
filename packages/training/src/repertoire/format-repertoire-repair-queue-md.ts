import type { RepertoireRepairQueueReport } from "./types.js";

export function formatRepertoireRepairQueueMd(report: RepertoireRepairQueueReport): string {
  const lines = [
    "# Repertoire Repair Queue",
    "",
    `Generated at: ${report.generatedAt}`,
    "",
    "## Top Repair Lines",
  ];

  if (report.topRepairLines.length === 0) {
    lines.push("", "No repair queue entries.");
  } else {
    for (const entry of report.topRepairLines) {
      lines.push(
        "",
        `- ${entry.lineName} (urgency ${entry.urgencyScore.toFixed(2)})`,
        `  - ${entry.scheduledDrillReason}`
      );
    }
  }

  lines.push("", "## Summary");
  lines.push(`- Queue size: ${report.summary.queueSize}`);
  lines.push(`- Immediate repairs: ${report.summary.immediateRepairCount}`);
  lines.push(`- Concept repairs: ${report.summary.conceptRepairCount}`);

  return lines.join("\n");
}
