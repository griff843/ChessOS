// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// Chess-OS Artifact Types
// Mirrors canonical schemas from training pipeline
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

export type LessonCategory =
  | "tactical_miss"
  | "material_loss"
  | "positional_error"
  | "endgame_technique"
  | "opening_inaccuracy"
  | "calculation_error"
  | "critical_defense";

export type DifficultyEstimate = "easy" | "medium" | "hard";
export type MasteryState = "unseen" | "learning" | "unstable" | "improving" | "mastered";
export type GradingTier = "exact" | "acceptable" | "inaccuracy" | "mistake" | "blunder" | "illegal";
export type TrendDirection = "improving" | "worsening" | "stable" | "insufficient_data";

// Ã¢â€â‚¬Ã¢â€â‚¬ Dashboard Ã¢â€â‚¬Ã¢â€â‚¬

export interface SessionSnapshot {
  sessionId: string;
  completedAt: string;
  accuracy: number;
  exerciseCount: number;
  correctCount: number;
}

export interface FocusRecommendation {
  rank: number;
  category: LessonCategory;
  difficulty: DifficultyEstimate | null;
  reason: string;
  focusScore: number;
  factors: {
    weaknessWeight: number;
    trendPenalty: number;
    reviewPressure: number;
    masteryGap: number;
  };
}

export interface WeakArea {
  key: string;
  accuracy: number;
  missRate: number;
  dueCount: number;
  trendDirection: TrendDirection;
}

export interface LearnerOverview {
  generatedAt: string;
  totalExercises: number;
  totalSeen: number;
  totalUnseen: number;
  totalCorrect: number;
  totalIncorrect: number;
  lifetimeAccuracy: number;
  recentSessionCount: number;
  recentAccuracy: number | null;
  masteryDistribution: Record<MasteryState, number>;
  reviewLoad: {
    overdueCount: number;
    dueSoonCount: number;
    unstableCount: number;
    totalReviewable: number;
  };
  topWeakCategories: WeakArea[];
  topWeakDifficulties: WeakArea[];
  trendSummary: {
    improvingCategories: string[];
    worseningCategories: string[];
    stableCategories: string[];
    insufficientDataCategories: string[];
  };
  recentSessions: SessionSnapshot[];
  focusRecommendations: FocusRecommendation[];
}

export interface CategoryTrend {
  key: string;
  lifetimeAccuracy: number;
  recentAccuracy: number | null;
  trendDirection: TrendDirection;
  lifetimeSeen: number;
  recentSeen: number;
  adaptiveWeight: number;
  dueCount: number;
}

export interface EvalLossTrendEntry {
  sessionId: string;
  completedAt: string;
  avgEvalLossCp: number | null;
  medianEvalLossCp: number | null;
}

export interface TrendReport {
  generatedAt: string;
  recentWindowSize: number;
  overallAccuracy: number;
  categoryTrends: CategoryTrend[];
  difficultyTrends: CategoryTrend[];
  evalLossTrend: EvalLossTrendEntry[] | null;
  sessionTimeline: SessionSnapshot[];
}

export interface ReviewReportEntry {
  exerciseId: string;
  masteryState: MasteryState;
  reviewUrgency: number;
  lastGradingTier: GradingTier | null;
  rollingQualityScore: number;
  intervalDays: number;
  nextReviewAt: string;
  reason: string;
}

export interface ReviewReport {
  generatedAt: string;
  totalEntries: number;
  entries: ReviewReportEntry[];
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Coach Ã¢â€â‚¬Ã¢â€â‚¬

export interface CoachInsight {
  type: "strength" | "weakness" | "trend" | "review" | "milestone";
  message: string;
  priority: number;
}

export interface CoachingSummary {
  generatedAt: string;
  headline: string;
  insights: CoachInsight[];
  progressStatement: string;
  nextStepStatement: string;
}

export interface StudyPlanFocus {
  category: LessonCategory;
  difficulty: DifficultyEstimate | null;
  reason: string;
  exerciseCount: number;
}

export interface StudyPlanComposition {
  source: string;
  count: number;
  description: string;
}

export interface StudyPlan {
  generatedAt: string;
  primaryFocus: StudyPlanFocus;
  secondaryFocus: StudyPlanFocus | null;
  reviewFocus: StudyPlanFocus | null;
  targetDifficultyMix: { easy: number; medium: number; hard: number };
  suggestedSessionSize: number;
  exerciseComposition: StudyPlanComposition[];
}

export interface CategoryPattern {
  category: LessonCategory;
  severity: string;
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

export interface MistakePatterns {
  generatedAt: string;
  categoryPatterns: CategoryPattern[];
  difficultyPatterns: DifficultyPattern[];
  blunderProfile: {
    totalBlunders: number;
    totalMistakes: number;
    worstCategories: string[];
    avgEvalLossCp: number | null;
  };
  recurringWeaknesses: string[];
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Review Queue Ã¢â€â‚¬Ã¢â€â‚¬

export interface ReviewQueueEntry {
  exerciseId: string;
  masteryState: MasteryState;
  reviewUrgency: number;
  lastGradingTier: GradingTier | null;
  rollingQualityScore: number;
  intervalDays: number;
  nextReviewAt: string;
  reason: string;
}

export interface ReviewQueue {
  generatedAt: string;
  totalEntries: number;
  entries: ReviewQueueEntry[];
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Curriculum Ã¢â€â‚¬Ã¢â€â‚¬

export interface CurriculumSession {
  sessionIndex: number;
  theme: string;
  focusCategory: LessonCategory;
  secondaryCategory: LessonCategory | null;
  difficultyMix: { easy: number; medium: number; hard: number };
  exerciseQuota: {
    reviewSlots: number;
    freshSlots: number;
    total: number;
    reason: string;
  };
  rationale: string;
}

export interface ThemeAssignment {
  sessionIndex: number;
  theme: string;
  reason: string;
  triggerMetric: string;
  triggerValue: number;
}

export interface ProgressionGateCriteria {
  name: string;
  description: string;
  currentValue: number;
  threshold: number;
  passed: boolean;
}

export interface ProgressionGate {
  gateName: string;
  gateType: string;
  criteria: ProgressionGateCriteria[];
  allPassed: boolean;
  recommendation: string;
}

export interface CurriculumPlan {
  generatedAt: string;
  sessionCount: number;
  themeAssignments: ThemeAssignment[];
  sessions: CurriculumSession[];
  progressionGates: {
    generatedAt: string;
    gates: ProgressionGate[];
    overallReadiness: boolean;
    readinessSummary: string;
  };
  overallRationale: string;
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Sessions Ã¢â€â‚¬Ã¢â€â‚¬

export interface SessionExercise {
  exerciseId: string;
  gameId: string;
  ply: number;
  fen: string;
  sideToMove: "white" | "black";
  phase: "opening" | "middlegame" | "endgame";
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
    difficultyDistribution: { easy: number; medium: number; hard: number };
    categoryDistribution: Record<string, number>;
    sourceGames: string[];
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
    objectiveSignalSnapshot?: InterventionSignalSnapshotSeed;
    interventionEpisodeId?: string;
    priorInterventionOutcome?: InterventionEffectivenessOutcome;
    interventionRecommendedAction?: InterventionEffectivenessAction;
    interventionRecommendedType?: ObjectiveInterventionType | null;
    interventionRepeatedPatternFlag?: boolean;
    interventionCompareSummary?: string;
  };
}

export interface SessionResult {
  exerciseId: string;
  result: "correct" | "incorrect";
  userMoveSan?: string;
  gradingTier?: GradingTier;
  evalLossCp?: number;
}

export interface SessionResults {
  sessionId: string;
  completedAt: string;
  results: SessionResult[];
  summary?: {
    totalExercises: number;
    correctCount: number;
    accuracy: number;
  };
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Session History Ã¢â€â‚¬Ã¢â€â‚¬

export interface SessionHistoryEntry {
  sessionId: string;
  createdAt: string;
  completedAt: string;
  exerciseIds: string[];
  difficultyDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  results: Array<{ exerciseId: string; result: "correct" | "incorrect" }>;
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Progress Ã¢â€â‚¬Ã¢â€â‚¬

export interface ExerciseProgressEntry {
  exerciseId: string;
  gameId: string;
  positionId: string;
  lessonCategory: LessonCategory;
  difficultyEstimate: DifficultyEstimate;
  status: "unseen" | "seen" | "correct" | "incorrect" | "due_for_review";
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

export interface ExerciseProgress {
  totalExercises: number;
  exercises: Record<string, ExerciseProgressEntry>;
  lastUpdatedAt: string;
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Cognitive Training Ã¢â€â‚¬Ã¢â€â‚¬

export type ExerciseType = "tactical" | "recall" | "visualization" | "reconstruction";

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

export interface PatternLibraryEntry {
  pattern: TacticalPattern;
  totalSeen: number;
  totalCorrect: number;
  accuracy: number;
  missRate: number;
  trendDirection: TrendDirection;
  recentAccuracy: number | null;
  exampleExerciseIds: string[];
}

export interface PatternLibrary {
  generatedAt: string;
  entries: PatternLibraryEntry[];
  totalPatternedExercises: number;
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Strategic Intelligence Ã¢â€â‚¬Ã¢â€â‚¬

export type ReadinessState = "ready_to_expand" | "hold_steady" | "repair_mode";

export interface ReadinessSignal {
  name: string;
  value: number;
  threshold: number;
  passed: boolean;
}

export interface ReadinessForecast {
  generatedAt: string;
  state: ReadinessState;
  signals: ReadinessSignal[];
  reason: string;
}

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

export interface RecurrenceEntry {
  category: string;
  recurrenceScore: number;
  severity: string;
  isRecurring: boolean;
}

export interface PatternIntelligence {
  generatedAt: string;
  crossTable: CrossCell[];
  recurrenceEntries: RecurrenceEntry[];
  recurringWeaknesses: string[];
  topVulnerability: { category: string; difficulty: string; missRate: number } | null;
}

export interface CompositionSlot {
  exerciseId: string;
  source: "review" | "weakness" | "fresh" | "stretch";
  reason: string;
}

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

export interface IntelligenceReport {
  generatedAt: string;
  readiness: ReadinessForecast;
  patternSummary: {
    recurringCount: number;
    topWeakness: string | null;
    topVulnerability: { category: string; difficulty: string; missRate: number } | null;
  };
  reviewStrategy: string;
  difficultyStrategy: string;
  recommendations: string[];
}

// Objective Layer

export type TrainingObjective =
  | "candidate_move_generation"
  | "tactical_pattern_recognition"
  | "calculation_stability"
  | "visualization_depth"
  | "defensive_resource_finding"
  | "endgame_conversion"
  | "attacking_coordination"
  | "practical_decision_quality";

export type ObjectivePhase = "stabilize" | "build" | "expand";

export type ObjectiveStatus =
  | "active"
  | "improving"
  | "holding"
  | "stalled"
  | "regressing"
  | "promoted"
  | "retired"
  | "switched";

export type ObjectiveProgressVerdict =
  | "insufficient_data"
  | "progressing"
  | "holding"
  | "stalled"
  | "regressing"
  | "completed";

export type ObjectiveLifecycleDecision =
  | "continue"
  | "hold"
  | "promote"
  | "switch"
  | "retire"
  | "repair";

export type ObjectiveEscalationVerdict =
  | "continue_current_objective"
  | "hold_current_objective"
  | "promote_objective_phase"
  | "switch_objective"
  | "retire_objective"
  | "revert_to_repair_mode";

export type ObjectiveEscalationStrength = "low" | "medium" | "high";

export type ObjectiveInterventionType =
  | "reinforce_pattern_repair"
  | "shift_to_visualization_support"
  | "reduce_stretch_load"
  | "increase_review_share"
  | "increase_challenge"
  | "promote_to_next_phase"
  | "hold_current_plan"
  | "switch_objective"
  | "retire_objective";

export type ObjectiveRecommendationStrength = "low" | "medium" | "high";

export type ObjectiveSuggestedAction =
  | "continue"
  | "intensify_repair"
  | "reduce_difficulty"
  | "increase_challenge"
  | "shift_exercise_mix"
  | "switch_objective"
  | "retire_objective"
  | "promote_objective";

export interface ObjectiveSuccessSignal {
  signal: string;
  metric: string;
  currentValue: number;
  targetValue: number;
  direction: "increase" | "decrease";
  trend: TrendDirection;
}

export interface ObjectiveSuccessSignalSnapshot extends ObjectiveSuccessSignal {
  capturedAt: string;
  attainment: number;
  met: boolean;
}

export interface ObjectiveSessionEvidence {
  sessionId: string;
  completedAt: string;
  objective: TrainingObjective;
  objectivePhase: ObjectivePhase;
  accuracy: number;
  exactRate: number;
  acceptableRate: number;
  mistakeRate: number;
  blunderRate: number;
  averageEvalLossCp: number | null;
  objectiveEscalationVerdict?: ObjectiveEscalationVerdict;
  objectiveEscalationStrength?: ObjectiveEscalationStrength;
  objectiveInterventionType?: ObjectiveInterventionType;
  objectiveInterventionStartedAt?: string;
  objectiveRecommendationStrength?: ObjectiveRecommendationStrength;
}

export interface ObjectivePerformanceWindow {
  sessionCount: number;
  averageAccuracy: number | null;
  exactRate: number | null;
  acceptableRate: number | null;
  mistakeRate: number | null;
  blunderRate: number | null;
  averageEvalLossCp: number | null;
}

export interface TrainingObjectiveState {
  generatedAt: string;
  currentObjective: TrainingObjective;
  objectiveReason: string;
  objectivePhase: ObjectivePhase;
  progressionState: {
    score: number;
    status: "on_track" | "needs_attention" | "fragile";
  };
  successSignals: ObjectiveSuccessSignal[];
  weeklyPlan: string[];
  objectiveExerciseMix: { tactical: number; recall: number; visualization: number; reconstruction: number };
  objectiveExerciseMixRationale: string;
  candidateScores: Array<{ objective: TrainingObjective; score: number; reasons: string[] }>;
}

export interface ObjectiveProgressState {
  generatedAt: string;
  currentObjective: TrainingObjective;
  previousObjective: TrainingObjective | null;
  startedAt: string;
  activeDays: number;
  lastEvaluatedAt: string;
  sessionsOnObjective: number;
  recentObjectiveSessions: ObjectiveSessionEvidence[];
  objectiveStatus: ObjectiveStatus;
  objectivePhase: ObjectivePhase;
  successSignalSnapshots: ObjectiveSuccessSignalSnapshot[];
  progressVerdict: ObjectiveProgressVerdict;
  lifecycleDecision: ObjectiveLifecycleDecision;
  objectiveDecisionReason: string;
  promotionRecommendation: {
    recommended: boolean;
    targetPhase: ObjectivePhase | null;
    reason: string | null;
  };
  retirementRecommendation: {
    recommended: boolean;
    reason: string | null;
  };
  switchRecommendationReason: string | null;
  nextRecommendedAction: string;
  evidenceWindow: ObjectivePerformanceWindow;
  baselineWindow: ObjectivePerformanceWindow;
}

export interface ObjectiveCompareWindow {
  label: string;
  currentWindow: ObjectivePerformanceWindow;
  previousWindow: ObjectivePerformanceWindow;
  deltas: {
    accuracyDelta: number | null;
    severeRateDelta: number | null;
    evalLossDelta: number | null;
  };
  summary: string;
}

export interface ObjectiveEscalationSignal {
  key: string;
  label: string;
  summary: string;
  value: number | string | null;
  support: "success" | "failure" | "mixed" | "penalty";
}

export interface ObjectiveRecommendedPhaseChange {
  fromPhase: ObjectivePhase;
  toPhase: ObjectivePhase | null;
  reason: string;
}

export interface ObjectiveEscalationState {
  generatedAt: string;
  currentObjective: TrainingObjective;
  currentPhase: ObjectivePhase;
  escalationVerdict: ObjectiveEscalationVerdict;
  escalationReason: string;
  escalationStrength: ObjectiveEscalationStrength;
  memorySupportSignals: ObjectiveEscalationSignal[];
  repeatedFailureSignals: string[];
  repeatedSuccessSignals: string[];
  oscillationPenalty: number;
  recommendedObjectiveAction: ObjectiveEscalationVerdict;
  recommendedObjectivePhaseChange: ObjectiveRecommendedPhaseChange | null;
  recommendedNextObjective: TrainingObjective | null;
  explanation: string;
}

export type ObjectivePortfolioStatus =
  | "active"
  | "rotation_candidate"
  | "paused"
  | "repair_mode"
  | "standby";

export interface ObjectivePortfolioEntry {
  objectiveKey: TrainingObjective;
  currentPhase: ObjectivePhase;
  readinessScore: number;
  escalationVerdict: ObjectiveEscalationVerdict | null;
  interventionMemoryScore: number;
  recurrencePressure: number;
  reviewBurdenImpact: number;
  portfolioPriority: number;
  portfolioRotationWeight: number;
  lastTrainedAt: string | null;
  trainingShare: number;
  portfolioStatus: ObjectivePortfolioStatus;
  reasons: string[];
}

export interface ObjectivePortfolioRotationDecision {
  objectiveKey: TrainingObjective;
  action: "activate" | "rotate_in" | "hold" | "pause" | "repair" | "standby";
  reason: string;
  trainingShare: number;
}

export interface ObjectivePortfolioState {
  generatedAt: string;
  activeObjective: TrainingObjective;
  rankedObjectives: ObjectivePortfolioEntry[];
  rotationDecisions: ObjectivePortfolioRotationDecision[];
  portfolioSummary: string;
}

export interface ObjectiveCoachingSignal {
  key: string;
  label: string;
  metric: string;
  status: "failed" | "supporting";
  currentValue: number;
  targetValue: number | null;
  direction: "increase" | "decrease" | "hold";
  explanation: string;
}

export type InterventionEffectivenessOutcome =
  | "effective"
  | "partially_effective"
  | "ineffective"
  | "regressed"
  | "inconclusive";

export type InterventionEffectivenessAction =
  | "continue"
  | "strengthen"
  | "reverse"
  | "replace"
  | "switch_objective";

export interface InterventionPatternSnapshot {
  category: string;
  severity: string;
  recurrenceScore: number;
  isRecurring: boolean;
}

export interface InterventionSignalSnapshot {
  readinessState: string | null;
  reviewBurdenShare: number | null;
  recurrencePressure: number | null;
  gradeDistribution: {
    accuracy: number | null;
    exactRate: number | null;
    acceptableRate: number | null;
    mistakeRate: number | null;
    blunderRate: number | null;
    severeRate: number | null;
  };
  evalLossProfile: {
    averageEvalLossCp: number | null;
  };
  objectivePerformanceSignals: ObjectiveSuccessSignalSnapshot[];
  patternRecurrence: InterventionPatternSnapshot[];
}

export interface InterventionSignalSnapshotSeed {
  readinessState: ReadinessState;
  reviewBurdenShare: number;
  recurrencePressure: number;
  patternRecurrence: InterventionPatternSnapshot[];
  objectivePerformanceSignals: ObjectiveSuccessSignalSnapshot[];
}

export interface InterventionCompareSnapshot {
  label: string;
  summary: string;
  accuracyDelta: number | null;
  severeRateDelta: number | null;
  evalLossDelta: number | null;
  reviewBurdenDelta: number | null;
  recurrencePressureDelta: number | null;
}

export interface InterventionEpisodeMemory {
  interventionEpisodeId: string;
  interventionType: ObjectiveInterventionType;
  objectiveKey: TrainingObjective;
  startedAt: string;
  evaluatedAt: string;
  preSnapshot: InterventionSignalSnapshot;
  postSnapshot: InterventionSignalSnapshot;
  compareSnapshot: InterventionCompareSnapshot;
  outcome: InterventionEffectivenessOutcome;
  outcomeStrength: ObjectiveRecommendationStrength;
  repeatedPatternFlag: boolean;
  recommendedNextAction: InterventionEffectivenessAction;
  recommendedNextIntervention: ObjectiveInterventionType | null;
}

export interface InterventionFamilyPerformance {
  interventionType: ObjectiveInterventionType;
  episodeCount: number;
  latestOutcome: InterventionEffectivenessOutcome;
  averageOutcomeScore: number;
  improvingEpisodes: number;
  worseningEpisodes: number;
}

export interface InterventionMemoryState {
  generatedAt: string;
  currentObjective: TrainingObjective;
  episodes: InterventionEpisodeMemory[];
  recentEpisodes: InterventionEpisodeMemory[];
  repeatedPatternWarnings: string[];
  oscillationDetected: boolean;
  oscillationSummary: string | null;
  familyPerformance: InterventionFamilyPerformance[];
  betterPriorIntervention: {
    currentInterventionType: ObjectiveInterventionType | null;
    preferredInterventionType: ObjectiveInterventionType | null;
    reason: string | null;
  };
  nextActionRecommendation: {
    action: InterventionEffectivenessAction;
    interventionType: ObjectiveInterventionType | null;
    reason: string;
  };
}
export interface InterventionSignalDelta {
  key: string;
  label: string;
  metric: string;
  beforeValue: number | null;
  afterValue: number | null;
  delta: number | null;
  direction: "increase" | "decrease";
  outcome: "improved" | "unchanged" | "worsened";
  explanation: string;
}

export interface InterventionEffectivenessState {
  generatedAt: string;
  currentObjective: TrainingObjective;
  interventionEpisodeId: string;
  interventionId: string;
  priorInterventionType: ObjectiveInterventionType | null;
  interventionStartedAt: string | null;
  interventionEvaluationAt: string;
  interventionOutcome: InterventionEffectivenessOutcome;
  outcomeStrength: ObjectiveRecommendationStrength;
  repeatedPatternFlag: boolean;
  changedSignals: InterventionSignalDelta[];
  unchangedSignals: InterventionSignalDelta[];
  worsenedSignals: InterventionSignalDelta[];
  compareWindows: ObjectiveCompareWindow[];
  recommendedAction: InterventionEffectivenessAction;
  recommendedNextIntervention: ObjectiveInterventionType | null;
  narrativeSummaryData: {
    headline: string;
    summary: string;
    whatImproved: string;
    whatDidNotImprove: string;
    whatGotWorse: string;
    nextStep: string;
  };
}

export interface ObjectiveCoachingState {
  generatedAt: string;
  currentObjective: TrainingObjective;
  objectivePhase: ObjectivePhase;
  objectiveStatus: ObjectiveStatus;
  progressVerdict: ObjectiveProgressVerdict;
  lifecycleDecision: ObjectiveLifecycleDecision;
  interventionType: ObjectiveInterventionType;
  interventionReason: string;
  recommendationStrength: ObjectiveRecommendationStrength;
  failedSignals: ObjectiveCoachingSignal[];
  supportingSignals: ObjectiveCoachingSignal[];
  compareWindows: ObjectiveCompareWindow[];
  suggestedSessionMixAdjustment: {
    recommendedMix: { tactical: number; recall: number; visualization: number; reconstruction: number };
    reason: string;
  };
  suggestedDifficultyAdjustment: {
    action: "hold" | "reduce" | "increase";
    recommendedDistribution: { easy: number; medium: number; hard: number };
    reason: string;
  };
  suggestedReviewAdjustment: {
    action: "hold" | "increase" | "decrease";
    targetReviewShare: number;
    reason: string;
  };
  suggestedObjectiveAction: ObjectiveSuggestedAction;
  nextSessionAdjustmentSummary: string;
  headline: string;
  explanation: string;
}















export interface LearningConceptStateArtifact {
  conceptKey: string;
  conceptName: string;
  masteryScore: number;
  retentionScore: number;
  forgettingRisk: number;
  stabilityScore: number;
  lastSeenAt: string | null;
  lastCorrectAt: string | null;
  lastIncorrectAt: string | null;
  reviewCount: number;
  successCount: number;
  failureCount: number;
  conceptHalfLifeEstimate: number;
  nextRecommendedReviewAt: string | null;
  trend: "improving" | "stable" | "worsening" | "insufficient_data";
  status: "mastered" | "stable" | "at_risk" | "unstable" | "unseen";
  signals: string[];
}

export interface LearningModelArtifact {
  generatedAt: string;
  conceptCount: number;
  concepts: LearningConceptStateArtifact[];
  masteredConcepts: string[];
  unstableConcepts: string[];
  atRiskConcepts: string[];
  nextReviewRecommendations: Array<{
    conceptKey: string;
    conceptName: string;
    nextRecommendedReviewAt: string | null;
    forgettingRisk: number;
  }>;
  summary: {
    averageMastery: number;
    averageRetention: number;
    averageStability: number;
    averageForgettingRisk: number;
  };
}

export interface ConceptGraphArtifact {
  generatedAt: string;
  concepts: Array<{
    conceptKey: string;
    conceptName: string;
    conceptCategory: string;
    parentConcepts: string[];
    childConcepts: string[];
    relatedConcepts: string[];
    prerequisiteConcepts: string[];
    difficultyBand: string;
    trainingTags: string[];
  }>;
  conceptIndex: Record<string, unknown>;
  categorySummaries: Array<{
    category: string;
    conceptCount: number;
    concepts: string[];
  }>;
}

export interface ConceptStateReportArtifact {
  generatedAt: string;
  entries: Array<{
    conceptKey: string;
    conceptName: string;
    conceptCategory: string;
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
  }>;
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

export interface OpeningReportArtifact {
  generatedAt: string;
  classifications: Array<{
    gameId: string;
    openingFamily: string;
    openingName: string;
    lineKey: string;
    matchedMoves: string[];
    moveCount: number;
  }>;
  familySummaries: Array<{
    openingFamily: string;
    openingName: string;
    games: number;
    mistakes: number;
    topThemes: Array<{
      theme: string;
      count: number;
    }>;
  }>;
  topWeaknesses: Array<{
    openingFamily: string;
    openingName: string;
    theme: string;
    count: number;
  }>;
  recommendedTrainingThemes: string[];
}

export interface OpeningMistakeArtifact {
  gameId: string;
  positionId: string;
  ply: number;
  openingFamily: string;
  theme: string;
  severity: "low" | "medium" | "high";
  explanation: string;
  relatedConcepts: string[];
}
