import type { RepertoireTransferReport } from "./types.js";

export function formatRepertoireTransferMd(report: RepertoireTransferReport): string {
  let md = "# Repertoire Transfer\n\n";
  md += `Generated: ${report.generatedAt}\n\n`;
  md += `- Games matched: ${report.summary.gamesMatched}\n`;
  md += `- Average in-book depth: ${report.summary.averageInBookDepth.toFixed(2)}\n`;
  md += `- Deviation rate: ${(report.summary.deviationRate * 100).toFixed(1)}%\n`;
  md += `- Memory miss rate: ${(report.summary.memoryMissRate * 100).toFixed(1)}%\n`;
  md += `- Recovery after deviation: ${(report.summary.recoveryAfterDeviationRate * 100).toFixed(1)}%\n\n`;

  md += "## Repertoire Buckets\n\n";
  for (const bucket of report.repertoireBuckets) {
    md += `- ${bucket.repertoireName}: score ${bucket.score.toFixed(2)}, average in-book depth ${bucket.averageInBookDepth.toFixed(2)}\n`;
  }
  md += "\n";

  md += "## Weakest Buckets\n\n";
  for (const bucket of report.weakestBuckets) {
    md += `- ${bucket.label}: ${bucket.reason}\n`;
  }
  md += "\n";

  return md;
}
