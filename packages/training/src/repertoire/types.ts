import type { OpeningFamily } from "../openings/types.js";

export type RepertoireSide = "white" | "black";

export type DeviationActor = "user" | "opponent" | "none";

export type DeviationType =
  | "memory_miss"
  | "opponent_sideline"
  | "concept_misunderstanding"
  | "acceptable_improv"
  | "unknown_deviation";

export type TransferFailureType =
  | "memory_miss"
  | "concept_misunderstanding"
  | "opponent_sideline_mishandling"
  | "acceptable_improv_late_collapse"
  | "post_opening_transition_failure"
  | "stable";

export type DrillVsGameGap =
  | "line_breaks_before_book_depth"
  | "line_holds_then_collapses_in_games"
  | "concept_gap_over_memory_gap"
  | "stable_in_games"
  | "insufficient_evidence";

export type DrillVsGameComparison =
  | "studied_and_stable"
  | "studied_but_failed_otb"
  | "rarely_reviewed_and_failed"
  | "concept_gap_more_than_memory_gap"
  | "insufficient_evidence";

export type SpacedReviewBucket =
  | "immediate"
  | "short_term"
  | "warm"
  | "stable";

export type RepertoireRecallGrade =
  | "exact_recall"
  | "acceptable_recall"
  | "partial_recall"
  | "failed_recall";

export type SourceGameResult = "win" | "loss" | "draw" | "unknown";

export interface RepertoireLine {
  lineId: string;
  lineName: string;
  openingFamily: OpeningFamily;
  canonicalMoves: string[];
  sourceCourse: string;
  sourceTags: string[];
  conceptMappings: string[];
  priorityWeight: number;
  reviewPriority: number;
  intendedPositions: string[];
  criticalJunctions: number[];
}

export interface RepertoireDefinition {
  repertoireKey: string;
  repertoireName: string;
  repertoireSide: RepertoireSide;
  sourceCourse: string;
  sourceTags: string[];
  openingFamilies: OpeningFamily[];
  conceptMappings: string[];
  priorityWeight: number;
  reviewPriority: number;
  intendedPositions: string[];
  criticalJunctions: Array<{
    lineId: string;
    ply: number;
    move: string;
    note: string;
  }>;
  lineTree: RepertoireLine[];
}

export interface RepertoireMap {
  generatedAt: string;
  repertoires: RepertoireDefinition[];
  lineIndex: Record<
    string,
    {
      repertoireKey: string;
      repertoireName: string;
      repertoireSide: RepertoireSide;
      openingFamily: OpeningFamily;
      sourceCourse: string;
      priorityWeight: number;
      reviewPriority: number;
      criticalDepth: number;
    }
  >;
}

export interface RepertoireSourceGame {
  sourceGameId: string;
  sourceMoves: string[];
  sourceResult: SourceGameResult;
}

export interface RepertoireComparison {
  sourceGameId: string;
  repertoireKey: string | null;
  repertoireName: string | null;
  repertoireSide: RepertoireSide | null;
  openingFamily: OpeningFamily | null;
  lineId: string | null;
  lineName: string | null;
  sourceMoves: string[];
  matchedMoves: string[];
  inBookDepth: number;
  maxBookDepth: number;
  stayedOnPath: boolean;
  firstDeviationPly: number | null;
  firstDeviationMove: string | null;
  deviationActor: DeviationActor;
  deviationType: DeviationType;
  deviationReason: string;
  firstBadMomentPly: number | null;
  firstBadMomentMove: string | null;
  firstBadMomentReason: string;
  transferFailureType: TransferFailureType;
  lineRecallConfidence: number;
  conceptFailure: string | null;
  reviewPriority: number;
  conceptMappings: string[];
  sourceResult: SourceGameResult;
  userScore: number | null;
  openingMistakeCount: number;
  openingMistakeThemes: string[];
  recoveryAfterDeviation: boolean | null;
}

export interface RepertoireHealthEntry {
  repertoireKey: string;
  repertoireName: string;
  repertoireSide: RepertoireSide;
  games: number;
  averageInBookDepth: number;
  deviationRate: number;
  memoryMissRate: number;
  score: number;
  reviewPriority: number;
}

export interface RepertoireReviewEntry {
  repertoireKey: string;
  repertoireName: string;
  lineId: string;
  lineName: string;
  openingFamily: OpeningFamily;
  reviewPriority: number;
  failureCount: number;
  memoryMissCount: number;
  conceptMissCount: number;
  opponentSidelineCount: number;
  averageInBookDepth: number;
  sourceGameIds: string[];
  conceptMappings: string[];
  recommendedAction: string;
}

export interface RepertoireReviewReport {
  generatedAt: string;
  comparisons: RepertoireComparison[];
  currentRepertoireHealth: RepertoireHealthEntry[];
  topLinesToReview: RepertoireReviewEntry[];
  firstDeviationPatterns: Array<{
    deviationType: DeviationType;
    count: number;
    lines: string[];
  }>;
  recommendedFocuses: string[];
}

export interface RepertoireTransferReport {
  generatedAt: string;
  summary: {
    gamesMatched: number;
    averageInBookDepth: number;
    deviationRate: number;
    memoryMissRate: number;
    averagePostDeviationPerformance: number;
    recoveryAfterDeviationRate: number;
  };
  repertoireBuckets: Array<{
    repertoireKey: string;
    repertoireName: string;
    repertoireSide: RepertoireSide;
    games: number;
    averageInBookDepth: number;
    score: number;
    deviationRate: number;
    memoryMissRate: number;
    reviewPriority: number;
  }>;
  openingFamilyScores: Array<{
    openingFamily: OpeningFamily;
    games: number;
    score: number;
    deviationRate: number;
  }>;
  weakestBuckets: Array<{
    bucketKey: string;
    label: string;
    score: number;
    reason: string;
  }>;
}

export interface RepertoireTransferCoachingEntry {
  repertoireKey: string;
  repertoireName: string;
  openingFamily: OpeningFamily;
  lineId: string;
  lineName: string;
  firstBadMomentMove: string | null;
  firstBadMomentPly: number | null;
  firstBadMomentReason: string;
  deviationType: DeviationType;
  deviationActor: DeviationActor;
  transferFailureType: TransferFailureType;
  lineRecallConfidence: number;
  conceptFailure: string | null;
  drillVsGameGap: DrillVsGameGap;
  recommendedReviewLine: string;
  recommendedConceptFocus: string | null;
  coachingSummary: string;
  urgency: number;
  sourceGameIds: string[];
}

export interface RepertoireTransferCoachingReport {
  generatedAt: string;
  entries: RepertoireTransferCoachingEntry[];
  fragileLines: RepertoireTransferCoachingEntry[];
  topActions: Array<{
    repertoireKey: string;
    lineId: string;
    lineName: string;
    urgency: number;
    action: string;
  }>;
  drillVsGameGaps: Array<{
    gap: DrillVsGameGap;
    count: number;
    lines: string[];
  }>;
  conceptReinforcements: Array<{
    concept: string;
    count: number;
    lines: string[];
  }>;
  summary: {
    matchedLines: number;
    unstableLines: number;
    averageLineRecallConfidence: number;
  };
}

export interface RepertoireDrillMemoryEntry {
  repertoireKey: string;
  repertoireName: string;
  lineId: string;
  lineKey: string;
  lineName: string;
  sourceCourse: string;
  sourceOpeningFamily: OpeningFamily;
  reviewCount: number;
  successCount: number;
  failureCount: number;
  otbFailureCount: number;
  recallConfidence: number;
  forgettingRisk: number;
  stabilityScore: number;
  lastReviewedAt: string | null;
  lastCorrectAt: string | null;
  lastIncorrectAt: string | null;
  nextRecommendedReviewAt: string | null;
  spacedReviewBucket: SpacedReviewBucket;
  conceptLinkedWeaknesses: string[];
  drillVsGameComparison: DrillVsGameComparison;
  sourceGameIds: string[];
}

export interface RepertoireDrillMemoryReport {
  generatedAt: string;
  entries: RepertoireDrillMemoryEntry[];
  fragileLines: RepertoireDrillMemoryEntry[];
  strongestLines: RepertoireDrillMemoryEntry[];
  atRiskLines: RepertoireDrillMemoryEntry[];
  drillVsGameComparisons: Array<{
    comparison: DrillVsGameComparison;
    count: number;
    lines: string[];
  }>;
  summary: {
    lineCount: number;
    reviewedLineCount: number;
    averageRecallConfidence: number;
    averageForgettingRisk: number;
  };
}

export interface RepertoireDrillQueueEntry {
  repertoireKey: string;
  repertoireName: string;
  lineId: string;
  lineName: string;
  urgency: number;
  nextRecommendedReviewAt: string | null;
  recallConfidence: number;
  forgettingRisk: number;
  stabilityScore: number;
  drillVsGameComparison: DrillVsGameComparison;
  recommendedAction: string;
  conceptLinkedWeaknesses: string[];
}

export interface RepertoireDrillQueueReport {
  generatedAt: string;
  entries: RepertoireDrillQueueEntry[];
  strongestLines: Array<{
    lineId: string;
    lineName: string;
    recallConfidence: number;
    stabilityScore: number;
  }>;
  nextLinesToReview: Array<{
    lineId: string;
    lineName: string;
    nextRecommendedReviewAt: string | null;
    urgency: number;
  }>;
  summary: {
    queueSize: number;
    immediateCount: number;
    stableCount: number;
  };
}

export interface RepertoireDrillExercise {
  lineId: string;
  lineKey: string;
  repertoireKey: string;
  repertoireName: string;
  lineName: string;
  sourceOpeningFamily: OpeningFamily;
  presentedLine: string[];
  expectedContinuation: string[];
  conceptLinkedWeaknesses: string[];
  nextRecommendedReviewAt: string | null;
}

export interface RepertoireDrillSession {
  drillSessionId: string;
  generatedAt: string;
  completedAt: string | null;
  sessionSize: number;
  currentIndex: number;
  exercises: RepertoireDrillExercise[];
  results: RepertoireDrillEvent[];
}

export interface RepertoireDrillEvent {
  drillSessionId: string;
  repertoireKey: string;
  lineId: string;
  lineKey: string;
  presentedLine: string[];
  expectedContinuation: string[];
  userResponse: string[];
  recallGrade: RepertoireRecallGrade;
  correctness: boolean;
  confidence: number;
  reviewedAt: string;
  nextRecommendedReviewAt: string | null;
  spacedReviewBucket: SpacedReviewBucket;
  conceptLinkedWeaknesses: string[];
  sourceOpeningFamily: OpeningFamily;
}

export interface RepertoireDrillSessionSummary {
  drillSessionId: string;
  generatedAt: string;
  completedAt: string | null;
  sessionSize: number;
  completedCount: number;
  exactCount: number;
  acceptableCount: number;
  partialCount: number;
  failedCount: number;
}

export type RepertoireRepairType =
  | "memory_repair"
  | "concept_repair"
  | "post_deviation_transition_repair"
  | "opening_family_repair";

export type RepertoireRepairUrgency = "low" | "medium" | "high";

export type RepairOutcomeVerdict =
  | "repaired_and_transferred"
  | "repaired_but_not_yet_transferred"
  | "improved_in_drills_but_failed_in_games"
  | "still_failing_in_drills"
  | "insufficient_followup_evidence";

export type RepairOutcomeStrength = "low" | "medium" | "high";

export type RepairFollowupGameOutcome = TransferFailureType | "not_seen";

export interface RepertoireRepairEntry {
  sourceGameId: string;
  repertoireKey: string;
  repertoireName: string;
  lineId: string;
  lineName: string;
  firstBadMomentMove: string | null;
  firstBadMomentPly: number | null;
  firstBadMomentReason: string;
  deviationType: DeviationType;
  conceptFailure: string | null;
  repairType: RepertoireRepairType;
  repairUrgency: RepertoireRepairUrgency;
  urgencyScore: number;
  recommendedReviewLine: string;
  recommendedConceptFocus: string | null;
  scheduledDrillLine: string;
  scheduledDrillReason: string;
  sourceOpeningFamily: OpeningFamily;
  sourceSignals: string[];
}

export interface RepertoireRepairReport {
  generatedAt: string;
  urgentGames: RepertoireRepairEntry[];
  repairByType: Array<{
    repairType: RepertoireRepairType;
    count: number;
    lines: string[];
  }>;
  conceptLinkedRepairs: Array<{
    concept: string;
    count: number;
    lines: string[];
  }>;
  scheduledDrills: Array<{
    lineId: string;
    lineName: string;
    scheduledDrillReason: string;
    urgencyScore: number;
  }>;
  summary: {
    repairCount: number;
    urgentCount: number;
    averageUrgency: number;
  };
}

export interface RepertoireRepairQueueEntry {
  sourceGameId: string;
  repertoireKey: string;
  repertoireName: string;
  lineId: string;
  lineName: string;
  repairType: RepertoireRepairType;
  repairUrgency: RepertoireRepairUrgency;
  urgencyScore: number;
  recommendedReviewLine: string;
  recommendedConceptFocus: string | null;
  scheduledDrillLine: string;
  scheduledDrillReason: string;
  nextRecommendedReviewAt: string | null;
  firstBadMomentMove: string | null;
  firstBadMomentPly: number | null;
  sourceOpeningFamily: OpeningFamily;
}

export interface RepertoireRepairQueueReport {
  generatedAt: string;
  entries: RepertoireRepairQueueEntry[];
  topRepairLines: Array<{
    lineId: string;
    lineName: string;
    urgencyScore: number;
    scheduledDrillReason: string;
  }>;
  urgentGames: Array<{
    sourceGameId: string;
    lineName: string;
    repairType: RepertoireRepairType;
    urgencyScore: number;
  }>;
  summary: {
    queueSize: number;
    immediateRepairCount: number;
    conceptRepairCount: number;
  };
}

export interface RepertoireRepairOutcomeEntry {
  sourceGameId: string;
  repertoireKey: string;
  repertoireName: string;
  lineId: string;
  lineName: string;
  repairId: string;
  repairScheduledAt: string;
  repairDrilledAt: string | null;
  reDrilledAt: string | null;
  nextGameSeenAt: string | null;
  drillOutcome: RepertoireRecallGrade | "not_drilled";
  reDrillOutcome: RepertoireRecallGrade | "not_re_drilled";
  nextGameOutcome: RepairFollowupGameOutcome;
  transferImproved: boolean;
  transferStillFragile: boolean;
  outcomeVerdict: RepairOutcomeVerdict;
  outcomeReason: string;
  outcomeStrength: RepairOutcomeStrength;
  nextAction: string;
  urgency: number;
  sourceSignals: string[];
}

export interface RepertoireRepairOutcomesReport {
  generatedAt: string;
  entries: RepertoireRepairOutcomeEntry[];
  recentlyRepairedLines: RepertoireRepairOutcomeEntry[];
  repairsThatWorked: RepertoireRepairOutcomeEntry[];
  repairsStillFragile: RepertoireRepairOutcomeEntry[];
  nextActions: Array<{
    repairId: string;
    lineId: string;
    lineName: string;
    outcomeVerdict: RepairOutcomeVerdict;
    urgency: number;
    nextAction: string;
  }>;
  summary: {
    trackedRepairs: number;
    transferredRepairs: number;
    fragileRepairs: number;
    averageUrgency: number;
  };
}
