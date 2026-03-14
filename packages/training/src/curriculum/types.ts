/**
 * Types for M9B personalized curriculum planner.
 *
 * All types are read-only snapshots - no mutation to canonical state.
 */

import type { LessonCategory } from "../exercises/types.js";

export type CurriculumTheme =
  | "blunder_cleanup"
  | "tactical_repair"
  | "consolidation"
  | "instability_reduction"
  | "difficulty_expansion";

export interface DifficultyMix {
  easy: number;
  medium: number;
  hard: number;
}

export interface ExerciseQuota {
  reviewSlots: number;
  freshSlots: number;
  total: number;
  reason: string;
}

export interface SessionRoadmap {
  sessionIndex: number;
  theme: CurriculumTheme;
  focusCategory: LessonCategory;
  secondaryCategory: LessonCategory | null;
  difficultyMix: DifficultyMix;
  exerciseQuota: ExerciseQuota;
  rationale: string;
}

export interface GateCriterion {
  name: string;
  description: string;
  currentValue: number;
  threshold: number;
  passed: boolean;
}

export type GateType = "accuracy" | "mastery" | "review_load" | "trend" | "eval_loss";

export interface ProgressionGate {
  gateName: string;
  gateType: GateType;
  criteria: GateCriterion[];
  allPassed: boolean;
  recommendation: string;
}

export interface ProgressionGates {
  generatedAt: string;
  gates: ProgressionGate[];
  overallReadiness: boolean;
  readinessSummary: string;
}

export interface ThemeAssignment {
  sessionIndex: number;
  theme: CurriculumTheme;
  reason: string;
  triggerMetric: string;
  triggerValue: number;
}

export interface ConceptSequenceEntry {
  sessionIndex: number;
  conceptKey: string;
  conceptName: string;
  rationale: string;
  prerequisiteConcepts: string[];
}

export interface CurriculumPlan {
  generatedAt: string;
  sessionCount: number;
  themeAssignments: ThemeAssignment[];
  sessions: SessionRoadmap[];
  progressionGates: ProgressionGates;
  conceptSequence: ConceptSequenceEntry[];
  overallRationale: string;
}

export const CURRICULUM_CONFIG = {
  defaultSessionCount: 5,
  defaultSessionSize: 10,
  difficultyMixByTheme: {
    blunder_cleanup: { easy: 5, medium: 3, hard: 2 },
    tactical_repair: { easy: 3, medium: 4, hard: 3 },
    consolidation: { easy: 2, medium: 5, hard: 3 },
    instability_reduction: { easy: 4, medium: 4, hard: 2 },
    difficulty_expansion: { easy: 2, medium: 3, hard: 5 },
  } satisfies Record<CurriculumTheme, DifficultyMix>,
  reviewSlotsByPressure: {
    high: 5,
    normal: 3,
    low: 1,
    none: 0,
  },
  pressureThresholds: {
    high: 10,
    normal: 3,
    low: 1,
  },
  themeThresholds: {
    blunderCleanupMinBlunders: 3,
    blunderCleanupOnCritical: true,
    tacticalRepairCategories: ["tactical_miss", "calculation_error"] as LessonCategory[],
    instabilityRatioThreshold: 0.25,
    consolidationMinImproving: 1,
    expansionMinAccuracy: 0.75,
    expansionMaxUnstableRatio: 0.1,
  },
  gateThresholds: {
    accuracyMinRecent: 0.75,
    masteryMinRatio: 0.5,
    reviewMaxOverdue: 5,
    trendMaxWorsening: 0,
    evalLossMaxAvg: 150,
  },
} as const;



export interface CurriculumPlan {
  openingFocuses: Array<{
    openingFamily: string;
    openingName: string;
    theme: string;
    count: number;
  }>;
}

export interface CurriculumPlan {
  repertoireFocuses: Array<{
    repertoireKey: string;
    repertoireName: string;
    lineName: string;
    recommendedAction: string;
    reviewPriority: number;
  }>;
}

export interface CurriculumPlan {
  repertoireTransferFocuses: Array<{
    repertoireKey: string;
    lineName: string;
    transferFailureType: string;
    recommendedReviewLine: string;
    urgency: number;
  }>;
}

export interface CurriculumPlan {
  repertoireDrillFocuses: Array<{
    lineId: string;
    lineName: string;
    urgency: number;
    nextRecommendedReviewAt: string | null;
    recommendedAction: string;
  }>;
}

export interface CurriculumPlan {
  repertoireRepairFocuses: Array<{
    sourceGameId: string;
    lineId: string;
    lineName: string;
    repairType: string;
    urgency: number;
    scheduledDrillReason: string;
  }>;
  repertoireRepairOutcomeFocuses: Array<{
    repairId: string;
    lineId: string;
    lineName: string;
    outcomeVerdict: string;
    urgency: number;
    nextAction: string;
  }>;
}

