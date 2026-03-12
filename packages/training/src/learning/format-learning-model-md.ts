import type { LearningModel } from "./types";

export function formatLearningModelMd(model: LearningModel): string {
  const lines: string[] = [];
  lines.push("# Learning Model");
  lines.push("");
  lines.push(`Generated: ${model.generatedAt}`);
  lines.push(`Average mastery: ${(model.summary.averageMastery * 100).toFixed(1)}%`);
  lines.push(`Average retention: ${(model.summary.averageRetention * 100).toFixed(1)}%`);
  lines.push(`Average stability: ${(model.summary.averageStability * 100).toFixed(1)}%`);
  lines.push(`Average forgetting risk: ${(model.summary.averageForgettingRisk * 100).toFixed(1)}%`);
  lines.push("");

  if (model.nextReviewRecommendations.length > 0) {
    lines.push("## Recommended Reviews");
    lines.push("");
    for (const entry of model.nextReviewRecommendations) {
      lines.push(`- ${entry.conceptName}: review by ${entry.nextRecommendedReviewAt ?? "now"} (risk ${(entry.forgettingRisk * 100).toFixed(0)}%)`);
    }
    lines.push("");
  }

  lines.push("## Concepts");
  lines.push("");
  for (const concept of model.concepts) {
    lines.push(`- ${concept.conceptName} [${concept.status}] mastery ${(concept.masteryScore * 100).toFixed(0)}%, retention ${(concept.retentionScore * 100).toFixed(0)}%, stability ${(concept.stabilityScore * 100).toFixed(0)}%, forgetting risk ${(concept.forgettingRisk * 100).toFixed(0)}%`);
  }

  return lines.join("\n");
}
