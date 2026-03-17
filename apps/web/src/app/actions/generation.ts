"use server";

import { appendFile, mkdir, readFile, readdir } from "fs/promises";
import { basename, extname, join } from "path";
import { atomicWriteFile } from "@chess-os/db";
import { parsePgnMoves } from "@chess-os/chess-core";
import {
  applyInterventionEffectivenessToCoaching,
  buildCoachingSummary,
  buildCompositionRationale,
  buildConceptGraph,
  buildCurriculumPlan,
  buildFocusRecommendations,
  buildIntelligenceReport,
  buildInterventionSignalSnapshotSeed,
  buildLearnerOverview,
  buildLearningPriorityLookup,
  buildMistakePatterns,
  buildMixedSession,
  buildObjectiveBias,
  buildObjectiveSelectionSnapshot,
  buildObjectiveSessionEvidence,
  buildOpeningReport,
  buildPatternIntelligence,
  buildPatternLibrary,
  buildReadinessForecast,
  buildRepertoireMap,
  buildRepertoireReview,
  buildRepertoireTransfer,
  buildRepertoireTransferCoaching,
  buildRepertoireDrillMemory,
  buildRepertoireDrillQueue,
  buildRepertoireRepair,
  buildRepertoireRepairOutcomes,
  buildRepertoireRepairQueue,
  buildReviewQueue,
  buildReviewReport,
  buildSessionSnapshots,
  buildStudyPlan,
  buildStudySession,
  buildTrendProfile,
  buildTrendReport,
  buildWeaknessProfile,
  classifyOpening,
  compareGamesToRepertoire,
  computeDifficultyCalibration,
  computeDifficultyPolicy,
  computeRecencyWeights,
  createSessionHistoryRecord,
  DEFAULT_SESSION_CONFIG,
  deriveConceptState,
  deriveInterventionEffectiveness,
  deriveInterventionHistory,
  deriveInterventionMemory,
  deriveLearningModel,
  deriveObjectiveCoaching,
  deriveObjectiveCurriculumState,
  deriveObjectiveEscalation,
  deriveObjectiveHistory,
  deriveObjectiveLifecycle,
  deriveObjectivePortfolio,
  determineTrendDirections,
  extractTrendWeights,
  formatConceptGraphMd,
  formatConceptStateMd,
  formatInterventionEffectivenessMd,
  formatLearningModelMd,
  formatObjectiveCoachingMd,
  formatObjectiveEscalationMd,
  formatObjectivePortfolioMd,
  formatOpeningReportMd,
  formatOpeningMistakesMd,
  formatRepertoireMapMd,
  formatRepertoireReviewMd,
  formatRepertoireTransferMd,
  formatRepertoireTransferCoachingMd,
  formatRepertoireDrillMemoryMd,
  formatRepertoireDrillQueueMd,
  formatRepertoireRepairMd,
  formatRepertoireRepairOutcomesMd,
  formatRepertoireRepairQueueMd,
  formatSessionMd,
  formatTrendSummaryMd,
  initProgressStore,
  markExercisesSeen,
  mergeProgressStore,
  prioritizeExercisesForObjectiveCoaching,
  rankAdaptiveCandidates,
  rankExercisesForObjective,
  refreshDueStatus,
  selectTrainingObjective,
  serializeProgressStore,
  diagnoseGameLoss,
} from "@chess-os/training";
import type {
  ObjectiveSessionEvidence,
  ProgressStore,
  ReviewSessionRequest,
  SessionAnalytics,
  SessionConfig,
  SessionPerspective,
  StudySession,
  TrainingDatasetRow,
} from "@chess-os/training";
import {
  loadAllStudySessionsRaw,
  loadAnalyticsMap,
  loadExerciseCorpusRaw,
  loadHistoryRecords,
  loadObjectiveProgressRaw,
  loadProgressStoreRaw,
  loadRepertoireDrillEventsRaw,
  loadRepertoireRepairOutcomesRaw,
  loadRepertoireDrillSessionsRaw,
  OUT,
} from "@/lib/generation-server";

export interface GenerateSessionResult {
  success: boolean;
  sessionId: string | null;
  exerciseCount: number;
  error: string | null;
}

function filterExercisesForPerspective(
  exercises: Awaited<ReturnType<typeof loadExerciseCorpusRaw>>,
  perspective: SessionPerspective
) {
  if (perspective === "both") return exercises;
  const exact = exercises.filter((exercise) => exercise.perspective === perspective);
  if (exact.length > 0) return exact;
  if (perspective === "hero") {
    const fallback = exercises.filter((exercise) => exercise.perspective !== "opponent");
    if (fallback.length > 0) return fallback;
  }
  return [];
}

export interface RefreshInsightsResult {
  success: boolean;
  error: string | null;
}

let generating = false;
let refreshing = false;

function collectObjectiveEvidence(
  history: Awaited<ReturnType<typeof loadHistoryRecords>>,
  sessions: StudySession[],
  analyticsMap: Record<string, SessionAnalytics> | null
): ObjectiveSessionEvidence[] {
  if (!analyticsMap) return [];

  const completionMap = new Map<string, string>();
  for (const entry of history) {
    if (entry.completedAt && entry.results) {
      completionMap.set(entry.sessionId, entry.completedAt);
    }
  }

  const evidence: ObjectiveSessionEvidence[] = [];
  for (const session of sessions) {
    const analytics = analyticsMap[session.sessionId];
    const completedAt = completionMap.get(session.sessionId);
    if (!analytics || !completedAt) continue;
    const entry = buildObjectiveSessionEvidence({
      sessionId: session.sessionId,
      completedAt,
      trainingObjective: session.metadata.trainingObjective,
      objectivePhase: session.metadata.objectivePhase,
      objectiveStatus: session.metadata.objectiveStatus,
      objectiveProgressVerdict: session.metadata.objectiveProgressVerdict,
      objectiveDecision: session.metadata.objectiveDecision,
      objectiveEscalationVerdict: session.metadata.objectiveEscalationVerdict,
      objectiveEscalationStrength: session.metadata.objectiveEscalationStrength,
      objectiveInterventionType: session.metadata.objectiveInterventionType,
      objectiveInterventionStartedAt: session.metadata.objectiveInterventionStartedAt,
      objectiveRecommendationStrength: session.metadata.objectiveRecommendationStrength,
      analytics,
    });
    if (entry) {
      evidence.push(entry);
    }
  }

  evidence.sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  return evidence;
}


function metricValue(
  coaching: Awaited<ReturnType<typeof buildObjectiveLifecycleBundle>>["objectiveCoaching"],
  key: string
): number {
  const signal = [...coaching.failedSignals, ...coaching.supportingSignals].find((entry) => entry.key === key);
  return signal?.currentValue ?? 0;
}

function buildSessionInterventionSnapshot(args: {
  objective: Awaited<ReturnType<typeof buildObjectiveLifecycleBundle>>["objective"];
  objectiveProgress: Awaited<ReturnType<typeof buildObjectiveLifecycleBundle>>["objectiveProgress"];
  objectiveCoaching: Awaited<ReturnType<typeof buildObjectiveLifecycleBundle>>["objectiveCoaching"];
  readinessState: Awaited<ReturnType<typeof buildObjectiveLifecycleBundle>>["readiness"]["state"];
  patternIntelligence: Awaited<ReturnType<typeof buildObjectiveLifecycleBundle>>["patternIntelligence"];
}) {
  const bias = buildObjectiveBias(args.objective);
  const relevantCategories = new Set(Object.keys(bias.categoryBoosts));
  const patternRecurrence = args.patternIntelligence.recurrenceEntries
    .filter((entry) => relevantCategories.has(entry.category))
    .map((entry) => ({
      category: entry.category,
      severity: entry.severity,
      recurrenceScore: entry.recurrenceScore,
      isRecurring: entry.isRecurring,
    }));

  return buildInterventionSignalSnapshotSeed({
    readinessState: args.readinessState,
    reviewBurdenShare: metricValue(args.objectiveCoaching, "objective_review_burden"),
    recurrencePressure: metricValue(args.objectiveCoaching, "objective_recurrence_pressure"),
    patternRecurrence,
    objectivePerformanceSignals: args.objectiveProgress.successSignalSnapshots,
  });
}
function deriveInterventionStartedAt(
  sessions: StudySession[],
  objective: string,
  interventionType: string,
  now: string
): string {
  const chronological = [...sessions].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const trailing: StudySession[] = [];

  for (let index = chronological.length - 1; index >= 0; index -= 1) {
    const session = chronological[index];
    if (session.metadata.trainingObjective !== objective) {
      if (trailing.length > 0) break;
      continue;
    }
    if (session.metadata.objectiveInterventionType !== interventionType) {
      if (trailing.length > 0) break;
      continue;
    }
    trailing.unshift(session);
  }

  if (trailing.length === 0) return now;
  return trailing[0].metadata.objectiveInterventionStartedAt ?? trailing[0].createdAt;
}

interface PgnOpeningSource {
  gameId: string;
  moves: string[];
  result: "1-0" | "0-1" | "1/2-1/2" | "*";
}

function parsePgnResult(raw: string): PgnOpeningSource["result"] {
  const match = raw.match(/^\[Result\s+"([^"]+)"\]/m);
  const value = match?.[1];
  if (value === "1-0" || value === "0-1" || value === "1/2-1/2") return value;
  return "*";
}

function toSourceGameResult(result: PgnOpeningSource["result"]): "win" | "loss" | "draw" | "unknown" {
  if (result === "1-0") return "win";
  if (result === "0-1") return "loss";
  if (result === "1/2-1/2") return "draw";
  return "unknown";
}

async function loadPgnOpeningSources(): Promise<PgnOpeningSource[]> {
  const pgnDir = join(process.cwd(), "data", "pgn");
  try {
    const entries = await readdir(pgnDir, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".pgn");
    const sources: PgnOpeningSource[] = [];
    for (const file of files) {
      const gameId = basename(file.name, extname(file.name));
      const raw = await readFile(join(pgnDir, file.name), "utf-8");
      const moves = parsePgnMoves(raw).map((entry) => entry.move);
      sources.push({ gameId, moves, result: parsePgnResult(raw) });
    }
    return sources.sort((a, b) => a.gameId.localeCompare(b.gameId));
  } catch {
    return [];
  }
}

async function buildProductIntelligenceArtifacts(args: {
  now: string;
  exercises: Awaited<ReturnType<typeof loadExerciseCorpusRaw>>;
  store: ProgressStore;
  history: Awaited<ReturnType<typeof loadHistoryRecords>>;
}) {
  const conceptGraph = buildConceptGraph(args.now);
  const repertoireMap = buildRepertoireMap(args.now);
  const openingSources = await loadPgnOpeningSources();
  const drillEvents = await loadRepertoireDrillEventsRaw();
  const priorRepairOutcomes = await loadRepertoireRepairOutcomesRaw();
  const classifications = openingSources.map((source) => classifyOpening(source.gameId, source.moves));
  const openingLookup = {
    byGameId: Object.fromEntries(classifications.map((entry) => [entry.sourceGameId, entry.openingFamily])),
  };
  const learningModel = deriveLearningModel({
    generatedAt: args.now,
    exercises: args.exercises,
    store: args.store,
    history: args.history,
    conceptGraph,
    openingLookup,
  });
  const conceptState = deriveConceptState(conceptGraph, learningModel);
  const openingArtifacts = buildOpeningReport({
    generatedAt: args.now,
    classifications,
    exercises: args.exercises,
  });
  const repertoireComparisons = compareGamesToRepertoire({
    repertoireMap,
    sourceGames: openingSources.map((source) => ({
      sourceGameId: source.gameId,
      sourceMoves: source.moves,
      sourceResult: toSourceGameResult(source.result),
    })),
    classifications,
    openingMistakes: openingArtifacts.mistakes,
  });
  const repertoireReview = buildRepertoireReview({
    generatedAt: args.now,
    comparisons: repertoireComparisons,
  });
  const repertoireTransfer = buildRepertoireTransfer({
    generatedAt: args.now,
    comparisons: repertoireComparisons,
  });
  const repertoireDrillMemory = buildRepertoireDrillMemory({
    generatedAt: args.now,
    repertoireMap,
    review: repertoireReview,
    transfer: repertoireTransfer,
    drillEvents,
  });
  const repertoireTransferCoaching = buildRepertoireTransferCoaching({
    generatedAt: args.now,
    review: repertoireReview,
    transfer: repertoireTransfer,
    drillMemory: repertoireDrillMemory,
  });
  const repertoireRepair = buildRepertoireRepair({
    generatedAt: args.now,
    comparisons: repertoireComparisons,
    transferCoaching: repertoireTransferCoaching,
    drillMemory: repertoireDrillMemory,
  });
  const repertoireRepairQueue = buildRepertoireRepairQueue({
    generatedAt: args.now,
    repair: repertoireRepair,
    drillMemory: repertoireDrillMemory,
  });
  const repertoireRepairOutcomes = buildRepertoireRepairOutcomes({
    generatedAt: args.now,
    repair: repertoireRepair,
    comparisons: repertoireComparisons,
    drillEvents,
    priorHistory: priorRepairOutcomes,
  });
  const repertoireDrillQueue = buildRepertoireDrillQueue({
    generatedAt: args.now,
    memory: repertoireDrillMemory,
    repairQueue: repertoireRepairQueue,
    repairOutcomes: repertoireRepairOutcomes,
  });
  const learningPriority = buildLearningPriorityLookup(args.exercises, conceptGraph, learningModel, openingLookup);

  return {
    conceptGraph,
    conceptState,
    learningModel,
    openingLookup,
    learningPriority,
    openingReport: openingArtifacts.report,
    openingMistakes: openingArtifacts.mistakes,
    repertoireMap,
    repertoireReview,
    repertoireTransfer,
    repertoireDrillMemory,
    repertoireDrillQueue,
    repertoireTransferCoaching,
    repertoireRepair,
    repertoireRepairQueue,
    repertoireRepairOutcomes,
  };
}

async function persistProductIntelligenceArtifacts(
  intelligence: Awaited<ReturnType<typeof buildProductIntelligenceArtifacts>>
) {
  const learningDir = join(OUT, "learning");
  const conceptsDir = join(OUT, "concepts");
  const openingsDir = join(OUT, "openings");
  const repertoireDir = join(OUT, "repertoire");
  const [drillEvents, drillSessions] = await Promise.all([
    loadRepertoireDrillEventsRaw(),
    loadRepertoireDrillSessionsRaw(),
  ]);

  await Promise.all([
    atomicWriteFile(join(learningDir, "learning-model.json"), JSON.stringify(intelligence.learningModel, null, 2)),
    atomicWriteFile(join(learningDir, "learning-model.md"), formatLearningModelMd(intelligence.learningModel)),
    atomicWriteFile(join(conceptsDir, "concept-graph.json"), JSON.stringify(intelligence.conceptGraph, null, 2)),
    atomicWriteFile(join(conceptsDir, "concept-graph.md"), formatConceptGraphMd(intelligence.conceptGraph)),
    atomicWriteFile(join(conceptsDir, "concept-state.json"), JSON.stringify(intelligence.conceptState, null, 2)),
    atomicWriteFile(join(conceptsDir, "concept-state.md"), formatConceptStateMd(intelligence.conceptState)),
    atomicWriteFile(join(openingsDir, "opening-report.json"), JSON.stringify(intelligence.openingReport, null, 2)),
    atomicWriteFile(join(openingsDir, "opening-report.md"), formatOpeningReportMd(intelligence.openingReport, intelligence.openingMistakes)),
    atomicWriteFile(join(openingsDir, "opening-mistakes.json"), JSON.stringify(intelligence.openingMistakes, null, 2)),
    atomicWriteFile(join(openingsDir, "opening-mistakes.md"), formatOpeningMistakesMd(intelligence.openingMistakes)),
    atomicWriteFile(join(repertoireDir, "repertoire-map.json"), JSON.stringify(intelligence.repertoireMap, null, 2)),
    atomicWriteFile(join(repertoireDir, "repertoire-map.md"), formatRepertoireMapMd(intelligence.repertoireMap)),
    atomicWriteFile(join(repertoireDir, "repertoire-review.json"), JSON.stringify(intelligence.repertoireReview, null, 2)),
    atomicWriteFile(join(repertoireDir, "repertoire-review.md"), formatRepertoireReviewMd(intelligence.repertoireReview)),
    atomicWriteFile(join(repertoireDir, "repertoire-transfer.json"), JSON.stringify(intelligence.repertoireTransfer, null, 2)),
    atomicWriteFile(join(repertoireDir, "repertoire-transfer.md"), formatRepertoireTransferMd(intelligence.repertoireTransfer)),
    atomicWriteFile(join(repertoireDir, "repertoire-drill-memory.json"), JSON.stringify(intelligence.repertoireDrillMemory, null, 2)),
    atomicWriteFile(join(repertoireDir, "repertoire-drill-memory.md"), formatRepertoireDrillMemoryMd(intelligence.repertoireDrillMemory)),
    atomicWriteFile(join(repertoireDir, "repertoire-drill-queue.json"), JSON.stringify(intelligence.repertoireDrillQueue, null, 2)),
    atomicWriteFile(join(repertoireDir, "repertoire-drill-queue.md"), formatRepertoireDrillQueueMd(intelligence.repertoireDrillQueue)),
    atomicWriteFile(join(repertoireDir, "repertoire-repair.json"), JSON.stringify(intelligence.repertoireRepair, null, 2)),
    atomicWriteFile(join(repertoireDir, "repertoire-repair.md"), formatRepertoireRepairMd(intelligence.repertoireRepair)),
    atomicWriteFile(join(repertoireDir, "repertoire-repair-queue.json"), JSON.stringify(intelligence.repertoireRepairQueue, null, 2)),
    atomicWriteFile(join(repertoireDir, "repertoire-repair-queue.md"), formatRepertoireRepairQueueMd(intelligence.repertoireRepairQueue)),
    atomicWriteFile(join(repertoireDir, "repertoire-repair-outcomes.json"), JSON.stringify(intelligence.repertoireRepairOutcomes, null, 2)),
    atomicWriteFile(join(repertoireDir, "repertoire-repair-outcomes.md"), formatRepertoireRepairOutcomesMd(intelligence.repertoireRepairOutcomes)),
    atomicWriteFile(
      join(repertoireDir, "repertoire-repair-history.jsonl"),
      intelligence.repertoireRepairOutcomes.entries.map((entry) => JSON.stringify(entry)).join("\n") + (intelligence.repertoireRepairOutcomes.entries.length > 0 ? "\n" : "")
    ),
    atomicWriteFile(join(repertoireDir, "repertoire-drill-sessions.json"), JSON.stringify(drillSessions, null, 2)),
    atomicWriteFile(
      join(repertoireDir, "repertoire-drill-events.jsonl"),
      drillEvents.map((entry) => JSON.stringify(entry)).join("\n") + (drillEvents.length > 0 ? "\n" : "")
    ),
    atomicWriteFile(join(repertoireDir, "repertoire-transfer-coaching.json"), JSON.stringify(intelligence.repertoireTransferCoaching, null, 2)),
    atomicWriteFile(join(repertoireDir, "repertoire-transfer-coaching.md"), formatRepertoireTransferCoachingMd(intelligence.repertoireTransferCoaching))
  ]);
}
async function buildObjectiveLifecycleBundle(args: {
  now: string;
  store: ProgressStore;
  exercises: Awaited<ReturnType<typeof loadExerciseCorpusRaw>>;
  history: Awaited<ReturnType<typeof loadHistoryRecords>>;
  analyticsMap: Record<string, SessionAnalytics> | null;
}) {
  const trendProfile = buildTrendProfile(args.store, args.history);
  determineTrendDirections(trendProfile);
  computeRecencyWeights(trendProfile);

  const weaknessProfile = buildWeaknessProfile(args.store, args.exercises);
  const sessionSnapshots = buildSessionSnapshots(args.history);
  const baseReviewQueue = buildReviewQueue(args.store, args.now);
  const patternIntelligence = buildPatternIntelligence(args.store, trendProfile, baseReviewQueue);
  const reviewQueue = buildReviewQueue(args.store, args.now, patternIntelligence);
  const readiness = buildReadinessForecast(
    trendProfile,
    args.store,
    reviewQueue,
    patternIntelligence
  );
  const focusRecommendations = buildFocusRecommendations(args.store, trendProfile, reviewQueue);
  const overview = buildLearnerOverview(
    args.store,
    trendProfile,
    reviewQueue,
    sessionSnapshots,
    focusRecommendations
  );
  const mistakePatterns = buildMistakePatterns(args.store, trendProfile, reviewQueue);
  const curriculumPlan = buildCurriculumPlan(
    overview,
    mistakePatterns,
    trendProfile,
    reviewQueue,
    args.store,
    focusRecommendations
  );

  const selectionInput = {
    generatedAt: args.now,
    store: args.store,
    weaknessProfile,
    trendProfile,
    reviewQueue,
    readiness,
    patternIntelligence,
    curriculumState: deriveObjectiveCurriculumState(curriculumPlan),
    recentSessions: sessionSnapshots,
    focusRecommendations,
  };

  const baseObjective = selectTrainingObjective(selectionInput);
  const [priorObjectiveProgress, sessionsRaw] = await Promise.all([
    loadObjectiveProgressRaw(),
    loadAllStudySessionsRaw(),
  ]);
  const objectiveEvidence = collectObjectiveEvidence(args.history, sessionsRaw, args.analyticsMap);
  const objectiveHistory = deriveObjectiveHistory(objectiveEvidence);
  const provisionalResolution = deriveObjectiveLifecycle({
    generatedAt: args.now,
    selectionInput,
    baseSelection: baseObjective,
    sessionEvidence: objectiveEvidence,
    priorProgress: priorObjectiveProgress,
  });
  const provisionalInterventionMemory = deriveInterventionMemory({
    generatedAt: args.now,
    currentObjective: provisionalResolution.progress.currentObjective,
    sessionEvidence: objectiveEvidence,
    sessions: sessionsRaw,
  });
  const provisionalCoachingBase = deriveObjectiveCoaching({
    generatedAt: args.now,
    selectionInput,
    selection: provisionalResolution.selection,
    progress: provisionalResolution.progress,
    history: objectiveHistory,
    interventionMemory: provisionalInterventionMemory,
  });
  const provisionalInterventionEffectiveness = deriveInterventionEffectiveness({
    generatedAt: args.now,
    selectionInput,
    selection: provisionalResolution.selection,
    progress: provisionalResolution.progress,
    coaching: provisionalCoachingBase,
    sessionEvidence: objectiveEvidence,
    interventionMemory: provisionalInterventionMemory,
  });
  const objectiveEscalation = deriveObjectiveEscalation({
    generatedAt: args.now,
    selectionInput,
    selection: provisionalResolution.selection,
    progress: provisionalResolution.progress,
    history: objectiveHistory,
    interventionEffectiveness: provisionalInterventionEffectiveness,
    interventionMemory: provisionalInterventionMemory,
  });
  const objectivePortfolio = deriveObjectivePortfolio({
    generatedAt: args.now,
    selectionInput,
    candidateScores: baseObjective.candidateScores,
    objectiveHistory,
    currentObjective: provisionalResolution.progress.currentObjective,
    currentEscalation: objectiveEscalation,
    interventionMemory: provisionalInterventionMemory,
  });
  const portfolioScores = objectivePortfolio.rankedObjectives.map((entry) => ({
    objective: entry.objectiveKey,
    score: entry.portfolioPriority,
    reasons: entry.reasons,
  }));
  const portfolioActive = objectivePortfolio.rankedObjectives.find(
    (entry) => entry.objectiveKey === objectivePortfolio.activeObjective
  );
  const portfolioSelection = buildObjectiveSelectionSnapshot(
    selectionInput,
    objectivePortfolio.activeObjective,
    portfolioScores,
    portfolioActive?.currentPhase
  );
  const objectiveResolution = deriveObjectiveLifecycle({
    generatedAt: args.now,
    selectionInput,
    baseSelection: portfolioSelection,
    sessionEvidence: objectiveEvidence,
    priorProgress: priorObjectiveProgress,
    escalationOverride:
      portfolioSelection.currentObjective === objectiveEscalation.currentObjective ||
      portfolioSelection.currentObjective === objectiveEscalation.recommendedNextObjective
        ? {
            verdict: objectiveEscalation.escalationVerdict,
            reason: objectiveEscalation.escalationReason,
            strength: objectiveEscalation.escalationStrength,
            targetObjective: objectiveEscalation.recommendedNextObjective,
            targetPhase: objectiveEscalation.recommendedObjectivePhaseChange?.toPhase ?? null,
            explanation: objectiveEscalation.explanation,
          }
        : null,
  });
  const interventionMemory = deriveInterventionMemory({
    generatedAt: args.now,
    currentObjective: objectiveResolution.progress.currentObjective,
    sessionEvidence: objectiveEvidence,
    sessions: sessionsRaw,
  });
  const objectiveCoachingBase = deriveObjectiveCoaching({
    generatedAt: args.now,
    selectionInput,
    selection: objectiveResolution.selection,
    progress: objectiveResolution.progress,
    history: objectiveHistory,
    interventionMemory,
  });
  const interventionEffectiveness = deriveInterventionEffectiveness({
    generatedAt: args.now,
    selectionInput,
    selection: objectiveResolution.selection,
    progress: objectiveResolution.progress,
    coaching: objectiveCoachingBase,
    sessionEvidence: objectiveEvidence,
    interventionMemory,
  });
  const objectiveCoaching = applyInterventionEffectivenessToCoaching(
    objectiveCoachingBase,
    interventionEffectiveness
  );
  const interventionHistory = deriveInterventionHistory(interventionMemory);

  return {
    trendProfile,
    sessionSnapshots,
    patternIntelligence,
    reviewQueue,
    readiness,
    focusRecommendations,
    overview,
    mistakePatterns,
    curriculumPlan,
    objective: objectiveResolution.selection,
    objectiveProgress: objectiveResolution.progress,
    objectiveHistory,
    objectiveEscalation,
    objectivePortfolio,
    objectiveCoaching,
    interventionEffectiveness,
    interventionMemory,
    interventionHistory,
    objectiveEvidence,
    sessionsRaw,
  };
}

export async function generateNewSession(
  perspective: SessionPerspective = "hero",
  reviewRequest?: ReviewSessionRequest | null
): Promise<GenerateSessionResult> {
  if (generating) {
    return {
      success: false,
      sessionId: null,
      exerciseCount: 0,
      error: "Session generation already in progress",
    };
  }

  generating = true;
  try {
    let exercises;
    try {
      exercises = await loadExerciseCorpusRaw();
    } catch {
      return {
        success: false,
        sessionId: null,
        exerciseCount: 0,
        error: "Exercise corpus not found. Run: pnpm --filter worker run generate-exercises",
      };
    }

    if (exercises.length === 0) {
      return {
        success: false,
        sessionId: null,
        exerciseCount: 0,
        error: "Exercise corpus is empty",
      };
    }

    const perspectiveExercises = filterExercisesForPerspective(exercises, perspective);
    if (perspectiveExercises.length === 0) {
      return {
        success: false,
        sessionId: null,
        exerciseCount: 0,
        error:
          perspective === "opponent"
            ? "No opponent-side exercises are available for the current corpus."
            : "No player-side exercises are available for the current corpus.",
      };
    }

    const scores = perspectiveExercises.map((ex) => ex.explanation.difficultyScore);
    const calibration = computeDifficultyCalibration(scores);

    await atomicWriteFile(
      join(OUT, "models", "difficulty-calibration.json"),
      JSON.stringify(calibration, null, 2)
    );

    const progressDir = join(OUT, "progress");
    let store: ProgressStore;
    const existing = await loadProgressStoreRaw();
    if (existing) {
      store = mergeProgressStore(existing, perspectiveExercises, calibration);
    } else {
      store = initProgressStore(perspectiveExercises, calibration);
    }

    const now = new Date().toISOString();
    refreshDueStatus(store, now);

    const history = await loadHistoryRecords();
    const analyticsMap = await loadAnalyticsMap();
    const lifecycle = await buildObjectiveLifecycleBundle({
      now,
      store,
      exercises: perspectiveExercises,
      history,
      analyticsMap,
    });
    const intelligence = await buildProductIntelligenceArtifacts({
      now,
      exercises: perspectiveExercises,
      store,
      history,
    });

    const policy = computeDifficultyPolicy(
      lifecycle.trendProfile,
      10,
      lifecycle.readiness,
      lifecycle.patternIntelligence
    );
    const config: SessionConfig = {
      ...DEFAULT_SESSION_CONFIG,
      sessionSize: 10,
      difficultyDistribution: lifecycle.objectiveCoaching.suggestedDifficultyAdjustment.recommendedDistribution,
      exerciseTypeMix: lifecycle.objectiveCoaching.suggestedSessionMixAdjustment.recommendedMix,
    };

    const weights = extractTrendWeights(lifecycle.trendProfile);
    const prioritized = rankAdaptiveCandidates(
      perspectiveExercises,
      store,
      weights,
      lifecycle.patternIntelligence,
      intelligence.learningPriority,
      reviewRequest ?? null
    );
    const objectiveRanked = rankExercisesForObjective({
      exercises: prioritized,
      context: {
        selection: lifecycle.objective,
        bias: buildObjectiveBias(lifecycle.objective),
      },
    });
    const coachedRanked = prioritizeExercisesForObjectiveCoaching(
      objectiveRanked,
      store,
      lifecycle.reviewQueue,
      lifecycle.objectiveCoaching
    );

    const useMixed = config.exerciseTypeMix !== undefined;
    const mixedResult = useMixed
      ? buildMixedSession(coachedRanked, calibration, config, config.exerciseTypeMix, { selectedPerspective: perspective })
      : null;
    const session = mixedResult
      ? mixedResult.session
      : buildStudySession(coachedRanked, calibration, config, { selectedPerspective: perspective }).session;

    session.metadata.trainingObjective = lifecycle.objective.currentObjective;
    session.metadata.objectiveReason = lifecycle.objective.objectiveReason;
    session.metadata.objectivePhase = lifecycle.objective.objectivePhase;
    session.metadata.successSignals = lifecycle.objective.successSignals;
    session.metadata.objectiveExerciseMixRationale = lifecycle.objective.objectiveExerciseMixRationale;
    const interventionStartedAt = deriveInterventionStartedAt(
      lifecycle.sessionsRaw,
      lifecycle.objective.currentObjective,
      lifecycle.objectiveCoaching.interventionType,
      now
    );

    session.metadata.objectiveSignalSnapshot = buildSessionInterventionSnapshot({
      objective: lifecycle.objective,
      objectiveProgress: lifecycle.objectiveProgress,
      objectiveCoaching: lifecycle.objectiveCoaching,
      readinessState: lifecycle.readiness.state,
      patternIntelligence: lifecycle.patternIntelligence,
    });
    session.metadata.objectiveStatus = lifecycle.objectiveProgress.objectiveStatus;
    session.metadata.objectiveProgressVerdict = lifecycle.objectiveProgress.progressVerdict;
    session.metadata.objectiveDecision = lifecycle.objectiveProgress.lifecycleDecision;
    session.metadata.objectiveEscalationVerdict = lifecycle.objectiveEscalation.escalationVerdict;
    session.metadata.objectiveEscalationReason = lifecycle.objectiveEscalation.escalationReason;
    session.metadata.objectiveEscalationStrength = lifecycle.objectiveEscalation.escalationStrength;
    session.metadata.objectiveRecommendedAction = lifecycle.objectiveEscalation.recommendedObjectiveAction;
    session.metadata.objectiveRecommendedPhaseChange = lifecycle.objectiveEscalation.recommendedObjectivePhaseChange?.toPhase ?? null;
    session.metadata.objectiveRecommendedObjective = lifecycle.objectiveEscalation.recommendedNextObjective;
    session.metadata.objectiveEscalationSummary = lifecycle.objectiveEscalation.explanation;
    const activePortfolioEntry = lifecycle.objectivePortfolio.rankedObjectives.find((entry) => entry.objectiveKey === lifecycle.objective.currentObjective);
    session.metadata.objectivePortfolioStatus = activePortfolioEntry?.portfolioStatus;
    session.metadata.objectivePortfolioPriority = activePortfolioEntry?.portfolioPriority;
    session.metadata.objectivePortfolioRotationWeight = activePortfolioEntry?.portfolioRotationWeight;
    session.metadata.objectiveTrainingShare = activePortfolioEntry?.trainingShare;
    session.metadata.objectivePortfolioRank = lifecycle.objectivePortfolio.rankedObjectives.findIndex((entry) => entry.objectiveKey === lifecycle.objective.currentObjective) + 1;
    session.metadata.objectiveDecisionReason = lifecycle.objectiveProgress.objectiveDecisionReason;
    session.metadata.objectiveStartedAt = lifecycle.objectiveProgress.startedAt;
    session.metadata.sessionsOnObjective = lifecycle.objectiveProgress.sessionsOnObjective;
    session.metadata.objectiveInterventionType = lifecycle.objectiveCoaching.interventionType;
    session.metadata.objectiveInterventionReason = lifecycle.objectiveCoaching.interventionReason;
    session.metadata.objectiveRecommendationStrength = lifecycle.objectiveCoaching.recommendationStrength;
    session.metadata.objectiveNextSessionAdjustmentSummary = lifecycle.objectiveCoaching.nextSessionAdjustmentSummary;
    session.metadata.objectiveInterventionStartedAt = interventionStartedAt;
    session.metadata.interventionEpisodeId = lifecycle.interventionEffectiveness.interventionEpisodeId;
    session.metadata.priorInterventionOutcome = lifecycle.interventionEffectiveness.interventionOutcome;
    session.metadata.interventionRecommendedAction = lifecycle.interventionEffectiveness.recommendedAction;
    session.metadata.interventionRecommendedType = lifecycle.interventionEffectiveness.recommendedNextIntervention;
    session.metadata.interventionRepeatedPatternFlag = lifecycle.interventionEffectiveness.repeatedPatternFlag;
    session.metadata.interventionCompareSummary = lifecycle.interventionEffectiveness.compareWindows[0]?.summary;

    if (reviewRequest && reviewRequest.targetBoostStrength !== "none") {
      session.metadata.reviewTargeting = {
        sourceGameId: reviewRequest.sourceGameId,
        primaryTarget: reviewRequest.primaryTarget,
        secondaryTargets: reviewRequest.secondaryTargets,
        boostStrength: reviewRequest.targetBoostStrength,
        evidenceStatus: reviewRequest.evidenceStatus,
        coachingEmphasis: reviewRequest.coachingEmphasis ?? null,
      };
    }

    markExercisesSeen(
      store,
      session.exercises.map((ex) => ex.exerciseId),
      session.createdAt
    );

    const sessionDir = join(OUT, "sessions", session.sessionId);

    await atomicWriteFile(join(sessionDir, "study-session.json"), JSON.stringify(session, null, 2));
    await atomicWriteFile(join(sessionDir, "study-session.md"), formatSessionMd(session));

    await mkdir(progressDir, { recursive: true });
    const historyPath = join(progressDir, "session-history.jsonl");
    const historyRecord = createSessionHistoryRecord(session);
    await appendFile(historyPath, JSON.stringify(historyRecord) + "\n");

    const datasetsDir = join(OUT, "datasets");
    await mkdir(datasetsDir, { recursive: true });
    await appendFile(join(datasetsDir, "study-sessions.jsonl"), JSON.stringify(session) + "\n");

    await atomicWriteFile(join(progressDir, "exercise-progress.json"), serializeProgressStore(store));
    await atomicWriteFile(
      join(progressDir, "trend-profile.json"),
      JSON.stringify(lifecycle.trendProfile, null, 2)
    );
    await atomicWriteFile(
      join(progressDir, "difficulty-policy.json"),
      JSON.stringify(policy, null, 2)
    );
    await atomicWriteFile(
      join(progressDir, "learner-summary.md"),
      formatTrendSummaryMd(lifecycle.trendProfile, policy)
    );

    const compositionRationale = buildCompositionRationale(
      session.sessionId,
      session.exercises,
      store,
      lifecycle.patternIntelligence,
      lifecycle.readiness,
      policy,
      lifecycle.reviewQueue,
      lifecycle.objective,
      lifecycle.objectiveProgress,
      lifecycle.objectiveCoaching
    );
    const intelligenceReport = buildIntelligenceReport(
      lifecycle.patternIntelligence,
      lifecycle.readiness,
      policy,
      lifecycle.reviewQueue
    );

    const strategicDir = join(OUT, "strategic");
    const objectiveDir = join(OUT, "objective");
    const patternsDir = join(OUT, "patterns");
    const objectiveHistory = lifecycle.objectiveHistory;
    const interventionHistory = lifecycle.interventionHistory;
    const interventionMemory = lifecycle.interventionMemory;
    const objectiveEscalation = lifecycle.objectiveEscalation;
    const objectivePortfolio = lifecycle.objectivePortfolio;
    const patternLibrary = buildPatternLibrary(exercises, store);

    await Promise.all([
      atomicWriteFile(
        join(strategicDir, "pattern-intelligence.json"),
        JSON.stringify(lifecycle.patternIntelligence, null, 2)
      ),
      atomicWriteFile(
        join(strategicDir, "readiness-forecast.json"),
        JSON.stringify(lifecycle.readiness, null, 2)
      ),
      atomicWriteFile(
        join(strategicDir, "intelligence-report.json"),
        JSON.stringify(intelligenceReport, null, 2)
      ),
      atomicWriteFile(
        join(sessionDir, "composition-rationale.json"),
        JSON.stringify(compositionRationale, null, 2)
      ),
      atomicWriteFile(
        join(objectiveDir, "training-objective.json"),
        JSON.stringify(lifecycle.objective, null, 2)
      ),
      atomicWriteFile(
        join(objectiveDir, "objective-progress.json"),
        JSON.stringify(lifecycle.objectiveProgress, null, 2)
      ),
      atomicWriteFile(
        join(objectiveDir, "objective-coaching.json"),
        JSON.stringify(lifecycle.objectiveCoaching, null, 2)
      ),
      atomicWriteFile(
        join(objectiveDir, "objective-coaching.md"),
        formatObjectiveCoachingMd(lifecycle.objectiveCoaching)
      ),
      atomicWriteFile(
        join(objectiveDir, "objective-escalation.json"),
        JSON.stringify(objectiveEscalation, null, 2)
      ),
      atomicWriteFile(
        join(objectiveDir, "objective-escalation.md"),
        formatObjectiveEscalationMd(objectiveEscalation)
      ),
      atomicWriteFile(
        join(objectiveDir, "objective-portfolio.json"),
        JSON.stringify(objectivePortfolio, null, 2)
      ),
      atomicWriteFile(
        join(objectiveDir, "objective-portfolio.md"),
        formatObjectivePortfolioMd(objectivePortfolio)
      ),
      atomicWriteFile(
        join(objectiveDir, "intervention-effectiveness.json"),
        JSON.stringify(lifecycle.interventionEffectiveness, null, 2)
      ),
      atomicWriteFile(
        join(objectiveDir, "intervention-effectiveness.md"),
        formatInterventionEffectivenessMd(lifecycle.interventionEffectiveness)
      ),
      atomicWriteFile(
        join(objectiveDir, "intervention-memory.json"),
        JSON.stringify(interventionMemory, null, 2)
      ),
      atomicWriteFile(
        join(objectiveDir, "intervention-history.jsonl"),
        interventionHistory.map((entry) => JSON.stringify(entry)).join("\n") + (interventionHistory.length > 0 ? "\n" : "")
      ),
      atomicWriteFile(
        join(objectiveDir, "objective-history.jsonl"),
        objectiveHistory.map((entry) => JSON.stringify(entry)).join("\n") + (objectiveHistory.length > 0 ? "\n" : "")
      ),
      atomicWriteFile(
        join(patternsDir, "pattern-library.json"),
        JSON.stringify(patternLibrary, null, 2)
      ),
    ]);

    await persistProductIntelligenceArtifacts(intelligence);

    if (mixedResult) {
      await Promise.all([
        atomicWriteFile(
          join(sessionDir, "cognitive-exercises.json"),
          JSON.stringify(mixedResult.cognitiveExercises, null, 2)
        ),
        atomicWriteFile(
          join(sessionDir, "mix-rationale.json"),
          JSON.stringify(mixedResult.mixRationale, null, 2)
        ),
      ]);
    }

    return {
      success: true,
      sessionId: session.sessionId,
      exerciseCount: session.exerciseCount,
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      sessionId: null,
      exerciseCount: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  } finally {
    generating = false;
  }
}

export async function refreshInsights(): Promise<RefreshInsightsResult> {
  if (refreshing) {
    return { success: false, error: "Insight refresh already in progress" };
  }

  refreshing = true;
  try {
    const rawStore = await loadProgressStoreRaw();
    if (!rawStore) {
      return {
        success: false,
        error: "No progress data. Complete a study session first.",
      };
    }

    const store: ProgressStore = JSON.parse(JSON.stringify(rawStore));
    const now = new Date().toISOString();
    refreshDueStatus(store, now);

    let exercises: Awaited<ReturnType<typeof loadExerciseCorpusRaw>> = [];
    try {
      exercises = await loadExerciseCorpusRaw();
    } catch {
      exercises = [];
    }

    const history = await loadHistoryRecords();
    const analyticsMap = await loadAnalyticsMap();
    const lifecycle = await buildObjectiveLifecycleBundle({
      now,
      store,
      exercises,
      history,
      analyticsMap,
    });

    const intelligence = await buildProductIntelligenceArtifacts({
      now,
      exercises,
      store,
      history,
    });

    const policy = computeDifficultyPolicy(
      lifecycle.trendProfile,
      10,
      lifecycle.readiness,
      lifecycle.patternIntelligence
    );
    const reviewReport = buildReviewReport(lifecycle.reviewQueue, store);
    const trendReport = buildTrendReport(
      lifecycle.trendProfile,
      lifecycle.sessionSnapshots,
      analyticsMap
    );

    const dashDir = join(OUT, "dashboard");
    await Promise.all([
      atomicWriteFile(join(dashDir, "learner-overview.json"), JSON.stringify(lifecycle.overview, null, 2)),
      atomicWriteFile(join(dashDir, "trend-report.json"), JSON.stringify(trendReport, null, 2)),
      atomicWriteFile(join(dashDir, "review-report.json"), JSON.stringify(reviewReport, null, 2)),
    ]);

    const curriculumPlan = buildCurriculumPlan(
      lifecycle.overview,
      lifecycle.mistakePatterns,
      lifecycle.trendProfile,
      lifecycle.reviewQueue,
      store,
      lifecycle.focusRecommendations,
      intelligence.conceptState,
      intelligence.openingReport,
      intelligence.repertoireReview,
      intelligence.repertoireTransferCoaching,
      intelligence.repertoireDrillQueue,
      intelligence.repertoireRepairQueue,
      intelligence.repertoireRepairOutcomes
    );
    const studyPlan = buildStudyPlan(
      lifecycle.focusRecommendations,
      reviewReport,
      lifecycle.trendProfile,
      store,
      intelligence.conceptState,
      intelligence.openingReport,
      intelligence.repertoireReview,
      intelligence.repertoireTransferCoaching,
      intelligence.repertoireDrillQueue,
      intelligence.repertoireRepairQueue,
      intelligence.repertoireRepairOutcomes
    );
    const coachingSummary = buildCoachingSummary(
      lifecycle.overview,
      lifecycle.mistakePatterns,
      studyPlan,
      lifecycle.trendProfile,
      intelligence.conceptState,
      intelligence.openingReport,
      intelligence.repertoireReview,
      intelligence.repertoireTransfer,
      intelligence.repertoireTransferCoaching,
      intelligence.repertoireDrillMemory,
      intelligence.repertoireDrillQueue,
      intelligence.repertoireRepair,
      intelligence.repertoireRepairQueue,
      intelligence.repertoireRepairOutcomes
    );

    const coachDir = join(OUT, "coach");
    await Promise.all([
      atomicWriteFile(
        join(coachDir, "mistake-patterns.json"),
        JSON.stringify(lifecycle.mistakePatterns, null, 2)
      ),
      atomicWriteFile(join(coachDir, "study-plan.json"), JSON.stringify(studyPlan, null, 2)),
      atomicWriteFile(
        join(coachDir, "coaching-summary.json"),
        JSON.stringify(coachingSummary, null, 2)
      ),
    ]);

    await atomicWriteFile(
      join(OUT, "curriculum", "curriculum-plan.json"),
      JSON.stringify(curriculumPlan, null, 2)
    );

    let patternLibrary = null;
    try {
      if (exercises.length > 0) {
        patternLibrary = buildPatternLibrary(exercises, store);
      }
    } catch {
      patternLibrary = null;
    }

    const intelligenceReport = buildIntelligenceReport(
      lifecycle.patternIntelligence,
      lifecycle.readiness,
      policy,
      lifecycle.reviewQueue
    );

    const objectiveHistory = lifecycle.objectiveHistory;
    const interventionHistory = lifecycle.interventionHistory;
    const interventionMemory = lifecycle.interventionMemory;
    const objectiveEscalation = lifecycle.objectiveEscalation;
    const objectivePortfolio = lifecycle.objectivePortfolio;
    const strategicDir = join(OUT, "strategic");
    const objectiveDir = join(OUT, "objective");
    const writes = [
      atomicWriteFile(
        join(strategicDir, "pattern-intelligence.json"),
        JSON.stringify(lifecycle.patternIntelligence, null, 2)
      ),
      atomicWriteFile(
        join(strategicDir, "readiness-forecast.json"),
        JSON.stringify(lifecycle.readiness, null, 2)
      ),
      atomicWriteFile(
        join(strategicDir, "intelligence-report.json"),
        JSON.stringify(intelligenceReport, null, 2)
      ),
      atomicWriteFile(
        join(objectiveDir, "training-objective.json"),
        JSON.stringify(lifecycle.objective, null, 2)
      ),
      atomicWriteFile(
        join(objectiveDir, "objective-progress.json"),
        JSON.stringify(lifecycle.objectiveProgress, null, 2)
      ),
      atomicWriteFile(
        join(objectiveDir, "objective-coaching.json"),
        JSON.stringify(lifecycle.objectiveCoaching, null, 2)
      ),
      atomicWriteFile(
        join(objectiveDir, "objective-coaching.md"),
        formatObjectiveCoachingMd(lifecycle.objectiveCoaching)
      ),
      atomicWriteFile(
        join(objectiveDir, "objective-escalation.json"),
        JSON.stringify(objectiveEscalation, null, 2)
      ),
      atomicWriteFile(
        join(objectiveDir, "objective-escalation.md"),
        formatObjectiveEscalationMd(objectiveEscalation)
      ),
      atomicWriteFile(
        join(objectiveDir, "objective-portfolio.json"),
        JSON.stringify(objectivePortfolio, null, 2)
      ),
      atomicWriteFile(
        join(objectiveDir, "objective-portfolio.md"),
        formatObjectivePortfolioMd(objectivePortfolio)
      ),
      atomicWriteFile(
        join(objectiveDir, "intervention-effectiveness.json"),
        JSON.stringify(lifecycle.interventionEffectiveness, null, 2)
      ),
      atomicWriteFile(
        join(objectiveDir, "intervention-effectiveness.md"),
        formatInterventionEffectivenessMd(lifecycle.interventionEffectiveness)
      ),
      atomicWriteFile(
        join(objectiveDir, "intervention-memory.json"),
        JSON.stringify(interventionMemory, null, 2)
      ),
      atomicWriteFile(
        join(objectiveDir, "intervention-history.jsonl"),
        interventionHistory.map((entry) => JSON.stringify(entry)).join("\n") + (interventionHistory.length > 0 ? "\n" : "")
      ),
      atomicWriteFile(
        join(objectiveDir, "objective-history.jsonl"),
        objectiveHistory.map((entry) => JSON.stringify(entry)).join("\n") + (objectiveHistory.length > 0 ? "\n" : "")
      ),
    ];

    if (patternLibrary) {
      writes.push(
        atomicWriteFile(
          join(OUT, "patterns", "pattern-library.json"),
          JSON.stringify(patternLibrary, null, 2)
        )
      );
    }

    await Promise.all(writes);
    await persistProductIntelligenceArtifacts(intelligence);

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  } finally {
    refreshing = false;
  }
}

export interface GenerateDiagnosisResult {
  success: boolean;
  gameId: string;
  error: string | null;
}

export async function generateGameDiagnosis(
  gameId: string,
  heroColor?: "white" | "black" | null
): Promise<GenerateDiagnosisResult> {
  try {
    const datasetPath = join(OUT, "games", gameId, "training-dataset.json");
    const raw = await readFile(datasetPath, "utf-8");
    const parsed = JSON.parse(raw) as { rows: TrainingDatasetRow[] };

    if (!parsed.rows || parsed.rows.length === 0) {
      return { success: false, gameId, error: "No dataset rows found for this game." };
    }

    const diagnosis = diagnoseGameLoss(parsed.rows, heroColor);

    const diagnosisDir = join(OUT, "games", gameId);
    await mkdir(diagnosisDir, { recursive: true });
    await atomicWriteFile(
      join(diagnosisDir, "diagnosis.json"),
      JSON.stringify(diagnosis, null, 2)
    );

    return { success: true, gameId, error: null };
  } catch (err) {
    return {
      success: false,
      gameId,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}












































