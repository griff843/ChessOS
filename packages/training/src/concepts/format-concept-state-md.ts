import type { ConceptStateReport } from "./types";

export function formatConceptStateMd(report: ConceptStateReport): string {
  const lines: string[] = [];
  lines.push("# Concept State");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");

  if (report.recommendedFocuses.length > 0) {
    lines.push("## Recommended Focuses");
    lines.push("");
    for (const focus of report.recommendedFocuses) {
      lines.push(`- ${focus.conceptName} (${focus.conceptKey}) - priority ${focus.reviewPriority.toFixed(2)}`);
      lines.push(`  ${focus.explanation}`);
      if (focus.prerequisiteGaps.length > 0) {
        lines.push(`  prerequisite gaps: ${focus.prerequisiteGaps.join(", ")}`);
      }
      if (focus.adjacentWeaknesses.length > 0) {
        lines.push(`  adjacent weaknesses: ${focus.adjacentWeaknesses.join(", ")}`);
      }
      if (focus.reinforcementPath.length > 0) {
        lines.push(`  reinforcement path: ${focus.reinforcementPath.join(" -> ")}`);
      }
    }
    lines.push("");
  }

  if (report.topUnstableConcepts.length > 0) {
    lines.push("## Top Unstable Concepts");
    lines.push("");
    for (const entry of report.topUnstableConcepts) {
      lines.push(`- ${entry.conceptName} (${entry.conceptKey}) - ${entry.conceptCategory} - priority ${entry.reviewPriority.toFixed(2)}`);
    }
    lines.push("");
  }

  if (report.strongestConcepts.length > 0) {
    lines.push("## Strongest Concepts");
    lines.push("");
    for (const entry of report.strongestConcepts) {
      lines.push(`- ${entry.conceptName} (${entry.conceptKey}) - mastery ${entry.masteryScore.toFixed(2)} - stability ${entry.stabilityScore.toFixed(2)}`);
    }
    lines.push("");
  }

  if (report.clusterWeaknesses.length > 0) {
    lines.push("## Cluster Pressure");
    lines.push("");
    for (const cluster of report.clusterWeaknesses) {
      lines.push(`- ${cluster.cluster}: ${cluster.concepts.join(", ")} (risk ${cluster.averageForgettingRisk.toFixed(2)}, priority ${cluster.averageReviewPriority.toFixed(2)})`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

