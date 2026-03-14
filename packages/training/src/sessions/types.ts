/**
 * Types for the M6A study session generator.
 */

import type { ChessColor } from "@chess-os/chess-core";
import type { GamePhase } from "@chess-os/classifier";
import type { ExerciseType, ExerciseTypeMix } from "../cognitive/types";
import type { LessonCategory, DifficultyEstimate } from "../exercises/types";
import type { ExercisePerspective, SessionPerspective } from "../perspective/player-perspective";
import type {
  ObjectiveEscalationStrength,
  ObjectiveEscalationVerdict,
  ObjectiveInterventionType,
  ObjectiveLifecycleDecision,
  ObjectivePhase,
  ObjectivePortfolioStatus,
  ObjectiveProgressVerdict,
  ObjectiveRecommendationStrength,
  ObjectiveStatus,
  ObjectiveSuccessSignal,
  TrainingObjective,
} from "../objectives/types";

export interface DifficultyCalibration {
  totalExercises: number;
  easyUpperBound: number;
  hardLowerBound: number;
  distribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  percentiles: {
    p10: number;
    p20: number;
    p30: number;
    p40: number;
    p50: number;
    p60: number;
    p70: number;
    p80: number;
    p90: number;
  };
  calibratedAt: string;
}

export interface SessionExercise {
  exerciseId: string;
  gameId: string;
  ply: number;
  fen: string;
  sideToMove: ChessColor;
  heroColor: ChessColor | null;
  perspective: ExercisePerspective;
  phase: GamePhase;
  playedMoveSan: string;
  bestMoveSan: string | undefined;
  lessonCategory: LessonCategory;
  difficultyEstimate: DifficultyEstimate;
  difficultyScore: number;
  predictedRisk: number;
  targetPriority: number;
  exerciseType?: ExerciseType;
}

export interface StudySession {
  sessionId: string;
  createdAt: string;
  exerciseCount: number;
  exercises: SessionExercise[];
  metadata: {
    difficultyDistribution: Record<DifficultyEstimate, number>;
    categoryDistribution: Record<string, number>;
    sourceGames: string[];
    selectedPerspective?: SessionPerspective;
    exerciseTypeMix?: Record<string, number>;
    trainingObjective?: TrainingObjective;
    objectiveReason?: string;
    objectivePhase?: ObjectivePhase;
    successSignals?: ObjectiveSuccessSignal[];
    objectiveExerciseMixRationale?: string;
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
    objectivePortfolioStatus?: ObjectivePortfolioStatus;
    objectivePortfolioPriority?: number;
    objectivePortfolioRotationWeight?: number;
    objectiveTrainingShare?: number;
    objectivePortfolioRank?: number;
    objectiveDecisionReason?: string;
    objectiveStartedAt?: string;
    sessionsOnObjective?: number;
    objectiveInterventionType?: ObjectiveInterventionType;
    objectiveInterventionReason?: string;
    objectiveRecommendationStrength?: ObjectiveRecommendationStrength;
    objectiveNextSessionAdjustmentSummary?: string;
    objectiveInterventionStartedAt?: string;
    objectiveSignalSnapshot?: import("../objectives/types").InterventionSignalSnapshotSeed;
    interventionEpisodeId?: string;
    priorInterventionOutcome?: import("../objectives/types").InterventionEffectivenessOutcome;
    interventionRecommendedAction?: import("../objectives/types").InterventionEffectivenessAction;
    interventionRecommendedType?: import("../objectives/types").ObjectiveInterventionType | null;
    interventionRepeatedPatternFlag?: boolean;
    interventionCompareSummary?: string;
  };
}

export interface SessionConfig {
  sessionSize: number;
  maxCategoryPercent: number;
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  exerciseTypeMix?: ExerciseTypeMix;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  sessionSize: 10,
  maxCategoryPercent: 0.4,
  difficultyDistribution: {
    easy: 3,
    medium: 4,
    hard: 3,
  },
};











