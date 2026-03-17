import type { OpeningMistake, OpeningReport } from "./types";

export function formatOpeningReportMd(report: OpeningReport, mistakes: OpeningMistake[]): string {
  const lines: string[] = [];
  lines.push("# Opening Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Openings tracked: ${report.familySummaries.length}`);
  lines.push(`Opening mistakes: ${mistakes.length}`);
  lines.push("");

  if (report.topWeaknesses.length > 0) {
    lines.push("## Top Weaknesses");
    lines.push("");
    for (const weakness of report.topWeaknesses) {
      lines.push(`- ${weakness.openingName}: ${weakness.theme.replace(/_/g, " ")} (${weakness.count}) - ${weakness.conceptMappings.join(", ")}`);
    }
    lines.push("");
  }

  if (report.recurringMistakes.length > 0) {
    lines.push("## Recurring Mistakes");
    lines.push("");
    for (const recurring of report.recurringMistakes) {
      lines.push(`- ${recurring.theme.replace(/_/g, " ")}: ${recurring.count} across ${recurring.openings.join(", ")}`);
    }
    lines.push("");
  }

  lines.push("## Families");
  lines.push("");
  for (const summary of report.familySummaries) {
    const themes = summary.topThemes.map((entry) => `${entry.theme.replace(/_/g, " ")} (${entry.count})`).join(", ");
    lines.push(`- ${summary.openingName}: ${summary.games} game(s), ${summary.mistakes} flagged issue(s), confidence ${summary.averageConfidence.toFixed(2)}${themes ? `, themes ${themes}` : ""}`);
    lines.push(`  concepts: ${summary.conceptMappings.join(", ")}`);
  }

  if (report.recommendedTrainingThemes.length > 0) {
    lines.push("");
    lines.push("## Recommended Training Themes");
    lines.push("");
    for (const theme of report.recommendedTrainingThemes) {
      lines.push(`- ${theme}`);
    }
  }

  return lines.join("\n");
}
