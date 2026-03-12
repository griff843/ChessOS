import type { ConceptGraph, ConceptStateEntry, ConceptStateReport } from "./types";
import type { LearningModel } from "../learning/types";

function round(value: number): number {
  return Number(value.toFixed(4));
}

export function deriveConceptState(graph: ConceptGraph, learningModel: LearningModel): ConceptStateReport {
  const byLearning = new Map(learningModel.concepts.map((entry) => [entry.conceptKey, entry]));

  const entries: ConceptStateEntry[] = graph.concepts.map((concept) => {
    const learning = byLearning.get(concept.conceptKey);
    const prerequisiteGaps = concept.prerequisiteConcepts.filter((key) => {
      const prereq = byLearning.get(key);
      return prereq ? prereq.masteryScore < 0.55 || prereq.forgettingRisk > 0.6 : true;
    });
    const adjacentWeaknesses = concept.relatedConcepts.filter((key) => {
      const related = byLearning.get(key);
      return related ? related.forgettingRisk > 0.55 || related.status === "unstable" : false;
    });
    const reinforcementPath = [
      ...concept.prerequisiteConcepts.filter((key) => !prerequisiteGaps.includes(key)),
      concept.conceptKey,
      ...concept.childConcepts.slice(0, 2),
    ];

    const masteryScore = learning?.masteryScore ?? 0;
    const retentionScore = learning?.retentionScore ?? 0;
    const forgettingRisk = learning?.forgettingRisk ?? 1;
    const stabilityScore = learning?.stabilityScore ?? 0;
    const exposureCount = (learning?.successCount ?? 0) + (learning?.failureCount ?? 0);
    const successCount = learning?.successCount ?? 0;
    const failureCount = learning?.failureCount ?? 0;
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

    return {
      conceptKey: concept.conceptKey,
      conceptName: concept.conceptName,
      conceptCategory: concept.conceptCategory,
      masteryScore,
      retentionScore,
      forgettingRisk,
      stabilityScore,
      exposureCount,
      successCount,
      failureCount,
      prerequisiteGaps,
      adjacentWeaknesses,
      reinforcementPath,
      status,
    };
  }).sort((a, b) => b.forgettingRisk - a.forgettingRisk || a.conceptKey.localeCompare(b.conceptKey));

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
      concepts: group.filter((entry) => entry.status === "at_risk" || entry.status === "unstable").map((entry) => entry.conceptKey),
      averageForgettingRisk: round(group.reduce((sum, entry) => sum + entry.forgettingRisk, 0) / Math.max(group.length, 1)),
    }))
    .filter((entry) => entry.concepts.length > 0)
    .sort((a, b) => b.averageForgettingRisk - a.averageForgettingRisk);

  return {
    generatedAt: learningModel.generatedAt,
    entries,
    prerequisiteHotspots,
    clusterWeaknesses,
  };
}
