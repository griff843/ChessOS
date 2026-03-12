/**
 * Types for M12D cognitive training system.
 *
 * Extends tactical puzzle training with recall, visualization,
 * and reconstruction exercise types, plus tactical pattern tracking.
 */

import type { ChessColor } from "@chess-os/chess-core";
import type { GamePhase } from "@chess-os/classifier";
import type { LessonCategory, DifficultyEstimate } from "../exercises/types";
import type { GradingTier } from "../grading/eval-loss-bands";

export type ExerciseType =
  | "tactical"
  | "recall"
  | "visualization"
  | "reconstruction";

export type TacticalPattern =
  | "fork"
  | "pin"
  | "skewer"
  | "back_rank"
  | "clearance"
  | "deflection"
  | "king_attack"
  | "endgame_technique"
  | "unclassified";

export interface ExerciseTypeMix {
  tactical: number;
  recall: number;
  visualization: number;
  reconstruction: number;
}

export const DEFAULT_EXERCISE_TYPE_MIX: ExerciseTypeMix = {
  tactical: 6,
  recall: 1,
  visualization: 1,
  reconstruction: 1,
};

export interface PatternLibraryEntry {
  pattern: TacticalPattern;
  totalSeen: number;
  totalCorrect: number;
  accuracy: number;
  missRate: number;
  severity: "critical" | "moderate" | "minor";
  trendDirection: "improving" | "stable" | "worsening" | "insufficient_data";
  recentAccuracy: number | null;
  improvementTrend: number | null;
  difficultyDistribution: Record<DifficultyEstimate, number>;
  exampleExerciseIds: string[];
}

export interface PatternLibrary {
  generatedAt: string;
  entries: PatternLibraryEntry[];
  totalPatternedExercises: number;
}

export interface RecallGradeInput {
  exerciseId: string;
  originalFen: string;
  reconstructedPieces: Array<{ square: string; piece: string }>;
  timeTakenMs: number;
}

export interface RecallGradeResult {
  totalPieces: number;
  correctPieces: number;
  incorrectPieces: number;
  missingPieces: number;
  extraPieces: number;
  accuracy: number;
  gradingTier: GradingTier;
  isCorrect: boolean;
}

export type VisualizationQuestionType =
  | "final_square"
  | "piece_count"
  | "check_status"
  | "king_location"
  | "material_balance";

export interface VisualizationQuestion {
  type: VisualizationQuestionType;
  prompt: string;
  correctAnswer: string;
  options?: string[];
}

export interface VisualizationGradeResult {
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  questionType: VisualizationQuestionType;
  gradingTier: GradingTier;
}

export interface ReconstructionGradeResult {
  userMove: string;
  gameMove: string;
  engineMove: string | undefined;
  isExactGameMove: boolean;
  isEngineMove: boolean;
  gradingTier: GradingTier;
  evalLossCp: number | null;
  isCorrect: boolean;
}

export interface CognitiveSessionExercise {
  exerciseId: string;
  exerciseType: ExerciseType;
  fen: string;
  sideToMove: ChessColor;
  phase: GamePhase;
  lessonCategory: LessonCategory;
  difficultyEstimate: DifficultyEstimate;
  difficultyScore: number;
  targetPriority: number;
  rationale?: string;
  patternCategory?: TacticalPattern;

  tacticalData?: {
    playedMoveSan: string;
    bestMoveSan: string;
    patterns: TacticalPattern[];
  };
  recallData?: {
    viewingWindowMs: number;
  };
  visualizationData?: {
    moveSequence: string[];
    question: VisualizationQuestion;
  };
  reconstructionData?: {
    gameMoveSan: string;
    engineMoveSan?: string;
  };
}

export interface MixRationale {
  requestedMix: ExerciseTypeMix;
  actualMix: Record<ExerciseType, number>;
  degradationNotes: string[];
  typeExplanations: Array<{
    exerciseType: ExerciseType;
    count: number;
    reason: string;
  }>;
}
