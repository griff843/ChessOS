/**
 * Types for M9A coach layer / deterministic study guidance.
 *
 * All types are read-only snapshots - no mutation to canonical state.
 */

import type { LessonCategory, DifficultyEstimate } from "../exercises/types.js";
import type { TrendDirection } from "../trends/types.js";
import type { ConceptCategory } from "../concepts/types.js";

export type PatternSeverity = "critical" | "moderate" | "minor";

export interface MistakePatternEntry {
  category: LessonCategory;
  severity: PatternSeverity;
  lifetimeMissRate: number;
  recentMissRate: number | null;
  trendDirection: TrendDirection;
  avgEvalLossCp: number | null;
  exerciseCount: number;
  incorrectCount: number;
  overdueCount: number;
  unstableCount: number;
  description: string;
}

export interface DifficultyPattern {
  difficulty: DifficultyEstimate;
  lifetimeMissRate: number;
  recentMissRate: number | null;
  trendDirection: TrendDirection;
  exerciseCount: number;
  incorrectCount: number;
}

export interface BlunderProfile {
  totalBlunders: number;
  totalMistakes: number;
  worstCategories: string[];
  avgEvalLossCp: number | null;
}

export interface MistakePatterns {
  generatedAt: string;
  categoryPatterns: MistakePatternEntry[];
  difficultyPatterns: DifficultyPattern[];
  blunderProfile: BlunderProfile;
  recurringWeaknesses: string[];
}

export interface StudyPlanFocus {
  category: LessonCategory;
  difficulty: DifficultyEstimate | null;
  reason: string;
  exerciseCount: number;
}

export interface StudyPlanReviewFocus {
  urgentCount: number;
  topCategories: string[];
  reason: string;
}

export interface ExerciseComposition {
  source: "review" | "weakness" | "new";
  count: number;
  description: string;
}

export interface ConceptFocusSummary {
  conceptKey: string;
  conceptName: string;
  conceptCategory: ConceptCategory;
  reviewPriority: number;
  explanation: string;
  prerequisiteGaps: string[];
  reinforcementPath: string[];
}

export interface StudyPlan {
  generatedAt: string;
  primaryFocus: StudyPlanFocus;
  secondaryFocus: StudyPlanFocus | null;
  reviewFocus: StudyPlanReviewFocus | null;
  targetDifficultyMix: { easy: number; medium: number; hard: number };
  suggestedSessionSize: number;
  exerciseComposition: ExerciseComposition[];
  conceptFocuses: ConceptFocusSummary[];
  rationale: string;
}

export type InsightType = "strength" | "weakness" | "trend" | "review" | "milestone";

export interface CoachingInsight {
  type: InsightType;
  message: string;
  priority: number;
}

export interface CoachingConceptSnapshot {
  topUnstableConcepts: Array<{
    conceptKey: string;
    conceptName: string;
    reviewPriority: number;
  }>;
  strongestConcepts: Array<{
    conceptKey: string;
    conceptName: string;
    masteryScore: number;
  }>;
  prerequisiteHotspots: Array<{
    conceptKey: string;
    missingPrerequisites: string[];
  }>;
}

export interface CoachingSummary {
  generatedAt: string;
  headline: string;
  insights: CoachingInsight[];
  progressStatement: string;
  nextStepStatement: string;
  conceptSnapshot: CoachingConceptSnapshot | null;
}



export interface StudyPlan {
  openingFocuses: string[];
}

export interface CoachingSummary {
  openingSnapshot: {
    topFamilies: Array<{ openingFamily: string; openingName: string; mistakes: number }>;
    recurringMistakes: Array<{ theme: string; count: number }>;
  } | null;
}

export interface StudyPlan {
  repertoireFocuses: Array<{
    repertoireKey: string;
    lineId: string;
    lineName: string;
    recommendedAction: string;
    reviewPriority: number;
  }>;
}

export interface CoachingSummary {
  repertoireSnapshot: {
    currentRepertoireHealth: Array<{ repertoireKey: string; repertoireName: string; reviewPriority: number }>;
    topLinesToReview: Array<{ repertoireName: string; lineName: string; reviewPriority: number }>;
  } | null;
}

export interface StudyPlan {
  repertoireTransferFocuses: Array<{
    repertoireKey: string;
    lineId: string;
    lineName: string;
    transferFailureType: string;
    recommendedReviewLine: string;
    urgency: number;
  }>;
}

export interface StudyPlan {
  repertoireDrillFocuses: Array<{
    lineId: string;
    lineName: string;
    urgency: number;
    nextRecommendedReviewAt: string | null;
    recommendedAction: string;
  }>;
}

export interface CoachingSummary {
  repertoireTransferSnapshot: {
    fragileLines: Array<{
      repertoireName: string;
      lineName: string;
      urgency: number;
      transferFailureType: string;
    }>;
    topActions: Array<{
      lineName: string;
      urgency: number;
      action: string;
    }>;
  } | null;
}

export interface CoachingSummary {
  repertoireDrillSnapshot: {
    fragileLines: Array<{
      lineName: string;
      forgettingRisk: number;
      recallConfidence: number;
    }>;
    nextLinesToReview: Array<{
      lineName: string;
      urgency: number;
      nextRecommendedReviewAt: string | null;
    }>;
  } | null;
}

export interface StudyPlan {
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

export interface CoachingSummary {
  repertoireRepairSnapshot: {
    urgentGames: Array<{
      sourceGameId: string;
      lineName: string;
      repairType: string;
      urgency: number;
    }>;
    topRepairLines: Array<{
      lineName: string;
      urgency: number;
      scheduledDrillReason: string;
    }>;
  } | null;
  repertoireRepairOutcomeSnapshot: {
    repairsThatWorked: Array<{
      lineName: string;
      outcomeVerdict: string;
      outcomeReason: string;
    }>;
    repairsStillFragile: Array<{
      lineName: string;
      outcomeVerdict: string;
      nextAction: string;
    }>;
  } | null;
}

// ── Coach Overview (M011) ─────────────────────────────────────────────

import type { RepairTarget, CoachingPersistenceState } from "../repair/types.js";

export type CoachOverviewReadiness =
  | "repair"
  | "consolidate"
  | "expand"
  | "insufficient_data";

export type CoachNextActionType =
  | "drill_opening"
  | "start_session"
  | "monitor";

export interface CoachNextAction {
  type: CoachNextActionType;
  label: string;
  href: string;
}

export interface CoachOverviewFocus {
  target: RepairTarget;
  persistenceState: CoachingPersistenceState;
  gamesAffected: number;
}

export interface CoachOverviewOpening {
  lineId: string;
  lineName: string;
  urgency: string;
}

export interface CoachOverview {
  readiness: CoachOverviewReadiness;
  primaryFocus: CoachOverviewFocus | null;
  openingPriority: CoachOverviewOpening | null;
  improvingAreas: string[];
  nextAction: CoachNextAction;
  summary: string | null;
}
