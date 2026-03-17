import type { LessonCategory, ReasonCode, TrainingExercise } from "../exercises/types";
import type { LearningConceptState } from "../learning/types";
import type { OpeningMistakeTheme } from "../openings/types";

export type ConceptCategory = "tactical" | "positional" | "endgame" | "opening" | "meta";
export type DifficultyBand = "foundation" | "core" | "advanced";
export type ConceptSourceTheme =
  | "hanging_piece"
  | "fork"
  | "pin"
  | "skewer"
  | "discovered_attack"
  | "overload"
  | "deflection"
  | "back_rank"
  | "king_attack"
  | "endgame_conversion"
  | "opening_development"
  | "king_safety"
  | "center_control"
  | "pawn_structure"
  | "initiative"
  | "piece_activity"
  | "tactical_pattern_recognition"
  | "calculation_stability"
  | "visualization_depth";

export interface ConceptNode {
  conceptKey: string;
  conceptName: string;
  conceptCategory: ConceptCategory;
  description: string;
  parentConcepts: string[];
  childConcepts: string[];
  relatedConcepts: string[];
  prerequisiteConcepts: string[];
  difficultyBand: DifficultyBand;
  trainingTags: string[];
  sourceThemes: ConceptSourceTheme[];
  sourceLessonCategories: LessonCategory[];
  sourceReasonCodes: ReasonCode[];
  sourceOpeningThemes: OpeningMistakeTheme[];
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
  prerequisiteConcepts: string[];
  broaderCluster: ConceptCategory;
  source: "lesson_category" | "reason_code" | "opening_family" | "opening_theme" | "source_theme";
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
  recentPerformance: number;
  trendDirection: LearningConceptState["trend"];
  recurrencePressure: number;
  reviewPriority: number;
  prerequisiteGaps: string[];
  adjacentWeaknesses: string[];
  reinforcementPath: string[];
  status: "mastered" | "stable" | "at_risk" | "unstable" | "unseen";
  explanation: string;
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
    averageReviewPriority: number;
  }>;
  topUnstableConcepts: Array<{
    conceptKey: string;
    conceptName: string;
    conceptCategory: ConceptCategory;
    reviewPriority: number;
    recurrencePressure: number;
    prerequisiteGaps: string[];
  }>;
  strongestConcepts: Array<{
    conceptKey: string;
    conceptName: string;
    conceptCategory: ConceptCategory;
    masteryScore: number;
    stabilityScore: number;
  }>;
  recommendedFocuses: Array<{
    conceptKey: string;
    conceptName: string;
    explanation: string;
    reviewPriority: number;
    prerequisiteGaps: string[];
    adjacentWeaknesses: string[];
    reinforcementPath: string[];
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
    if (concept.sourceLessonCategories.includes(exercise.explanation.lessonCategory)) {
      matches.push(concept.conceptKey);
      continue;
    }
    if (exercise.explanation.reasonCodes.some((code) => concept.sourceReasonCodes.includes(code))) {
      matches.push(concept.conceptKey);
      continue;
    }
    if (openingFamily && concept.openingFamilies?.includes(openingFamily)) {
      matches.push(concept.conceptKey);
    }
  }
  return uniqueConceptKeys(matches);
}

