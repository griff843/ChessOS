/**
 * Types for M12C strategic intelligence layer.
 *
 * Pattern intelligence, readiness forecasting, composition rationale,
 * and transparency reporting. All pure, deterministic, artifact-based.
 */

import type {
  ObjectiveInterventionType,
  ObjectiveLifecycleDecision,
  ObjectivePhase,
  ObjectiveProgressVerdict,
  ObjectiveRecommendationStrength,
  ObjectiveStatus,
  ObjectiveSuccessSignal,
  TrainingObjective,
} from "../objectives/types";

// Pattern Intelligence

/** Category x difficulty cross-tabulation cell. */
export interface CrossCell {
  category: string;
  difficulty: string;
  seenCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  missRate: number;
  avgEvalLossCp: number | null;
}

/** Severity classification for a recurrence entry. */
export type RecurrenceSeverity = "critical" | "moderate" | "minor";

/** Breakdown of factors composing a recurrence score. */
export interface RecurrenceFactors {
  persistenceFactor: number;
  directionFactor: number;
  reviewBurdenFactor: number;
  frequencyFactor: number;
}

/** Recurrence score for a single lesson category. */
export interface RecurrenceEntry {
  category: string;
  recurrenceScore: number;
  factors: RecurrenceFactors;
  severity: RecurrenceSeverity;
  isRecurring: boolean;
}

/** Per-category eval loss trend. */
export interface StrategicEvalLossTrend {
  category: string;
  recentAvgEvalLossCp: number | null;
  lifetimeAvgEvalLossCp: number | null;
  direction: "improving" | "worsening" | "stable" | "insufficient_data";
}

/** Complete pattern intelligence artifact. */
export interface PatternIntelligence {
  generatedAt: string;
  crossTable: CrossCell[];
  recurrenceEntries: RecurrenceEntry[];
  evalLossTrends: StrategicEvalLossTrend[];
  recurringWeaknesses: string[];
  topVulnerability: {
    category: string;
    difficulty: string;
    missRate: number;
  } | null;
}

// Readiness Forecast

export type ReadinessState = "ready_to_expand" | "hold_steady" | "repair_mode";

/** A single measured signal contributing to readiness determination. */
export interface ReadinessSignal {
  name: string;
  value: number;
  threshold: number;
  passed: boolean;
}

/** Readiness forecast artifact. */
export interface ReadinessForecast {
  generatedAt: string;
  state: ReadinessState;
  signals: ReadinessSignal[];
  reason: string;
}

// Composition Rationale

/** Why a particular exercise was included in the session. */
export interface CompositionSlot {
  exerciseId: string;
  source: "review" | "weakness" | "fresh" | "stretch";
  reason: string;
}

/** Per-session composition transparency artifact. */
export interface CompositionRationale {
  generatedAt: string;
  sessionId: string;
  readinessState: ReadinessState;
  policyReason: string;
  difficultyMix: { easy: number; medium: number; hard: number };
  slots: CompositionSlot[];
  topRecurringWeaknesses: string[];
  reviewBurden: {
    overdueCount: number;
    dueSoonCount: number;
    unstableCount: number;
  };
  trainingObjective?: TrainingObjective;
  objectiveReason?: string;
  objectivePhase?: ObjectivePhase;
  successSignals?: ObjectiveSuccessSignal[];
  objectiveExerciseMixRationale?: string;
  objectiveStatus?: ObjectiveStatus;
  objectiveProgressVerdict?: ObjectiveProgressVerdict;
  objectiveDecision?: ObjectiveLifecycleDecision;
  objectiveDecisionReason?: string;
  objectiveInterventionType?: ObjectiveInterventionType;
  objectiveRecommendationStrength?: ObjectiveRecommendationStrength;
  objectiveNextSessionAdjustmentSummary?: string;
  explanation: string;
}

// Intelligence Report

/** Top-level transparency artifact summarizing all engine decisions. */
export interface IntelligenceReport {
  generatedAt: string;
  readiness: ReadinessForecast;
  patternSummary: {
    recurringCount: number;
    topWeakness: string | null;
    topVulnerability: {
      category: string;
      difficulty: string;
      missRate: number;
    } | null;
  };
  reviewStrategy: string;
  difficultyStrategy: string;
  recommendations: string[];
}



