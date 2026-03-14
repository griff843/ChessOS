import type { RepertoireRepairReport } from "./types.js";

export function formatRepertoireRepairMd(report: RepertoireRepairReport): string {
  const lines = [
    "# Repertoire Repair",
    "",
    `Generated at: ${report.generatedAt}`,
    "",
    "## Urgent Games",
  ];

  if (report.urgentGames.length === 0) {
    lines.push("", "No repair candidates detected.");
  } else {
    for (const entry of report.urgentGames.slice(0, 8)) {
      lines.push(
        "",
        `- ${entry.sourceGameId}: ${entry.lineName} [${entry.repairType}]`,
        `  - First bad moment: ply ${entry.firstBadMomentPly ?? "?"}${entry.firstBadMomentMove ? ` with ${entry.firstBadMomentMove}` : ""}`,
        `  - Reason: ${entry.firstBadMomentReason}`,
        `  - Review: ${entry.recommendedReviewLine}`,
        `  - Drill: ${entry.scheduledDrillReason}`
      );
    }
  }

  lines.push("", "## Repair Summary");
  for (const entry of report.repairByType) {
    lines.push(`- ${entry.repairType}: ${entry.count} (${entry.lines.join(", ")})`);
  }

  return lines.join("\n");
}
