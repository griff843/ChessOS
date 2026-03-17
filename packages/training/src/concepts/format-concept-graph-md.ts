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
      lines.push(`### ${concept.conceptName}`);
      lines.push(`- Key: ${concept.conceptKey}`);
      lines.push(`- Difficulty: ${concept.difficultyBand}`);
      lines.push(`- Description: ${concept.description}`);
      if (concept.prerequisiteConcepts.length > 0) {
        lines.push(`- Prerequisites: ${concept.prerequisiteConcepts.join(", ")}`);
      }
      if (concept.relatedConcepts.length > 0) {
        lines.push(`- Related: ${concept.relatedConcepts.join(", ")}`);
      }
      if (concept.childConcepts.length > 0) {
        lines.push(`- Children: ${concept.childConcepts.join(", ")}`);
      }
      lines.push(`- Training Tags: ${concept.trainingTags.join(", ")}`);
      lines.push(`- Source Themes: ${concept.sourceThemes.join(", ")}`);
      if (concept.sourceLessonCategories.length > 0) {
        lines.push(`- Lesson Categories: ${concept.sourceLessonCategories.join(", ")}`);
      }
      if (concept.sourceReasonCodes.length > 0) {
        lines.push(`- Reason Codes: ${concept.sourceReasonCodes.join(", ")}`);
      }
      if (concept.sourceOpeningThemes.length > 0) {
        lines.push(`- Opening Themes: ${concept.sourceOpeningThemes.join(", ")}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

