import type { RepertoireMap } from "./types.js";

export function formatRepertoireMapMd(map: RepertoireMap): string {
  let md = "# Repertoire Map\n\n";
  md += `Generated: ${map.generatedAt}\n\n`;

  for (const repertoire of map.repertoires) {
    md += `## ${repertoire.repertoireName}\n\n`;
    md += `- Key: \`${repertoire.repertoireKey}\`\n`;
    md += `- Side: ${repertoire.repertoireSide}\n`;
    md += `- Source: ${repertoire.sourceCourse}\n`;
    md += `- Opening families: ${repertoire.openingFamilies.join(", ")}\n`;
    md += `- Concept mappings: ${repertoire.conceptMappings.join(", ")}\n\n`;
    md += "### Seeded Lines\n\n";
    for (const line of repertoire.lineTree) {
      md += `- ${line.lineName} (\`${line.lineId}\`): ${line.canonicalMoves.join(" ")}\n`;
    }
    md += "\n";
  }

  return md;
}
