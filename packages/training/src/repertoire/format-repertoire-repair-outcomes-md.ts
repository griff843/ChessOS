import type { RepertoireRepairOutcomesReport } from "./types.js";

export function formatRepertoireRepairOutcomesMd(report: RepertoireRepairOutcomesReport): string {
  const lines: string[] = [
    "# Repertoire Repair Outcomes",
    "",
    `Generated at: ${report.generatedAt}`,
    "",
    `Tracked repairs: ${report.summary.trackedRepairs}`,
    `Transferred repairs: ${report.summary.transferredRepairs}`,
    `Repairs still fragile: ${report.summary.fragileRepairs}`,
    "",
    "## Next Actions",
    "",
  ];

  if (report.nextActions.length === 0) {
    lines.push("No repair outcomes tracked yet.");
  } else {
    for (const entry of report.nextActions) {
      lines.push(`- ${entry.lineName}: ${entry.outcomeVerdict.replace(/_/g, " ")} - ${entry.nextAction}`);
    }
  }

  lines.push("", "## Repairs That Worked", "");
  if (report.repairsThatWorked.length === 0) {
    lines.push("No transferred repairs recorded yet.");
  } else {
    for (const entry of report.repairsThatWorked) {
      lines.push(`- ${entry.lineName}: ${entry.outcomeReason}`);
    }
  }

  lines.push("", "## Repairs Still Fragile", "");
  if (report.repairsStillFragile.length === 0) {
    lines.push("No fragile repairs recorded.");
  } else {
    for (const entry of report.repairsStillFragile) {
      lines.push(`- ${entry.lineName}: ${entry.outcomeReason}`);
    }
  }

  return lines.join("\n");
}
