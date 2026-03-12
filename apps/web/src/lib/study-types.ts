// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// Study Session Types (Web-specific)
// Re-exports engine types + web-only additions
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

export type {
  PuzzleAttempt,
  PuzzleResult,
  EnrichedExercise,
} from "@chess-os/training";

export type {
  GradingTier,
  MasteryState,
  LessonCategory,
  DifficultyEstimate,
} from "@chess-os/training";

export type {
  SessionAnalytics,
  HardMiss,
} from "@chess-os/training";

export type {
  MasteryChange,
  SessionRecapInput,
} from "@chess-os/training";

export type {
  ReviewQueueEntry,
} from "@chess-os/training";

export type {
  ExerciseType,
  RecallGradeResult,
  VisualizationGradeResult,
  VisualizationQuestion,
  ReconstructionGradeResult,
  CognitiveSessionExercise,
} from "@chess-os/training";

export type {
  MoveCoachingInsight,
  AdaptiveDifficultyPlan,
  SessionAttemptSummary,
  SessionCoachingFeedback,
} from "./coaching-engine";

/** Client-side study session state */
export type StudyPhase = "loading" | "playing" | "feedback" | "completed";

/** What the client needs for the active exercise */
export interface ExerciseView {
  index: number;
  total: number;
  exerciseId: string;
  fen: string;
  sideToMove: "white" | "black";
  phase: string;
  lessonCategory: string;
  difficultyEstimate: string;
  playedMoveSan: string;
  bestMoveSan: string | undefined;
  engineEvaluation: number | null;
  evalSwingCp: number | null;
  gameId: string;
  ply: number;
  /** Exercise type (defaults to "tactical") */
  exerciseType: "tactical" | "recall" | "visualization" | "reconstruction";
  /** Recall-specific data */
  recallData?: { viewingWindowMs: number };
  /** Visualization-specific data */
  visualizationData?: {
    moveSequence: string[];
    question: { type: string; prompt: string; correctAnswer: string; options?: string[] };
  };
  /** Reconstruction-specific data */
  reconstructionData?: { gameMoveSan: string };
  rationale?: string;
  patternCategory?: string;
  reasonCodes?: string[];
}

/** Result from grading a move */
export interface GradeResult {
  valid: boolean;
  error: string | null;
  attempt: {
    exerciseId: string;
    exerciseIndex: number;
    userMove: string;
    userMoveUci: string;
    engineMove: string;
    engineMoveUci: string;
    isCorrect: boolean;
    gradingTier: string;
    evalLossCp: number | null;
  } | null;
}

/** Session completion result */
export interface CompletionResult {
  sessionId: string;
  totalExercises: number;
  correctCount: number;
  accuracy: number;
  gradeDistribution: Record<string, number>;
  hardestMissed: Array<{
    exerciseId: string;
    exerciseIndex: number;
    userMove: string;
    engineMove: string;
    gradingTier: string;
    evalLossCp: number | null;
    lessonCategory: string;
  }>;
  masteryChanges: Array<{
    exerciseId: string;
    before: string;
    after: string;
    changed: boolean;
  }>;
  evalLossStats: {
    average: number | null;
    median: number | null;
    max: number | null;
  };
}




