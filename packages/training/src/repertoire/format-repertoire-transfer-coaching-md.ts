import type { RepertoireTransferCoachingReport } from "./types.js";

export function formatRepertoireTransferCoachingMd(report: RepertoireTransferCoachingReport): string {
  let md = "# Repertoire Transfer Coaching\n\n";
  md += `Generated: ${report.generatedAt}\n\n`;
  md += `- Matched lines: ${report.summary.matchedLines}\n`;
  md += `- Unstable lines: ${report.summary.unstableLines}\n`;
  md += `- Average recall confidence: ${(report.summary.averageLineRecallConfidence * 100).toFixed(1)}%\n\n`;

  md += "## Fragile Lines\n\n";
  for (const entry of report.fragileLines) {
    md += `- ${entry.repertoireName} / ${entry.lineName}: ${entry.coachingSummary}\n`;
  }
  md += "\n";

  md += "## Top Actions\n\n";
  for (const entry of report.topActions) {
    md += `- ${entry.lineName}: ${entry.action}\n`;
  }
  md += "\n";

  md += "## Drill Vs Game Gaps\n\n";
  for (const gap of report.drillVsGameGaps) {
    md += `- ${gap.gap}: ${gap.count} line(s) (${gap.lines.join(", ")})\n`;
  }
  md += "\n";

  return md;
}
