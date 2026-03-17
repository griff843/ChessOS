import type { RepertoireDrillQueueReport } from "./types.js";

export function formatRepertoireDrillQueueMd(report: RepertoireDrillQueueReport): string {
  let md = "# Repertoire Drill Queue\n\n";
  md += `Generated: ${report.generatedAt}\n\n`;
  md += `- Queue size: ${report.summary.queueSize}\n`;
  md += `- Immediate reviews: ${report.summary.immediateCount}\n`;
  md += `- Stable lines: ${report.summary.stableCount}\n\n`;

  md += "## Next Lines To Review\n\n";
  for (const entry of report.nextLinesToReview) {
    md += `- ${entry.lineName}: urgency ${entry.urgency.toFixed(2)}${entry.nextRecommendedReviewAt ? `, next review ${entry.nextRecommendedReviewAt}` : ""}\n`;
  }
  md += "\n";

  md += "## Strongest Lines\n\n";
  for (const entry of report.strongestLines) {
    md += `- ${entry.lineName}: recall confidence ${(entry.recallConfidence * 100).toFixed(1)}%, stability ${(entry.stabilityScore * 100).toFixed(1)}%\n`;
  }
  md += "\n";

  return md;
}
