import type { RepertoireReviewReport } from "./types.js";

export function formatRepertoireReviewMd(report: RepertoireReviewReport): string {
  let md = "# Repertoire Review\n\n";
  md += `Generated: ${report.generatedAt}\n\n`;

  md += "## Current Repertoire Health\n\n";
  for (const entry of report.currentRepertoireHealth) {
    md += `- ${entry.repertoireName}: ${entry.games} games, average in-book depth ${entry.averageInBookDepth.toFixed(2)}, deviation rate ${(entry.deviationRate * 100).toFixed(1)}%\n`;
  }
  md += "\n";

  md += "## Top Lines To Review\n\n";
  for (const entry of report.topLinesToReview) {
    md += `- ${entry.repertoireName} / ${entry.lineName}: ${entry.recommendedAction}\n`;
  }
  md += "\n";

  md += "## First Deviation Patterns\n\n";
  for (const pattern of report.firstDeviationPatterns) {
    md += `- ${pattern.deviationType}: ${pattern.count} games (${pattern.lines.join(", ")})\n`;
  }
  md += "\n";

  return md;
}
