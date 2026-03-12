import type { WeaknessProfile } from "../adaptive/types";
import type { SessionAnalytics } from "../analytics/build-session-analytics";
import type { ExerciseTypeMix } from "../cognitive/types";
import type { CurriculumTheme } from "../curriculum/types";
import type { SessionSnapshot, FocusRecommendation } from "../dashboard/types";
import type { TrainingExercise } from "../exercises/types";
import type { ReviewQueue } from "../mastery/build-review-queue";
import type { ProgressStore } from "../progress/types";
import type { PatternIntelligence, ReadinessForecast } from "../strategic/types";
import type { TrendProfile } from "../trends/types";

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
  trend: "improving" | "stable" | "worsening" | "insufficient_data";
}

export interface ObjectiveCandidateScore {
  objective: TrainingObjective;
  score: number;
  reasons: string[];
}

export interface ObjectiveCurriculumState {
  activeTheme: CurriculumTheme | "none";
  blockedGateCount: number;
  overallReadiness: boolean;
  sessionCount: number;
  expansionReserved: boolean;
}

export interface ObjectiveSelectionInput {
  generatedAt?: string;
  store: ProgressStore;
  weaknessProfile: WeaknessProfile;
  trendProfile: TrendProfile;
  reviewQueue: ReviewQueue;
  readiness: ReadinessForecast;
  patternIntelligence: PatternIntelligence;
  curriculumState: ObjectiveCurriculumState;
  recentSessions: SessionSnapshot[];
  focusRecommendations: FocusRecommendation[];
}

export interface ObjectiveSelectionResult {
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
  objectiveExerciseMix: ExerciseTypeMix;
  objectiveExerciseMixRationale: string;
  candidateScores: ObjectiveCandidateScore[];
  curriculumState: ObjectiveCurriculumState;
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
  objectiveStatus?: ObjectiveStatus;
  objectiveProgressVerdict?: ObjectiveProgressVerdict;
  objectiveDecision?: ObjectiveLifecycleDecision;
  objectiveEscalationVerdict?: ObjectiveEscalationVerdict;
  objectiveEscalationStrength?: ObjectiveEscalationStrength;
  objectiveInterventionType?: ObjectiveInterventionType;
  objectiveInterventionStartedAt?: string;
  objectiveRecommendationStrength?: ObjectiveRecommendationStrength;
}

export interface ObjectiveSuccessSignalSnapshot extends ObjectiveSuccessSignal {
  capturedAt: string;
  attainment: number;
  met: boolean;
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

export interface ObjectivePromotionRecommendation {
  recommended: boolean;
  targetPhase: ObjectivePhase | null;
  reason: string | null;
}

export interface ObjectiveRetirementRecommendation {
  recommended: boolean;
  reason: string | null;
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
  promotionRecommendation: ObjectivePromotionRecommendation;
  retirementRecommendation: ObjectiveRetirementRecommendation;
  switchRecommendationReason: string | null;
  nextRecommendedAction: string;
  evidenceWindow: ObjectivePerformanceWindow;
  baselineWindow: ObjectivePerformanceWindow;
}

export interface ObjectiveHistoryEntry {
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
  objectiveStatus: ObjectiveStatus | null;
  objectiveProgressVerdict: ObjectiveProgressVerdict | null;
  objectiveDecision: ObjectiveLifecycleDecision | null;
  objectiveEscalationVerdict: ObjectiveEscalationVerdict | null;
  objectiveEscalationStrength: ObjectiveEscalationStrength | null;
  objectiveInterventionType: ObjectiveInterventionType | null;
  objectiveInterventionStartedAt: string | null;
  objectiveRecommendationStrength: ObjectiveRecommendationStrength | null;
}

export interface ObjectiveCompareWindowDeltas {
  accuracyDelta: number | null;
  severeRateDelta: number | null;
  evalLossDelta: number | null;
}

export interface ObjectiveCompareWindow {
  label: string;
  currentWindow: ObjectivePerformanceWindow;
  previousWindow: ObjectivePerformanceWindow;
  deltas: ObjectiveCompareWindowDeltas;
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

export interface ObjectiveLifecycleEscalationOverride {
  verdict: ObjectiveEscalationVerdict;
  reason: string;
  strength: ObjectiveEscalationStrength;
  targetObjective: TrainingObjective | null;
  targetPhase: ObjectivePhase | null;
  explanation: string;
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

export interface ObjectiveSessionMixAdjustment {
  recommendedMix: ExerciseTypeMix;
  reason: string;
}

export interface ObjectiveDifficultyAdjustment {
  action: "hold" | "reduce" | "increase";
  recommendedDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  reason: string;
}

export interface ObjectiveReviewAdjustment {
  action: "hold" | "increase" | "decrease";
  targetReviewShare: number;
  reason: string;
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
  suggestedSessionMixAdjustment: ObjectiveSessionMixAdjustment;
  suggestedDifficultyAdjustment: ObjectiveDifficultyAdjustment;
  suggestedReviewAdjustment: ObjectiveReviewAdjustment;
  suggestedObjectiveAction: ObjectiveSuggestedAction;
  nextSessionAdjustmentSummary: string;
  headline: string;
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
  readinessState: ReadinessForecast["state"];
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

export interface InterventionMemoryRecommendation {
  action: InterventionEffectivenessAction;
  interventionType: ObjectiveInterventionType | null;
  reason: string;
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
  nextActionRecommendation: InterventionMemoryRecommendation;
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

export interface InterventionNarrativeSummaryData {
  headline: string;
  summary: string;
  whatImproved: string;
  whatDidNotImprove: string;
  whatGotWorse: string;
  nextStep: string;
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
  narrativeSummaryData: InterventionNarrativeSummaryData;
}

export interface InterventionHistoryEntry {
  interventionEpisodeId: string;
  interventionId: string;
  objective: TrainingObjective;
  priorInterventionType: ObjectiveInterventionType | null;
  interventionStartedAt: string | null;
  interventionEvaluationAt: string;
  interventionOutcome: InterventionEffectivenessOutcome;
  outcomeStrength: ObjectiveRecommendationStrength;
  repeatedPatternFlag: boolean;
  recommendedAction: InterventionEffectivenessAction;
  recommendedNextIntervention: ObjectiveInterventionType | null;
  summary: string;
}

export interface ObjectiveProgressInput {
  generatedAt?: string;
  selectionInput: ObjectiveSelectionInput;
  baseSelection: ObjectiveSelectionResult;
  sessionEvidence: ObjectiveSessionEvidence[];
  priorProgress: ObjectiveProgressState | null;
  escalationOverride?: ObjectiveLifecycleEscalationOverride | null;
}

export interface ObjectivePortfolioInput {
  generatedAt?: string;
  selectionInput: ObjectiveSelectionInput;
  candidateScores: ObjectiveCandidateScore[];
  objectiveHistory: ObjectiveHistoryEntry[];
  currentObjective: TrainingObjective;
  currentEscalation: ObjectiveEscalationState;
  interventionMemory: InterventionMemoryState | null;
}

export interface ObjectiveEscalationInput {
  generatedAt?: string;
  selectionInput: ObjectiveSelectionInput;
  selection: ObjectiveSelectionResult;
  progress: ObjectiveProgressState;
  history: ObjectiveHistoryEntry[];
  interventionEffectiveness: InterventionEffectivenessState;
  interventionMemory: InterventionMemoryState | null;
}

export interface ObjectiveCoachingInput {
  generatedAt?: string;
  selectionInput: ObjectiveSelectionInput;
  selection: ObjectiveSelectionResult;
  progress: ObjectiveProgressState;
  history: ObjectiveHistoryEntry[];
  interventionMemory?: InterventionMemoryState | null;
}

export interface InterventionEffectivenessInput {
  generatedAt?: string;
  selectionInput: ObjectiveSelectionInput;
  selection: ObjectiveSelectionResult;
  progress: ObjectiveProgressState;
  coaching: ObjectiveCoachingState;
  sessionEvidence: ObjectiveSessionEvidence[];
  interventionMemory?: InterventionMemoryState | null;
}

export interface ObjectiveLifecycleResolution {
  selection: ObjectiveSelectionResult;
  progress: ObjectiveProgressState;
}

export interface ObjectiveSessionArtifactInput {
  sessionId: string;
  completedAt: string;
  trainingObjective?: TrainingObjective;
  objectivePhase?: ObjectivePhase;
  objectiveStatus?: ObjectiveStatus;
  objectiveProgressVerdict?: ObjectiveProgressVerdict;
  objectiveDecision?: ObjectiveLifecycleDecision;
  objectiveEscalationVerdict?: ObjectiveEscalationVerdict;
  objectiveEscalationStrength?: ObjectiveEscalationStrength;
  objectiveInterventionType?: ObjectiveInterventionType;
  objectiveInterventionStartedAt?: string;
  objectiveRecommendationStrength?: ObjectiveRecommendationStrength;
  analytics: SessionAnalytics;
}

export interface ObjectiveExerciseBias {
  categoryBoosts: Record<string, number>;
  difficultyBoosts: Record<string, number>;
}

export interface ObjectiveSessionContext {
  selection: ObjectiveSelectionResult;
  bias: ObjectiveExerciseBias;
}

export interface ObjectiveRankingInput {
  exercises: TrainingExercise[];
  context: ObjectiveSessionContext;
}







