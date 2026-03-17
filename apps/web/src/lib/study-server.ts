import { readFile, appendFile } from "fs/promises";
import { join } from "path";
import { validateMove } from "@chess-os/chess-core";
import { atomicWriteFile } from "@chess-os/db";
import {
  enrichSessionExercises,
  gradeAttempt,
  gradeRecall,
  gradeVisualization,
  gradeReconstruction,
  buildPuzzleResult,
  buildSessionAnalytics,
  recordGradedResults,
  refreshDueStatus,
  buildReviewQueue,
  buildMasteryChanges,
} from "@chess-os/training";
import type {
  EnrichedExercise,
  PuzzleAttempt,
  PuzzleResult,
  GradedExerciseResult,
  ProgressStore,
  SessionAnalytics,
  MasteryChange,
  ReviewQueueEntry,
  MasteryState,
  SessionExerciseResult,
  SessionHistoryRecord,
  CognitiveSessionExercise,
  RecallGradeInput,
  RecallGradeResult,
  VisualizationQuestion,
  VisualizationGradeResult,
  ReconstructionGradeResult,
} from "@chess-os/training";
import { loadSession, loadExerciseProgress } from "./artifacts";
import { OUT } from "./paths";
import { safeParseJsonl } from "./safe-parse";
import type { StudySession } from "./types";
import type { GradeResult, CompletionResult } from "./study-types";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Study Server Adapter
// Thin wrappers around existing engine logic
// All grading/progress is canonical engine code
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€ Load & Enrich â”€â”€

interface TrainingExerciseRaw {
  gameId: string;
  positionId: string;
  ply: number;
  fen: string;
  sideToMove: string;
  heroColor?: string | null;
  phase: string;
  playedMoveSan: string;
  engineAnswer: {
    bestMoveUci: string;
    bestMoveSan: string;
    pv: string[];
    evalBefore: number;
    evalAfter: number;
    evalSwing: number;
  };
  targetType: string;
  targetPriority: number;
  predictedRisk: number;
  criticalityScore: number;
  explanation: {
    lessonCategory: string;
    reasonCodes: string[];
    difficultyEstimate: string;
    difficultyScore: number;
  };
  rank: number;
}

async function loadExerciseCorpus(): Promise<TrainingExerciseRaw[]> {
  const corpusPath = join(OUT, "datasets", "training-exercises.jsonl");
  try {
    const raw = await readFile(corpusPath, "utf-8");
    const { rows } = safeParseJsonl<TrainingExerciseRaw>(raw, corpusPath);
    return rows;
  } catch {
    return [];
  }
}

export async function loadStudySession(
  sessionId: string
): Promise<{ session: StudySession; exercises: EnrichedExercise[] } | null> {
  const session = await loadSession(sessionId);
  if (!session) return null;

  const corpus = await loadExerciseCorpus();
  const exercises = enrichSessionExercises(session, corpus as never[]);
  if (exercises.length === 0) return null;

  return { session, exercises };
}

// â”€â”€ Move Validation & Grading â”€â”€

export function validateAndGradeMove(
  exercise: EnrichedExercise,
  index: number,
  moveInput: string
): GradeResult {
  // Step 1: Validate move
  const validation = validateMove(exercise.fen, moveInput);
  if (!validation.valid || !validation.san || !validation.uci) {
    return {
      valid: false,
      error: validation.error || "Invalid move",
      attempt: null,
    };
  }

  // Step 2: Grade using canonical engine logic
  const attempt = gradeAttempt(
    exercise,
    index,
    validation.san,
    validation.uci
  );

  return {
    valid: true,
    error: null,
    attempt: {
      exerciseId: attempt.exerciseId,
      exerciseIndex: attempt.exerciseIndex,
      userMove: attempt.userMove,
      userMoveUci: attempt.userMoveUci,
      engineMove: attempt.engineMove,
      engineMoveUci: attempt.engineMoveUci,
      isCorrect: attempt.isCorrect,
      gradingTier: attempt.gradingTier,
      evalLossCp: attempt.evalLossCp,
    },
  };
}

// â”€â”€ Session Completion & Persistence â”€â”€

export async function completeStudySession(
  sessionId: string,
  attempts: PuzzleAttempt[],
  startedAt: string
): Promise<CompletionResult> {
  const completedAt = new Date().toISOString();

  // Build result + analytics using canonical engine logic
  const result: PuzzleResult = buildPuzzleResult(sessionId, attempts, startedAt);
  const analytics: SessionAnalytics = buildSessionAnalytics(sessionId, attempts);

  // Load progress store
  let store = await loadExerciseProgress();
  if (!store) {
    // Create minimal store if missing
    store = { totalExercises: 0, exercises: {}, lastUpdatedAt: completedAt };
  }

  // Snapshot mastery states BEFORE update
  const beforeSnapshot = new Map<string, MasteryState>();
  const exerciseIds = attempts.map((a) => a.exerciseId);
  for (const id of exerciseIds) {
    const entry = (store as ProgressStore).exercises[id];
    beforeSnapshot.set(id, entry?.masteryState ?? "unseen");
  }

  // Build graded results for progress update
  const gradedResults: GradedExerciseResult[] = attempts.map((a) => ({
    exerciseId: a.exerciseId,
    result: a.isCorrect ? ("correct" as const) : ("incorrect" as const),
    gradingTier: a.gradingTier,
    evalLossCp: a.evalLossCp,
  }));

  // Update progress store using canonical engine logic
  recordGradedResults(store as ProgressStore, gradedResults, completedAt);
  refreshDueStatus(store as ProgressStore, completedAt);

  // Compute mastery changes
  const masteryChanges: MasteryChange[] = buildMasteryChanges(
    beforeSnapshot,
    (store as ProgressStore).exercises,
    exerciseIds
  );

  // Build review queue
  const reviewQueue = buildReviewQueue(store as ProgressStore, completedAt);

  // â”€â”€ Write artifacts (atomic write-then-rename) â”€â”€

  // Write result artifacts
  await atomicWriteFile(
    join(OUT, "results", sessionId, "session-results.json"),
    JSON.stringify(
      {
        sessionId,
        completedAt,
        results: attempts.map((a) => ({
          exerciseId: a.exerciseId,
          result: a.isCorrect ? "correct" : "incorrect",
          userMoveSan: a.userMove,
          gradingTier: a.gradingTier,
          evalLossCp: a.evalLossCp,
        })),
        summary: {
          totalExercises: result.totalExercises,
          correctCount: result.correctCount,
          accuracy: result.accuracy,
        },
      },
      null,
      2
    )
  );

  await atomicWriteFile(
    join(OUT, "results", sessionId, "session-analytics.json"),
    JSON.stringify(analytics, null, 2)
  );

  // Save progress store
  const progressDir = join(OUT, "progress");

  (store as ProgressStore).lastUpdatedAt = completedAt;
  await atomicWriteFile(
    join(progressDir, "exercise-progress.json"),
    JSON.stringify(store, null, 2)
  );

  // Save review queue
  await atomicWriteFile(
    join(progressDir, "review-queue.json"),
    JSON.stringify(reviewQueue, null, 2)
  );

  // Append to session history
  const historyPath = join(progressDir, "session-history.jsonl");
  const sessionArtifact = await loadSession(sessionId);
  const completionRecord: SessionHistoryRecord = {
    sessionId,
    createdAt: startedAt,
    completedAt,
    exerciseIds,
    difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
    categoryDistribution: {},
    results: attempts.map((a) => ({
      exerciseId: a.exerciseId,
      result: (a.isCorrect ? "correct" : "incorrect") as "correct" | "incorrect",
    })),
    trainingObjective: sessionArtifact?.metadata.trainingObjective,
    objectivePhase: sessionArtifact?.metadata.objectivePhase,
    objectiveStatus: sessionArtifact?.metadata.objectiveStatus,
    objectiveProgressVerdict: sessionArtifact?.metadata.objectiveProgressVerdict,
    objectiveDecision: sessionArtifact?.metadata.objectiveDecision,
    objectiveStartedAt: sessionArtifact?.metadata.objectiveStartedAt,
    objectiveInterventionType: sessionArtifact?.metadata.objectiveInterventionType,
    objectiveRecommendationStrength: sessionArtifact?.metadata.objectiveRecommendationStrength,
    objectiveInterventionStartedAt: sessionArtifact?.metadata.objectiveInterventionStartedAt,
    priorInterventionOutcome: sessionArtifact?.metadata.priorInterventionOutcome,
    interventionRecommendedAction: sessionArtifact?.metadata.interventionRecommendedAction,
  };
  // Compute distributions
  for (const a of attempts) {
    const diff = a.difficultyEstimate;
    if (diff in completionRecord.difficultyDistribution) {
      (completionRecord.difficultyDistribution as Record<string, number>)[diff]++;
    }
    const cat = a.lessonCategory;
    completionRecord.categoryDistribution[cat] =
      (completionRecord.categoryDistribution[cat] || 0) + 1;
  }
  await appendFile(historyPath, JSON.stringify(completionRecord) + "\n");

  return {
    sessionId,
    totalExercises: result.totalExercises,
    correctCount: result.correctCount,
    accuracy: result.accuracy,
    gradeDistribution: analytics.gradeDistribution,
    hardestMissed: analytics.hardestMissed.map((h) => ({
      exerciseId: h.exerciseId,
      exerciseIndex: h.exerciseIndex,
      userMove: h.userMove,
      engineMove: h.engineMove,
      gradingTier: h.gradingTier,
      evalLossCp: h.evalLossCp,
      lessonCategory: h.lessonCategory,
    })),
    masteryChanges: masteryChanges.map((m) => ({
      exerciseId: m.exerciseId,
      before: m.before,
      after: m.after,
      changed: m.changed,
    })),
    evalLossStats: {
      average: analytics.evalLossStats.average,
      median: analytics.evalLossStats.median,
      max: analytics.evalLossStats.max,
    },
  };
}

// â”€â”€ Cognitive Grading Wrappers â”€â”€

export function validateAndGradeRecall(
  input: RecallGradeInput
): RecallGradeResult {
  return gradeRecall(input);
}

export function validateAndGradeVisualization(
  input: { exerciseId: string; answer: string; timeTakenMs: number },
  question: VisualizationQuestion
): VisualizationGradeResult {
  return gradeVisualization(input, question);
}

export function validateAndGradeReconstruction(
  exercise: EnrichedExercise,
  userSan: string
): ReconstructionGradeResult {
  return gradeReconstruction(exercise, userSan);
}

export async function loadCognitiveSessionData(
  sessionId: string
): Promise<CognitiveSessionExercise[] | null> {
  try {
    const raw = await readFile(
      join(OUT, "sessions", sessionId, "cognitive-exercises.json"),
      "utf-8"
    );
    return JSON.parse(raw);
  } catch {
    return null;
  }
}







