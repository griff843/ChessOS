import type { ConceptGraph } from "./types";

export function formatConceptGraphMd(graph: ConceptGraph): string {
  const lines: string[] = [];
  lines.push("# Concept Graph");
  lines.push("");
  lines.push(`Generated: ${graph.generatedAt}`);
  lines.push("");

  for (const summary of graph.categorySummaries) {
    lines.push(`## ${summary.category}`);
    lines.push("");
    for (const key of summary.concepts) {
      const concept = graph.conceptIndex[key];
      lines.push(`- ${concept.conceptName} (
${concept.conceptKey})`);
      if (concept.prerequisiteConcepts.length > 0) {
        lines.push(`  prerequisites: ${concept.prerequisiteConcepts.join(", ")}`);
      }
      if (concept.relatedConcepts.length > 0) {
        lines.push(`  related: ${concept.relatedConcepts.join(", ")}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}
