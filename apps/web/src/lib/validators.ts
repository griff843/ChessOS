import type {
  LearnerOverview,
  TrendReport,
  ReviewReport,
  CoachingSummary,
  StudyPlan,
  MistakePatterns,
  ReviewQueue,
  CurriculumPlan,
  ExerciseProgress,
  StudySession,
  PatternIntelligence,
  ReadinessForecast,
  IntelligenceReport,
  CompositionRationale,
  PatternLibrary,
  TrainingObjectiveState,
  ObjectiveProgressState,
  ObjectiveCoachingState,
  ObjectiveEscalationState,
  ObjectivePortfolioState,
  InterventionEffectivenessState,
  InterventionMemoryState,
  LearningModelArtifact,
} from "./types";
import type { ImportAnalysisStatus } from "./import-types";

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isSessionSnapshot(v: unknown): boolean {
  if (!isObj(v)) return false;
  return (
    typeof v.sessionId === "string" &&
    typeof v.completedAt === "string" &&
    typeof v.accuracy === "number" &&
    typeof v.exerciseCount === "number" &&
    typeof v.correctCount === "number"
  );
}

export function isLearnerOverview(v: unknown): v is LearnerOverview {
  if (!isObj(v)) return false;
  return (
    typeof v.totalExercises === "number" &&
    typeof v.lifetimeAccuracy === "number" &&
    isObj(v.masteryDistribution) &&
    Array.isArray(v.recentSessions) &&
    v.recentSessions.every(isSessionSnapshot) &&
    Array.isArray(v.focusRecommendations)
  );
}

export function isTrendReport(v: unknown): v is TrendReport {
  if (!isObj(v)) return false;
  return Array.isArray(v.sessionTimeline) && Array.isArray(v.categoryTrends);
}

export function isReviewReport(v: unknown): v is ReviewReport {
  if (!isObj(v)) return false;
  return typeof v.totalOverdue === "number" && Array.isArray(v.categoryUrgency);
}

export function isCoachingSummary(v: unknown): v is CoachingSummary {
  if (!isObj(v)) return false;
  return typeof v.headline === "string" && Array.isArray(v.insights);
}

export function isStudyPlan(v: unknown): v is StudyPlan {
  if (!isObj(v)) return false;
  return isObj(v.primaryFocus) && typeof v.rationale === "string";
}

export function isMistakePatterns(v: unknown): v is MistakePatterns {
  if (!isObj(v)) return false;
  return Array.isArray(v.categoryPatterns) && isObj(v.blunderProfile);
}

export function isReviewQueue(v: unknown): v is ReviewQueue {
  if (!isObj(v)) return false;
  return typeof v.totalEntries === "number" && Array.isArray(v.entries);
}

export function isCurriculumPlan(v: unknown): v is CurriculumPlan {
  if (!isObj(v)) return false;
  return Array.isArray(v.sessions) && typeof v.sessionCount === "number";
}

export function isExerciseProgress(v: unknown): v is ExerciseProgress {
  if (!isObj(v)) return false;
  return typeof v.totalExercises === "number" && isObj(v.exercises);
}

export function isStudySession(v: unknown): v is StudySession {
  if (!isObj(v)) return false;
  return (
    typeof v.sessionId === "string" &&
    Array.isArray(v.exercises) &&
    typeof v.exerciseCount === "number"
  );
}

export function isPatternIntelligence(v: unknown): v is PatternIntelligence {
  if (!isObj(v)) return false;
  return (
    Array.isArray(v.crossTable) &&
    Array.isArray(v.recurrenceEntries) &&
    Array.isArray(v.recurringWeaknesses)
  );
}

export function isReadinessForecast(v: unknown): v is ReadinessForecast {
  if (!isObj(v)) return false;
  return typeof v.state === "string" && Array.isArray(v.signals) && typeof v.reason === "string";
}

export function isIntelligenceReport(v: unknown): v is IntelligenceReport {
  if (!isObj(v)) return false;
  return isObj(v.readiness) && isObj(v.patternSummary) && Array.isArray(v.recommendations);
}

export function isCompositionRationale(v: unknown): v is CompositionRationale {
  if (!isObj(v)) return false;
  return typeof v.sessionId === "string" && typeof v.readinessState === "string" && Array.isArray(v.slots);
}

export function isPatternLibrary(v: unknown): v is PatternLibrary {
  if (!isObj(v)) return false;
  return Array.isArray(v.entries) && typeof v.totalPatternedExercises === "number";
}

export function isTrainingObjectiveState(v: unknown): v is TrainingObjectiveState {
  if (!isObj(v)) return false;
  return (
    typeof v.currentObjective === "string" &&
    typeof v.objectiveReason === "string" &&
    typeof v.objectivePhase === "string" &&
    Array.isArray(v.successSignals) &&
    Array.isArray(v.weeklyPlan)
  );
}

export function isObjectiveProgressState(v: unknown): v is ObjectiveProgressState {
  if (!isObj(v)) return false;
  return (
    typeof v.currentObjective === "string" &&
    typeof v.startedAt === "string" &&
    typeof v.objectiveStatus === "string" &&
    typeof v.progressVerdict === "string" &&
    typeof v.lifecycleDecision === "string" &&
    Array.isArray(v.recentObjectiveSessions) &&
    Array.isArray(v.successSignalSnapshots)
  );
}

export function isObjectiveEscalationState(v: unknown): v is ObjectiveEscalationState {
  if (!isObj(v)) return false;
  return (
    typeof v.currentObjective === "string" &&
    typeof v.currentPhase === "string" &&
    typeof v.escalationVerdict === "string" &&
    typeof v.escalationReason === "string" &&
    typeof v.escalationStrength === "string" &&
    Array.isArray(v.memorySupportSignals) &&
    Array.isArray(v.repeatedFailureSignals) &&
    Array.isArray(v.repeatedSuccessSignals)
  );
}

export function isObjectivePortfolioState(v: unknown): v is ObjectivePortfolioState {
  if (!isObj(v)) return false;
  return (
    typeof v.activeObjective === "string" &&
    Array.isArray(v.rankedObjectives) &&
    Array.isArray(v.rotationDecisions) &&
    typeof v.portfolioSummary === "string"
  );
}

export function isObjectiveCoachingState(v: unknown): v is ObjectiveCoachingState {
  if (!isObj(v)) return false;
  return (
    typeof v.currentObjective === "string" &&
    typeof v.interventionType === "string" &&
    typeof v.interventionReason === "string" &&
    typeof v.recommendationStrength === "string" &&
    Array.isArray(v.failedSignals) &&
    Array.isArray(v.supportingSignals) &&
    Array.isArray(v.compareWindows) &&
    typeof v.nextSessionAdjustmentSummary === "string"
  );
}

export function isInterventionEffectivenessState(v: unknown): v is InterventionEffectivenessState {
  if (!isObj(v)) return false;
  return (
    typeof v.currentObjective === "string" &&
    typeof v.interventionId === "string" &&
    typeof v.interventionOutcome === "string" &&
    typeof v.outcomeStrength === "string" &&
    Array.isArray(v.changedSignals) &&
    Array.isArray(v.unchangedSignals) &&
    Array.isArray(v.worsenedSignals) &&
    Array.isArray(v.compareWindows) &&
    isObj(v.narrativeSummaryData)
  );
}

export function isInterventionMemoryState(v: unknown): v is InterventionMemoryState {
  if (!isObj(v)) return false;
  return (
    typeof v.currentObjective === "string" &&
    Array.isArray(v.episodes) &&
    Array.isArray(v.recentEpisodes) &&
    Array.isArray(v.repeatedPatternWarnings) &&
    typeof v.oscillationDetected === "boolean" &&
    Array.isArray(v.familyPerformance) &&
    isObj(v.nextActionRecommendation)
  );
}

export function isLearningModelArtifact(v: unknown): v is LearningModelArtifact {
  if (!isObj(v)) return false;
  return (
    typeof v.generatedAt === "string" &&
    typeof v.conceptCount === "number" &&
    Array.isArray(v.concepts) &&
    Array.isArray(v.masteredConcepts) &&
    Array.isArray(v.unstableConcepts) &&
    Array.isArray(v.atRiskConcepts) &&
    Array.isArray(v.nextReviewRecommendations) &&
    isObj(v.summary) &&
    typeof v.summary.averageMastery === "number" &&
    typeof v.summary.averageRetention === "number" &&
    typeof v.summary.averageStability === "number" &&
    typeof v.summary.averageForgettingRisk === "number"
  );
}
export function isImportAnalysisStatus(v: unknown): v is ImportAnalysisStatus {
  if (!isObj(v)) return false;
  return (
    typeof v.status === "string" &&
    typeof v.sourceDir === "string" &&
    typeof v.sourceDirDisplay === "string" &&
    typeof v.engineMode === "string" &&
    Array.isArray(v.steps) &&
    isObj(v.summary) &&
    Array.isArray(v.artifacts)
  );
}

export const ARTIFACT_VALIDATORS: Record<string, ((v: unknown) => boolean) | undefined> = {
  "Learner Overview": isLearnerOverview,
  "Trend Report": isTrendReport,
  "Review Report": isReviewReport,
  "Coaching Summary": isCoachingSummary,
  "Study Plan": isStudyPlan,
  "Mistake Patterns": isMistakePatterns,
  "Review Queue": isReviewQueue,
  "Exercise Progress": isExerciseProgress,
  "Curriculum Plan": isCurriculumPlan,
  "Tree Model": (v) =>
    isObj(v) && typeof (v as Record<string, unknown>).type === "string" && (v as Record<string, unknown>).root !== undefined,
  "Feature Ablation": (v) => isObj(v) && Array.isArray((v as Record<string, unknown>).configs),
  "Difficulty Calibration": (v) =>
    isObj(v) &&
    typeof (v as Record<string, unknown>).totalExercises === "number" &&
    isObj((v as Record<string, unknown>).distribution),
  "Pattern Intelligence": isPatternIntelligence,
  "Readiness Forecast": isReadinessForecast,
  "Intelligence Report": isIntelligenceReport,
  "Pattern Library": isPatternLibrary,
  "Training Objective": isTrainingObjectiveState,
  "Objective Progress": isObjectiveProgressState,
  "Objective Coaching": isObjectiveCoachingState,
  "Intervention Effectiveness": isInterventionEffectivenessState,
  "Intervention Memory": isInterventionMemoryState,
  "Learning Model": isLearningModelArtifact,
  "Import Analysis Status": isImportAnalysisStatus,
};



