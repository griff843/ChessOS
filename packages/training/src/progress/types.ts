/**
 * Types for M6B progress tracking and spaced repetition scaffold.
 *
 * Tracks per-exercise study state and session history to support
 * adaptive study session generation.
 */

import type { LessonCategory, DifficultyEstimate } from "../exercises/types";
import type { GradingTier } from "../grading/eval-loss-bands.js";
import type { MasteryState } from "../mastery/derive-mastery-state.js";
import type {
  ObjectiveEscalationStrength,
  ObjectiveEscalationVerdict,
  ObjectiveInterventionType,
  ObjectiveLifecycleDecision,
  ObjectivePhase,
  ObjectiveProgressVerdict,
  ObjectiveRecommendationStrength,
  ObjectiveStatus,
  TrainingObjective,
} from "../objectives/types";

// Exercise Status

export type ExerciseStatus =
  | "unseen"
  | "seen"
  | "correct"
  | "incorrect"
  | "due_for_review";

// Exercise Progress

export interface ExerciseProgress {
  exerciseId: string;
  gameId: string;
  positionId: string;
  lessonCategory: LessonCategory;
  difficultyEstimate: DifficultyEstimate;
  status: ExerciseStatus;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  timesSeen: number;
  timesCorrect: number;
  timesIncorrect: number;
  lastResult: "correct" | "incorrect" | null;
  nextReviewAt: string | null;
  intervalDays: number;
  lastGradingTier: GradingTier | null;
  rollingQualityScore: number;
  averageEvalLossCp: number | null;
  recentEvalLossCp: number | null;
  reviewUrgency: number;
  masteryState: MasteryState;
}

// Progress Store

export interface ProgressStore {
  totalExercises: number;
  exercises: Record<string, ExerciseProgress>;
  lastUpdatedAt: string;
}

// Session History

export interface SessionHistoryRecord {
  sessionId: string;
  createdAt: string;
  completedAt: string | null;
  exerciseIds: string[];
  difficultyDistribution: Record<DifficultyEstimate, number>;
  categoryDistribution: Record<string, number>;
  results: SessionExerciseResult[] | null;
  trainingObjective?: TrainingObjective;
  objectivePhase?: ObjectivePhase;
  objectiveStatus?: ObjectiveStatus;
  objectiveProgressVerdict?: ObjectiveProgressVerdict;
  objectiveDecision?: ObjectiveLifecycleDecision;
  objectiveEscalationVerdict?: ObjectiveEscalationVerdict;
  objectiveEscalationReason?: string;
  objectiveEscalationStrength?: ObjectiveEscalationStrength;
  objectiveRecommendedAction?: ObjectiveEscalationVerdict;
  objectiveRecommendedPhaseChange?: ObjectivePhase | null;
  objectiveRecommendedObjective?: TrainingObjective | null;
  objectiveEscalationSummary?: string;
  objectivePortfolioStatus?: import("../objectives/types").ObjectivePortfolioStatus;
  objectivePortfolioPriority?: number;
  objectivePortfolioRotationWeight?: number;
  objectiveTrainingShare?: number;
  objectivePortfolioRank?: number;
  objectiveStartedAt?: string;
  objectiveInterventionType?: ObjectiveInterventionType;
  objectiveRecommendationStrength?: ObjectiveRecommendationStrength;
  objectiveInterventionStartedAt?: string;
  objectiveSignalSnapshot?: import("../objectives/types").InterventionSignalSnapshotSeed;
  interventionEpisodeId?: string;
  priorInterventionOutcome?: import("../objectives/types").InterventionEffectivenessOutcome;
  interventionRecommendedAction?: import("../objectives/types").InterventionEffectivenessAction;
  interventionRecommendedType?: import("../objectives/types").ObjectiveInterventionType | null;
  interventionRepeatedPatternFlag?: boolean;
  interventionCompareSummary?: string;
}

export interface SessionExerciseResult {
  exerciseId: string;
  result: "correct" | "incorrect";
}

export interface GradedExerciseResult {
  exerciseId: string;
  result: "correct" | "incorrect";
  gradingTier: GradingTier;
  evalLossCp: number | null;
}

// Session Result Input

export interface SessionResultInput {
  sessionId: string;
  completedAt?: string;
  results: SessionExerciseResult[];
}









