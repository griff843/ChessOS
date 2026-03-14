import type { OpeningMistake } from "./types";

export function formatOpeningMistakesMd(mistakes: OpeningMistake[]): string {
  const lines: string[] = [];
  lines.push("# Opening Mistakes");
  lines.push("");
  lines.push(`Mistakes tracked: ${mistakes.length}`);
  lines.push("");

  for (const mistake of mistakes) {
    lines.push(`- ${mistake.openingName} (${mistake.openingFamily}) - ${mistake.theme.replace(/_/g, " ")} - ${mistake.severity}`);
    lines.push(`  game ${mistake.sourceGameId} ply ${mistake.ply}: ${mistake.explanation}`);
    lines.push(`  concepts: ${mistake.conceptMappings.join(", ")}`);
  }

  return lines.join("\n");
}
