/**
 * Serialize a session history record for JSONL append.
 * The worker handles actual file I/O.
 */

import type { StudySession } from "../sessions/types";
import type { SessionHistoryRecord, SessionExerciseResult } from "./types";

/**
 * Create a session history record from a generated study session.
 */
export function createSessionHistoryRecord(
  session: StudySession
): SessionHistoryRecord {
  return {
    sessionId: session.sessionId,
    createdAt: session.createdAt,
    completedAt: null,
    exerciseIds: session.exercises.map((ex) => ex.exerciseId),
    difficultyDistribution: session.metadata.difficultyDistribution,
    categoryDistribution: session.metadata.categoryDistribution,
    results: null,
    trainingObjective: session.metadata.trainingObjective,
    objectivePhase: session.metadata.objectivePhase,
    objectiveStatus: session.metadata.objectiveStatus,
    objectiveProgressVerdict: session.metadata.objectiveProgressVerdict,
    objectiveDecision: session.metadata.objectiveDecision,
    objectiveEscalationVerdict: session.metadata.objectiveEscalationVerdict,
    objectiveEscalationReason: session.metadata.objectiveEscalationReason,
    objectiveEscalationStrength: session.metadata.objectiveEscalationStrength,
    objectiveRecommendedAction: session.metadata.objectiveRecommendedAction,
    objectiveRecommendedPhaseChange: session.metadata.objectiveRecommendedPhaseChange,
    objectiveRecommendedObjective: session.metadata.objectiveRecommendedObjective,
    objectiveEscalationSummary: session.metadata.objectiveEscalationSummary,
    objectivePortfolioStatus: session.metadata.objectivePortfolioStatus,
    objectivePortfolioPriority: session.metadata.objectivePortfolioPriority,
    objectivePortfolioRotationWeight: session.metadata.objectivePortfolioRotationWeight,
    objectiveTrainingShare: session.metadata.objectiveTrainingShare,
    objectivePortfolioRank: session.metadata.objectivePortfolioRank,
    objectiveStartedAt: session.metadata.objectiveStartedAt,
    objectiveInterventionType: session.metadata.objectiveInterventionType,
    objectiveRecommendationStrength: session.metadata.objectiveRecommendationStrength,
    objectiveInterventionStartedAt: session.metadata.objectiveInterventionStartedAt,
    priorInterventionOutcome: session.metadata.priorInterventionOutcome,
    interventionRecommendedAction: session.metadata.interventionRecommendedAction,
    interventionRecommendedType: session.metadata.interventionRecommendedType,
    interventionRepeatedPatternFlag: session.metadata.interventionRepeatedPatternFlag,
    interventionCompareSummary: session.metadata.interventionCompareSummary,
  };
}

/**
 * Create a completion record to append when results are recorded.
 */
export function createCompletionRecord(
  sessionId: string,
  completedAt: string,
  exerciseIds: string[],
  results: SessionExerciseResult[]
): SessionHistoryRecord {
  return {
    sessionId,
    createdAt: completedAt,
    completedAt,
    exerciseIds,
    difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
    categoryDistribution: {},
    results,
  };
}







