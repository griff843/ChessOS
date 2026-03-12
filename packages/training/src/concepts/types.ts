import type { LessonCategory, ReasonCode, TrainingExercise } from "../exercises/types";

export type ConceptCategory = "tactical" | "positional" | "endgame" | "opening" | "meta";
export type DifficultyBand = "foundation" | "core" | "advanced";

export interface ConceptNode {
  conceptKey: string;
  conceptName: string;
  conceptCategory: ConceptCategory;
  parentConcepts: string[];
  childConcepts: string[];
  relatedConcepts: string[];
  prerequisiteConcepts: string[];
  difficultyBand: DifficultyBand;
  trainingTags: string[];
  lessonCategories: LessonCategory[];
  reasonCodes: ReasonCode[];
  openingFamilies?: string[];
}

export interface ConceptGraph {
  generatedAt: string;
  concepts: ConceptNode[];
  conceptIndex: Record<string, ConceptNode>;
  categorySummaries: Array<{
    category: ConceptCategory;
    conceptCount: number;
    concepts: string[];
  }>;
}

export interface ConceptMapping {
  primaryConcept: string;
  relatedConcepts: string[];
  source: "lesson_category" | "reason_code" | "opening_family";
}

export interface ConceptStateEntry {
  conceptKey: string;
  conceptName: string;
  conceptCategory: ConceptCategory;
  masteryScore: number;
  retentionScore: number;
  forgettingRisk: number;
  stabilityScore: number;
  exposureCount: number;
  successCount: number;
  failureCount: number;
  prerequisiteGaps: string[];
  adjacentWeaknesses: string[];
  reinforcementPath: string[];
  status: "mastered" | "stable" | "at_risk" | "unstable" | "unseen";
}

export interface ConceptStateReport {
  generatedAt: string;
  entries: ConceptStateEntry[];
  prerequisiteHotspots: Array<{
    conceptKey: string;
    missingPrerequisites: string[];
  }>;
  clusterWeaknesses: Array<{
    cluster: string;
    concepts: string[];
    averageForgettingRisk: number;
  }>;
}

export interface OpeningConceptSignal {
  openingFamily: string;
  concepts: string[];
}

export function uniqueConceptKeys(keys: string[]): string[] {
  return [...new Set(keys.filter(Boolean))];
}

export function mapExerciseToConcepts(
  exercise: Pick<TrainingExercise, "explanation">,
  graph: ConceptGraph,
  openingFamily?: string | null
): string[] {
  const matches: string[] = [];
  for (const concept of graph.concepts) {
    if (concept.lessonCategories.includes(exercise.explanation.lessonCategory)) {
      matches.push(concept.conceptKey);
      continue;
    }
    if (exercise.explanation.reasonCodes.some((code) => concept.reasonCodes.includes(code))) {
      matches.push(concept.conceptKey);
      continue;
    }
    if (openingFamily && concept.openingFamilies?.includes(openingFamily)) {
      matches.push(concept.conceptKey);
    }
  }
  return uniqueConceptKeys(matches);
}
