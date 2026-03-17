import type { RepertoireDrillMemoryReport } from "./types.js";

export function formatRepertoireDrillMemoryMd(report: RepertoireDrillMemoryReport): string {
  let md = "# Repertoire Drill Memory\n\n";
  md += `Generated: ${report.generatedAt}\n\n`;
  md += `- Line count: ${report.summary.lineCount}\n`;
  md += `- Reviewed lines: ${report.summary.reviewedLineCount}\n`;
  md += `- Average recall confidence: ${(report.summary.averageRecallConfidence * 100).toFixed(1)}%\n`;
  md += `- Average forgetting risk: ${(report.summary.averageForgettingRisk * 100).toFixed(1)}%\n\n`;

  md += "## Fragile Lines\n\n";
  for (const entry of report.fragileLines) {
    md += `- ${entry.repertoireName} / ${entry.lineName}: confidence ${(entry.recallConfidence * 100).toFixed(1)}%, forgetting risk ${(entry.forgettingRisk * 100).toFixed(1)}%\n`;
  }
  md += "\n";

  md += "## Strongest Lines\n\n";
  for (const entry of report.strongestLines) {
    md += `- ${entry.repertoireName} / ${entry.lineName}: stability ${(entry.stabilityScore * 100).toFixed(1)}%\n`;
  }
  md += "\n";

  return md;
}
