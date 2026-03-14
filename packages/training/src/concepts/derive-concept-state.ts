import type { LearningModel } from "../learning/types";
import type { ConceptGraph, ConceptStateEntry, ConceptStateReport } from "./types";

function round(value: number): number {
  return Number(value.toFixed(4));
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function buildExplanation(entry: Pick<ConceptStateEntry, "conceptName" | "status" | "prerequisiteGaps" | "adjacentWeaknesses" | "trendDirection" | "reviewPriority">): string {
  const parts: string[] = [];
  if (entry.prerequisiteGaps.length > 0) {
    parts.push(`Prerequisite gaps in ${entry.prerequisiteGaps.join(", ")} are limiting ${entry.conceptName.toLowerCase()}.`);
  }
  if (entry.adjacentWeaknesses.length > 0) {
    parts.push(`Related pressure is coming from ${entry.adjacentWeaknesses.join(", ")}.`);
  }
  if (parts.length === 0) {
    parts.push(`${entry.conceptName} is currently ${entry.status.replace(/_/g, " ")}.`);
  }
  parts.push(`Trend: ${entry.trendDirection.replace(/_/g, " ")}; review priority ${entry.reviewPriority.toFixed(2)}.`);
  return parts.join(" ");
}

export function deriveConceptState(graph: ConceptGraph, learningModel: LearningModel): ConceptStateReport {
  const byLearning = new Map(learningModel.concepts.map((entry) => [entry.conceptKey, entry]));

  const entries: ConceptStateEntry[] = graph.concepts
    .map((concept) => {
      const learning = byLearning.get(concept.conceptKey);
      const prerequisiteGaps = concept.prerequisiteConcepts.filter((key) => {
        const prereq = byLearning.get(key);
        return prereq ? prereq.masteryScore < 0.55 || prereq.forgettingRisk > 0.6 : true;
      });
      const adjacentWeaknesses = concept.relatedConcepts.filter((key) => {
        const related = byLearning.get(key);
        return related ? related.forgettingRisk > 0.55 || related.status === "unstable" || related.status === "at_risk" : false;
      });
      const reinforcementPath = [
        ...concept.prerequisiteConcepts.filter((key) => !prerequisiteGaps.includes(key)).slice(0, 2),
        concept.conceptKey,
        ...concept.childConcepts.slice(0, 2),
      ];

      const masteryScore = learning?.masteryScore ?? 0;
      const retentionScore = learning?.retentionScore ?? 0;
      const forgettingRisk = learning?.forgettingRisk ?? 1;
      const stabilityScore = learning?.stabilityScore ?? 0;
      const successCount = learning?.successCount ?? 0;
      const failureCount = learning?.failureCount ?? 0;
      const exposureCount = successCount + failureCount;
      const recentPerformance = exposureCount > 0 ? round(successCount / exposureCount) : 0;
      const trendDirection = learning?.trend ?? "insufficient_data";
      const recurrencePressure = round(clamp((failureCount / Math.max(exposureCount, 1)) * 0.55 + (forgettingRisk * 0.45), 0, 1));
      const reviewPriority = round(
        clamp(
          forgettingRisk * 0.34 +
            (1 - stabilityScore) * 0.2 +
            (1 - masteryScore) * 0.16 +
            recurrencePressure * 0.18 +
            Math.min(prerequisiteGaps.length, 3) * 0.06 +
            Math.min(adjacentWeaknesses.length, 3) * 0.03,
          0,
          1.5
        )
      );

      const status: ConceptStateEntry["status"] =
        exposureCount === 0
          ? "unseen"
          : forgettingRisk > 0.7
            ? "at_risk"
            : prerequisiteGaps.length > 0 || stabilityScore < 0.45
              ? "unstable"
              : masteryScore >= 0.78
                ? "mastered"
                : "stable";

      const entry: ConceptStateEntry = {
        conceptKey: concept.conceptKey,
        conceptName: concept.conceptName,
        conceptCategory: concept.conceptCategory,
        masteryScore: round(masteryScore),
        retentionScore: round(retentionScore),
        forgettingRisk: round(forgettingRisk),
        stabilityScore: round(stabilityScore),
        exposureCount,
        successCount,
        failureCount,
        recentPerformance,
        trendDirection,
        recurrencePressure,
        reviewPriority,
        prerequisiteGaps,
        adjacentWeaknesses,
        reinforcementPath,
        status,
        explanation: "",
      };

      entry.explanation = buildExplanation(entry);
      return entry;
    })
    .sort((a, b) => b.reviewPriority - a.reviewPriority || b.forgettingRisk - a.forgettingRisk || a.conceptKey.localeCompare(b.conceptKey));

  const prerequisiteHotspots = entries
    .filter((entry) => entry.prerequisiteGaps.length > 0)
    .slice(0, 8)
    .map((entry) => ({ conceptKey: entry.conceptKey, missingPrerequisites: entry.prerequisiteGaps }));

  const clusterMap = new Map<string, ConceptStateEntry[]>();
  for (const entry of entries) {
    const key = entry.conceptCategory;
    const group = clusterMap.get(key) ?? [];
    group.push(entry);
    clusterMap.set(key, group);
  }

  const clusterWeaknesses = [...clusterMap.entries()]
    .map(([cluster, group]) => ({
      cluster,
      concepts: group
        .filter((entry) => entry.status === "at_risk" || entry.status === "unstable")
        .map((entry) => entry.conceptKey),
      averageForgettingRisk: round(group.reduce((sum, entry) => sum + entry.forgettingRisk, 0) / Math.max(group.length, 1)),
      averageReviewPriority: round(group.reduce((sum, entry) => sum + entry.reviewPriority, 0) / Math.max(group.length, 1)),
    }))
    .filter((entry) => entry.concepts.length > 0)
    .sort((a, b) => b.averageReviewPriority - a.averageReviewPriority || b.averageForgettingRisk - a.averageForgettingRisk);

  const topUnstableConcepts = entries
    .filter((entry) => entry.status === "unstable" || entry.status === "at_risk")
    .slice(0, 6)
    .map((entry) => ({
      conceptKey: entry.conceptKey,
      conceptName: entry.conceptName,
      conceptCategory: entry.conceptCategory,
      reviewPriority: entry.reviewPriority,
      recurrencePressure: entry.recurrencePressure,
      prerequisiteGaps: entry.prerequisiteGaps,
    }));

  const strongestConcepts = [...entries]
    .filter((entry) => entry.status === "mastered" || (entry.masteryScore >= 0.72 && entry.stabilityScore >= 0.68))
    .sort((a, b) => b.masteryScore - a.masteryScore || b.stabilityScore - a.stabilityScore || a.conceptKey.localeCompare(b.conceptKey))
    .slice(0, 6)
    .map((entry) => ({
      conceptKey: entry.conceptKey,
      conceptName: entry.conceptName,
      conceptCategory: entry.conceptCategory,
      masteryScore: entry.masteryScore,
      stabilityScore: entry.stabilityScore,
    }));

  const recommendedFocuses = entries
    .filter((entry) => entry.status !== "mastered")
    .slice(0, 6)
    .map((entry) => ({
      conceptKey: entry.conceptKey,
      conceptName: entry.conceptName,
      explanation: entry.explanation,
      reviewPriority: entry.reviewPriority,
      prerequisiteGaps: entry.prerequisiteGaps,
      adjacentWeaknesses: entry.adjacentWeaknesses,
      reinforcementPath: entry.reinforcementPath,
    }));

  return {
    generatedAt: learningModel.generatedAt,
    entries,
    prerequisiteHotspots,
    clusterWeaknesses,
    topUnstableConcepts,
    strongestConcepts,
    recommendedFocuses,
  };
}

