import { readFile, readdir, stat } from "fs/promises";
import { join } from "path";
import { getImportAnalysisOverview, loadImportAnalysisStatus } from "./import-analysis";
import { ROOT, OUT } from "./paths";
import { loadJsonSafe, safeParseJsonl, type LoadResult } from "./safe-parse";
import {
  isLearnerOverview,
  isTrendReport,
  isReviewReport,
  isCoachingSummary,
  isStudyPlan,
  isMistakePatterns,
  isReviewQueue,
  isCurriculumPlan,
  isExerciseProgress,
  isStudySession,
  isPatternIntelligence,
  isReadinessForecast,
  isIntelligenceReport,
  isCompositionRationale,
  isPatternLibrary,
  isTrainingObjectiveState,
  isObjectiveProgressState,
  isObjectiveCoachingState,
  isObjectiveEscalationState,
  isObjectivePortfolioState,
  isInterventionEffectivenessState,
  isInterventionMemoryState,
  isLearningModelArtifact,
  ARTIFACT_VALIDATORS,
} from "./validators";
import type {
  LearnerOverview,
  TrendReport,
  ReviewReport,
  CoachingSummary,
  StudyPlan,
  MistakePatterns,
  ReviewQueue,
  CurriculumPlan,
  StudySession,
  SessionResults,
  ExerciseProgress,
  SessionHistoryEntry,
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
import type { ImportAnalysisOverview, ImportAnalysisStatus } from "./import-types";
import type { ConceptGraphArtifact, ConceptStateReportArtifact, GameLossDiagnosis, TargetedSessionSummary } from "./types";
import type { OpeningReportArtifact, OpeningMistakeArtifact, RepertoireDrillEventArtifact, RepertoireDrillMemoryArtifact, RepertoireDrillQueueArtifact, RepertoireDrillSessionSummaryArtifact, RepertoireMapArtifact, RepertoireRepairArtifact, RepertoireRepairOutcomesArtifact, RepertoireRepairQueueArtifact, RepertoireReviewArtifact, RepertoireTransferArtifact, RepertoireTransferCoachingArtifact } from "./types";
import { isConceptGraphArtifact, isConceptStateReportArtifact } from "./validators";
import { isOpeningReportArtifact, isOpeningMistakeArtifactList, isRepertoireDrillEventArtifactList, isRepertoireDrillMemoryArtifact, isRepertoireDrillQueueArtifact, isRepertoireDrillSessionSummaryArtifactList, isRepertoireMapArtifact, isRepertoireRepairArtifact, isRepertoireRepairOutcomesArtifact, isRepertoireRepairQueueArtifact, isRepertoireReviewArtifact, isRepertoireTransferArtifact, isRepertoireTransferCoachingArtifact, isGameLossDiagnosis } from "./validators";

async function loadJsonDetailed<T>(
  path: string,
  validate?: (v: unknown) => v is T
): Promise<LoadResult<T>> {
  return loadJsonSafe(path, validate);
}

async function loadJson<T>(
  path: string,
  validate?: (v: unknown) => v is T
): Promise<T | null> {
  const result = await loadJsonSafe(path, validate);
  return result.ok ? result.data : null;
}

export async function loadLearnerOverview(): Promise<LearnerOverview | null> {
  return loadJson<LearnerOverview>(join(OUT, "dashboard", "learner-overview.json"), isLearnerOverview);
}

export async function loadTrendReport(): Promise<TrendReport | null> {
  return loadJson<TrendReport>(join(OUT, "dashboard", "trend-report.json"), isTrendReport);
}

export async function loadReviewReport(): Promise<ReviewReport | null> {
  return loadJson<ReviewReport>(join(OUT, "dashboard", "review-report.json"), isReviewReport);
}

export async function loadCoachingSummary(): Promise<CoachingSummary | null> {
  return loadJson<CoachingSummary>(join(OUT, "coach", "coaching-summary.json"), isCoachingSummary);
}

export async function loadStudyPlan(): Promise<StudyPlan | null> {
  return loadJson<StudyPlan>(join(OUT, "coach", "study-plan.json"), isStudyPlan);
}

export async function loadMistakePatterns(): Promise<MistakePatterns | null> {
  return loadJson<MistakePatterns>(join(OUT, "coach", "mistake-patterns.json"), isMistakePatterns);
}

export async function loadReviewQueue(): Promise<ReviewQueue | null> {
  return loadJson<ReviewQueue>(join(OUT, "progress", "review-queue.json"), isReviewQueue);
}

export async function loadCurriculumPlan(): Promise<CurriculumPlan | null> {
  return loadJson<CurriculumPlan>(join(OUT, "curriculum", "curriculum-plan.json"), isCurriculumPlan);
}

export async function loadAllSessions(): Promise<StudySession[]> {
  const sessionsDir = join(OUT, "sessions");
  try {
    const entries = await readdir(sessionsDir, { withFileTypes: true });
    const sessions: StudySession[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const session = await loadJson<StudySession>(
        join(sessionsDir, entry.name, "study-session.json")
      );
      if (session) sessions.push(session);
    }
    sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sessions;
  } catch {
    return [];
  }
}

export async function loadSession(sessionId: string): Promise<StudySession | null> {
  return loadJson<StudySession>(join(OUT, "sessions", sessionId, "study-session.json"), isStudySession);
}

export async function loadSessionResults(sessionId: string): Promise<SessionResults | null> {
  const primary = await loadJson<SessionResults>(
    join(OUT, "results", sessionId, "session-results.json")
  );
  if (primary) return primary;
  return loadJson<SessionResults>(join(OUT, "results", sessionId, "results.json"));
}

export async function loadAllSessionResults(): Promise<Map<string, SessionResults>> {
  const resultsDir = join(OUT, "results");
  const map = new Map<string, SessionResults>();
  try {
    const entries = await readdir(resultsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const results = await loadSessionResults(entry.name);
      if (results) map.set(entry.name, results);
    }
  } catch {
    // Results dir may not exist
  }
  return map;
}

interface RawHistoryLine {
  sessionId: string;
  createdAt: string;
  completedAt: string | null;
  exerciseIds: string[];
  difficultyDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  results: Array<{ exerciseId: string; result: "correct" | "incorrect" }> | null;
}

export async function loadSessionHistory(): Promise<SessionHistoryEntry[]> {
  const historyPath = join(OUT, "progress", "session-history.jsonl");
  try {
    const raw = await readFile(historyPath, "utf-8");
    const { rows: parsed } = safeParseJsonl<RawHistoryLine>(raw, historyPath);

    const creationMap = new Map<string, RawHistoryLine>();
    for (const entry of parsed) {
      if (entry.completedAt === null) creationMap.set(entry.sessionId, entry);
    }

    const completions: SessionHistoryEntry[] = [];
    for (const entry of parsed) {
      if (entry.completedAt === null || entry.results === null) continue;
      const creation = creationMap.get(entry.sessionId);
      completions.push({
        sessionId: entry.sessionId,
        createdAt: creation?.createdAt ?? entry.createdAt,
        completedAt: entry.completedAt,
        exerciseIds: creation?.exerciseIds ?? entry.exerciseIds,
        difficultyDistribution: creation?.difficultyDistribution ?? entry.difficultyDistribution,
        categoryDistribution: creation?.categoryDistribution ?? entry.categoryDistribution,
        results: entry.results,
      });
    }

    completions.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    return completions;
  } catch {
    return [];
  }
}

export async function loadExerciseProgress(): Promise<ExerciseProgress | null> {
  return loadJson<ExerciseProgress>(join(OUT, "progress", "exercise-progress.json"), isExerciseProgress);
}

export async function loadPatternIntelligence(): Promise<PatternIntelligence | null> {
  return loadJson<PatternIntelligence>(join(OUT, "strategic", "pattern-intelligence.json"), isPatternIntelligence);
}

export async function loadReadinessForecast(): Promise<ReadinessForecast | null> {
  return loadJson<ReadinessForecast>(join(OUT, "strategic", "readiness-forecast.json"), isReadinessForecast);
}

export async function loadIntelligenceReport(): Promise<IntelligenceReport | null> {
  return loadJson<IntelligenceReport>(join(OUT, "strategic", "intelligence-report.json"), isIntelligenceReport);
}

export async function loadCompositionRationale(sessionId: string): Promise<CompositionRationale | null> {
  return loadJson<CompositionRationale>(join(OUT, "sessions", sessionId, "composition-rationale.json"), isCompositionRationale);
}

export async function loadPatternLibrary(): Promise<PatternLibrary | null> {
  return loadJson<PatternLibrary>(join(OUT, "patterns", "pattern-library.json"), isPatternLibrary);
}

export async function loadTrainingObjective(): Promise<TrainingObjectiveState | null> {
  return loadJson<TrainingObjectiveState>(
    join(OUT, "objective", "training-objective.json"),
    isTrainingObjectiveState
  );
}

export async function loadObjectiveProgress(): Promise<ObjectiveProgressState | null> {
  return loadJson<ObjectiveProgressState>(
    join(OUT, "objective", "objective-progress.json"),
    isObjectiveProgressState
  );
}

export async function loadObjectiveCoaching(): Promise<ObjectiveCoachingState | null> {
  return loadJson<ObjectiveCoachingState>(
    join(OUT, "objective", "objective-coaching.json"),
    isObjectiveCoachingState
  );
}

export async function loadObjectiveEscalation(): Promise<ObjectiveEscalationState | null> {
  return loadJson<ObjectiveEscalationState>(
    join(OUT, "objective", "objective-escalation.json"),
    isObjectiveEscalationState
  );
}

export async function loadObjectivePortfolio(): Promise<ObjectivePortfolioState | null> {
  return loadJson<ObjectivePortfolioState>(
    join(OUT, "objective", "objective-portfolio.json"),
    isObjectivePortfolioState
  );
}

export async function loadInterventionEffectiveness(): Promise<InterventionEffectivenessState | null> {
  return loadJson<InterventionEffectivenessState>(
    join(OUT, "objective", "intervention-effectiveness.json"),
    isInterventionEffectivenessState
  );
}

export async function loadInterventionMemory(): Promise<InterventionMemoryState | null> {
  return loadJson<InterventionMemoryState>(
    join(OUT, "objective", "intervention-memory.json"),
    isInterventionMemoryState
  );
}

export async function loadLearningModel(): Promise<LearningModelArtifact | null> {
  return loadJson<LearningModelArtifact>(join(OUT, "learning", "learning-model.json"), isLearningModelArtifact);
}

export async function loadConceptGraph(): Promise<ConceptGraphArtifact | null> {
  return loadJson<ConceptGraphArtifact>(join(OUT, "concepts", "concept-graph.json"), isConceptGraphArtifact);
}

export async function loadConceptState(): Promise<ConceptStateReportArtifact | null> {
  return loadJson<ConceptStateReportArtifact>(join(OUT, "concepts", "concept-state.json"), isConceptStateReportArtifact);
}

export async function loadOpeningReport(): Promise<OpeningReportArtifact | null> {
  return loadJson<OpeningReportArtifact>(join(OUT, "openings", "opening-report.json"), isOpeningReportArtifact);
}

export async function loadOpeningMistakes(): Promise<OpeningMistakeArtifact[] | null> {
  return loadJson<OpeningMistakeArtifact[]>(join(OUT, "openings", "opening-mistakes.json"), isOpeningMistakeArtifactList);
}

export async function loadRepertoireMap(): Promise<RepertoireMapArtifact | null> {
  return loadJson<RepertoireMapArtifact>(join(OUT, "repertoire", "repertoire-map.json"), isRepertoireMapArtifact);
}

export async function loadRepertoireReview(): Promise<RepertoireReviewArtifact | null> {
  return loadJson<RepertoireReviewArtifact>(join(OUT, "repertoire", "repertoire-review.json"), isRepertoireReviewArtifact);
}

export async function loadRepertoireTransfer(): Promise<RepertoireTransferArtifact | null> {
  return loadJson<RepertoireTransferArtifact>(join(OUT, "repertoire", "repertoire-transfer.json"), isRepertoireTransferArtifact);
}

export async function loadRepertoireTransferCoaching(): Promise<RepertoireTransferCoachingArtifact | null> {
  return loadJson<RepertoireTransferCoachingArtifact>(
    join(OUT, "repertoire", "repertoire-transfer-coaching.json"),
    isRepertoireTransferCoachingArtifact
  );
}

export async function loadRepertoireDrillMemory(): Promise<RepertoireDrillMemoryArtifact | null> {
  return loadJson<RepertoireDrillMemoryArtifact>(
    join(OUT, "repertoire", "repertoire-drill-memory.json"),
    isRepertoireDrillMemoryArtifact
  );
}

export async function loadRepertoireDrillQueue(): Promise<RepertoireDrillQueueArtifact | null> {
  return loadJson<RepertoireDrillQueueArtifact>(
    join(OUT, "repertoire", "repertoire-drill-queue.json"),
    isRepertoireDrillQueueArtifact
  );
}

export async function loadRepertoireDrillSessions(): Promise<RepertoireDrillSessionSummaryArtifact[] | null> {
  return loadJson<RepertoireDrillSessionSummaryArtifact[]>(
    join(OUT, "repertoire", "repertoire-drill-sessions.json"),
    isRepertoireDrillSessionSummaryArtifactList
  );
}

export async function loadRepertoireDrillEvents(): Promise<RepertoireDrillEventArtifact[] | null> {
  try {
    const path = join(OUT, "repertoire", "repertoire-drill-events.jsonl");
    const raw = await readFile(path, "utf-8");
    const { rows } = safeParseJsonl<RepertoireDrillEventArtifact>(raw, path);
    return isRepertoireDrillEventArtifactList(rows) ? rows : null;
  } catch {
    return null;
  }
}

export async function loadRepertoireRepair(): Promise<RepertoireRepairArtifact | null> {
  return loadJson<RepertoireRepairArtifact>(
    join(OUT, "repertoire", "repertoire-repair.json"),
    isRepertoireRepairArtifact
  );
}

export async function loadRepertoireRepairQueue(): Promise<RepertoireRepairQueueArtifact | null> {
  return loadJson<RepertoireRepairQueueArtifact>(
    join(OUT, "repertoire", "repertoire-repair-queue.json"),
    isRepertoireRepairQueueArtifact
  );
}

export async function loadRepertoireRepairOutcomes(): Promise<RepertoireRepairOutcomesArtifact | null> {
  return loadJson<RepertoireRepairOutcomesArtifact>(
    join(OUT, "repertoire", "repertoire-repair-outcomes.json"),
    isRepertoireRepairOutcomesArtifact
  );
}

export interface ArtifactStatus {
  name: string;
  path: string;
  exists: boolean;
  sizeBytes: number | null;
  lastModified: string | null;
  valid: boolean | null;
  validationError: string | null;
}

export async function checkArtifactHealth(): Promise<ArtifactStatus[]> {
  const artifacts = [
    { name: "Learner Overview", path: join(OUT, "dashboard", "learner-overview.json") },
    { name: "Trend Report", path: join(OUT, "dashboard", "trend-report.json") },
    { name: "Review Report", path: join(OUT, "dashboard", "review-report.json") },
    { name: "Coaching Summary", path: join(OUT, "coach", "coaching-summary.json") },
    { name: "Study Plan", path: join(OUT, "coach", "study-plan.json") },
    { name: "Mistake Patterns", path: join(OUT, "coach", "mistake-patterns.json") },
    { name: "Review Queue", path: join(OUT, "progress", "review-queue.json") },
    { name: "Exercise Progress", path: join(OUT, "progress", "exercise-progress.json") },
    { name: "Trend Profile", path: join(OUT, "progress", "trend-profile.json") },
    { name: "Difficulty Policy", path: join(OUT, "progress", "difficulty-policy.json") },
    { name: "Session History", path: join(OUT, "progress", "session-history.jsonl") },
    { name: "Curriculum Plan", path: join(OUT, "curriculum", "curriculum-plan.json") },
    { name: "Tree Model", path: join(OUT, "models", "tree-model.json") },
    { name: "Feature Ablation", path: join(OUT, "models", "feature-ablation.json") },
    { name: "Aggregated Dataset", path: join(OUT, "datasets", "all-games.jsonl") },
    { name: "Training Exercises", path: join(OUT, "datasets", "training-exercises.jsonl") },
    { name: "Pattern Intelligence", path: join(OUT, "strategic", "pattern-intelligence.json") },
    { name: "Readiness Forecast", path: join(OUT, "strategic", "readiness-forecast.json") },
    { name: "Intelligence Report", path: join(OUT, "strategic", "intelligence-report.json") },
    { name: "Pattern Library", path: join(OUT, "patterns", "pattern-library.json") },
    { name: "Learning Model", path: join(OUT, "learning", "learning-model.json") },
    { name: "Concept Graph", path: join(OUT, "concepts", "concept-graph.json") },
    { name: "Concept Graph Markdown", path: join(OUT, "concepts", "concept-graph.md") },
    { name: "Concept State", path: join(OUT, "concepts", "concept-state.json") },
    { name: "Concept State Markdown", path: join(OUT, "concepts", "concept-state.md") },    { name: "Opening Report", path: join(OUT, "openings", "opening-report.json") },
    { name: "Opening Report Markdown", path: join(OUT, "openings", "opening-report.md") },
    { name: "Opening Mistakes", path: join(OUT, "openings", "opening-mistakes.json") },
    { name: "Opening Mistakes Markdown", path: join(OUT, "openings", "opening-mistakes.md") },
    { name: "Repertoire Map", path: join(OUT, "repertoire", "repertoire-map.json") },
    { name: "Repertoire Map Markdown", path: join(OUT, "repertoire", "repertoire-map.md") },
    { name: "Repertoire Review", path: join(OUT, "repertoire", "repertoire-review.json") },
    { name: "Repertoire Review Markdown", path: join(OUT, "repertoire", "repertoire-review.md") },
    { name: "Repertoire Transfer", path: join(OUT, "repertoire", "repertoire-transfer.json") },
    { name: "Repertoire Transfer Markdown", path: join(OUT, "repertoire", "repertoire-transfer.md") },
    { name: "Repertoire Transfer Coaching", path: join(OUT, "repertoire", "repertoire-transfer-coaching.json") },
    { name: "Repertoire Transfer Coaching Markdown", path: join(OUT, "repertoire", "repertoire-transfer-coaching.md") },
    { name: "Repertoire Drill Memory", path: join(OUT, "repertoire", "repertoire-drill-memory.json") },
    { name: "Repertoire Drill Memory Markdown", path: join(OUT, "repertoire", "repertoire-drill-memory.md") },
    { name: "Repertoire Drill Queue", path: join(OUT, "repertoire", "repertoire-drill-queue.json") },
    { name: "Repertoire Drill Queue Markdown", path: join(OUT, "repertoire", "repertoire-drill-queue.md") },
    { name: "Repertoire Drill Sessions", path: join(OUT, "repertoire", "repertoire-drill-sessions.json") },
    { name: "Repertoire Drill Events", path: join(OUT, "repertoire", "repertoire-drill-events.jsonl") },
    { name: "Repertoire Repair", path: join(OUT, "repertoire", "repertoire-repair.json") },
    { name: "Repertoire Repair Markdown", path: join(OUT, "repertoire", "repertoire-repair.md") },
    { name: "Repertoire Repair Queue", path: join(OUT, "repertoire", "repertoire-repair-queue.json") },
    { name: "Repertoire Repair Queue Markdown", path: join(OUT, "repertoire", "repertoire-repair-queue.md") },
    { name: "Repertoire Repair Outcomes", path: join(OUT, "repertoire", "repertoire-repair-outcomes.json") },
    { name: "Repertoire Repair Outcomes Markdown", path: join(OUT, "repertoire", "repertoire-repair-outcomes.md") },
    { name: "Repertoire Repair History", path: join(OUT, "repertoire", "repertoire-repair-history.jsonl") },
    { name: "Training Objective", path: join(OUT, "objective", "training-objective.json") },
    { name: "Objective Progress", path: join(OUT, "objective", "objective-progress.json") },
    { name: "Objective Coaching", path: join(OUT, "objective", "objective-coaching.json") },
    { name: "Objective Coaching Markdown", path: join(OUT, "objective", "objective-coaching.md") },
    { name: "Objective Escalation", path: join(OUT, "objective", "objective-escalation.json") },
    { name: "Objective Escalation Markdown", path: join(OUT, "objective", "objective-escalation.md") },
    { name: "Objective Portfolio", path: join(OUT, "objective", "objective-portfolio.json") },
    { name: "Objective Portfolio Markdown", path: join(OUT, "objective", "objective-portfolio.md") },
    { name: "Intervention Effectiveness", path: join(OUT, "objective", "intervention-effectiveness.json") },
    { name: "Intervention Memory", path: join(OUT, "objective", "intervention-memory.json") },
    { name: "Intervention Effectiveness Markdown", path: join(OUT, "objective", "intervention-effectiveness.md") },
    { name: "Intervention History", path: join(OUT, "objective", "intervention-history.jsonl") },
    { name: "Objective History", path: join(OUT, "objective", "objective-history.jsonl") },
    { name: "Import Analysis Status", path: join(OUT, "import", "analysis-status.json") },
  ];

  return Promise.all(
    artifacts.map(async ({ name, path }) => {
      try {
        const s = await stat(path);
        const validator = ARTIFACT_VALIDATORS[name];
        let valid: boolean | null = null;
        let validationError: string | null = null;

        if (validator) {
          if (path.endsWith(".json")) {
            const result = await loadJsonDetailed(path);
            if (result.ok) {
              valid = validator(result.data);
              if (!valid) validationError = `Schema mismatch: expected ${name} structure`;
            } else {
              valid = false;
              validationError = result.message;
            }
          } else {
            try {
              const raw = await readFile(path, "utf-8");
              const firstLine = raw.trim().split("\n")[0];
              if (firstLine) {
                JSON.parse(firstLine);
                valid = true;
              } else {
                valid = false;
                validationError = "Empty JSONL file";
              }
            } catch {
              valid = false;
              validationError = "Invalid JSONL content";
            }
          }
        } else {
          valid = true;
        }

        return {
          name,
          path: path.replace(ROOT, ""),
          exists: true,
          sizeBytes: s.size,
          lastModified: s.mtime.toISOString(),
          valid,
          validationError,
        };
      } catch {
        return {
          name,
          path: path.replace(ROOT, ""),
          exists: false,
          sizeBytes: null,
          lastModified: null,
          valid: null,
          validationError: null,
        };
      }
    })
  );
}

export async function exerciseCorpusExists(): Promise<boolean> {
  try {
    await stat(join(OUT, "datasets", "training-exercises.jsonl"));
    return true;
  } catch {
    return false;
  }
}

export interface ReadinessStatus {
  pipelineReady: boolean;
  progressReady: boolean;
  insightsReady: boolean;
  canStudy: boolean;
  canRefreshInsights: boolean;
}

export async function checkReadiness(): Promise<ReadinessStatus> {
  const check = async (relativePath: string): Promise<boolean> => {
    try {
      await stat(join(OUT, relativePath));
      return true;
    } catch {
      return false;
    }
  };

  const [pipelineReady, progressReady, insightsReady] = await Promise.all([
    check("datasets/training-exercises.jsonl"),
    check("progress/exercise-progress.json"),
    check("dashboard/learner-overview.json"),
  ]);

  return {
    pipelineReady,
    progressReady,
    insightsReady,
    canStudy: pipelineReady,
    canRefreshInsights: progressReady,
  };
}

export function getOutDir(): string {
  return OUT;
}

export function getRoot(): string {
  return ROOT;
}

export function deriveReadiness(preloaded: {
  overview: unknown | null;
  progress: unknown | null;
  corpusExists: boolean;
}): ReadinessStatus {
  const pipelineReady = preloaded.corpusExists;
  const progressReady = preloaded.progress !== null;
  const insightsReady = preloaded.overview !== null;
  return {
    pipelineReady,
    progressReady,
    insightsReady,
    canStudy: pipelineReady,
    canRefreshInsights: progressReady,
  };
}

export async function loadImportOverview(): Promise<ImportAnalysisOverview> {
  return getImportAnalysisOverview();
}

export async function loadLastImportAnalysis(): Promise<ImportAnalysisStatus | null> {
  return loadImportAnalysisStatus();
}

export async function loadGameDiagnosis(gameId: string): Promise<GameLossDiagnosis | null> {
  return loadJson<GameLossDiagnosis>(
    join(OUT, "games", gameId, "diagnosis.json"),
    isGameLossDiagnosis
  );
}

export async function loadAllGameDiagnoses(): Promise<GameLossDiagnosis[]> {
  const gamesDir = join(OUT, "games");
  try {
    const entries = await readdir(gamesDir, { withFileTypes: true });
    const diagnoses: GameLossDiagnosis[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const diagnosis = await loadJson<GameLossDiagnosis>(
        join(gamesDir, entry.name, "diagnosis.json"),
        isGameLossDiagnosis
      );
      if (diagnosis) diagnoses.push(diagnosis);
    }
    diagnoses.sort(
      (a, b) =>
        new Date(b.diagnosedAt).getTime() - new Date(a.diagnosedAt).getTime()
    );
    return diagnoses;
  } catch {
    return [];
  }
}

/**
 * Load the SAN move sequence for a game from its training-dataset.json.
 * Returns the moves in dataset row order (ply order), filtered to non-empty strings.
 * Returns null if the file is missing or contains no valid moves.
 */
export async function loadGameMoveSans(gameId: string): Promise<string[] | null> {
  const path = join(OUT, "games", gameId, "training-dataset.json");
  try {
    const raw = await readFile(path, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    // Real format: { rowCount, rows: TrainingDatasetRow[] }
    // Fallback: plain array (legacy / test fixtures)
    let rowsArray: unknown[] | null = null;
    if (Array.isArray(parsed)) {
      rowsArray = parsed;
    } else if (
      parsed !== null &&
      typeof parsed === "object" &&
      "rows" in parsed &&
      Array.isArray((parsed as { rows: unknown }).rows)
    ) {
      rowsArray = (parsed as { rows: unknown[] }).rows;
    }
    if (!rowsArray) return null;
    const moves = rowsArray
      .map((r) =>
        r !== null && typeof r === "object" && "moveSan" in r
          ? (r as { moveSan: unknown }).moveSan
          : null
      )
      .filter((m): m is string => typeof m === "string" && m.length > 0);
    return moves.length > 0 ? moves : null;
  } catch {
    return null;
  }
}

/**
 * Load a ply→FEN map from the training dataset for a game.
 * Used to resolve board positions for contributing factors.
 */
export async function loadGamePlyFenMap(gameId: string): Promise<Record<number, string>> {
  const path = join(OUT, "games", gameId, "training-dataset.json");
  try {
    const raw = await readFile(path, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    let rowsArray: unknown[] | null = null;
    if (Array.isArray(parsed)) {
      rowsArray = parsed;
    } else if (
      parsed !== null &&
      typeof parsed === "object" &&
      "rows" in parsed &&
      Array.isArray((parsed as { rows: unknown }).rows)
    ) {
      rowsArray = (parsed as { rows: unknown[] }).rows;
    }
    if (!rowsArray) return {};
    const map: Record<number, string> = {};
    for (const r of rowsArray) {
      if (r !== null && typeof r === "object" && "ply" in r && "fen" in r) {
        const row = r as { ply: unknown; fen: unknown };
        if (typeof row.ply === "number" && typeof row.fen === "string") {
          map[row.ply] = row.fen;
        }
      }
    }
    return map;
  } catch {
    return {};
  }
}

/**
 * Load minimal summaries of sessions that included reviewTargeting metadata.
 * Used by evaluateCoachingMemory to determine whether targeted training
 * was launched for a given repair target.
 */
export async function loadTargetedSessionSummaries(): Promise<TargetedSessionSummary[]> {
  const sessionsDir = join(OUT, "sessions");
  try {
    const entries = await readdir(sessionsDir, { withFileTypes: true });
    const summaries: TargetedSessionSummary[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const raw = await readFile(
          join(sessionsDir, entry.name, "study-session.json"),
          "utf-8"
        );
        const session = JSON.parse(raw);
        const targeting = session?.metadata?.reviewTargeting;
        if (targeting) {
          summaries.push({
            sessionId: entry.name,
            createdAt: session.metadata?.createdAt ?? session.createdAt ?? "",
            primaryTarget: targeting.primaryTarget,
            boostStrength: targeting.boostStrength,
          });
        }
      } catch {
        // Skip malformed session artifacts.
      }
    }
    return summaries.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}



















