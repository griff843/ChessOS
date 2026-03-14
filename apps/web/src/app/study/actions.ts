"use server";

import {
  loadStudySession,
  validateAndGradeMove,
  validateAndGradeRecall,
  validateAndGradeVisualization,
  validateAndGradeReconstruction,
  completeStudySession,
  loadCognitiveSessionData,
} from "@/lib/study-server";
import type {
  GradeResult,
  CompletionResult,
  ExerciseView,
  RecallGradeResult,
  VisualizationGradeResult,
  ReconstructionGradeResult,
} from "@/lib/study-types";
import type {
  EnrichedExercise,
  PuzzleAttempt,
  CognitiveSessionExercise,
} from "@chess-os/training";

// Server Actions for Study Session
// Thin wrappers - all logic is in engine packages


// Module-level cache for enriched exercises during a session
// (avoids re-reading corpus on every move)
const sessionCache = new Map<
  string,
  { exercises: EnrichedExercise[]; loadedAt: number }
>();

function getCachedExercises(sessionId: string): EnrichedExercise[] | null {
  const cached = sessionCache.get(sessionId);
  if (!cached) return null;
  // Expire after 30 minutes
  if (Date.now() - cached.loadedAt > 30 * 60 * 1000) {
    sessionCache.delete(sessionId);
    return null;
  }
  return cached.exercises;
}

export async function loadSessionData(
  sessionId: string
): Promise<{ exercises: ExerciseView[]; error: string | null }> {
  try {
    const data = await loadStudySession(sessionId);
    if (!data) {
      return { exercises: [], error: "Session not found or exercises could not be enriched" };
    }

    // Cache enriched exercises for grading
    sessionCache.set(sessionId, {
      exercises: data.exercises,
      loadedAt: Date.now(),
    });

    // Load cognitive sidecar if present
    const cognitiveExercises = await loadCognitiveSessionData(sessionId);
    const cognitiveMap = new Map<string, CognitiveSessionExercise>();
    if (cognitiveExercises) {
      for (const ce of cognitiveExercises) {
        cognitiveMap.set(ce.exerciseId, ce);
      }
    }

    // Return lightweight views for the client
    const views: ExerciseView[] = data.exercises.map((ex, i) => {
      const cognitive = cognitiveMap.get(ex.exerciseId);
      return {
        index: i,
        total: data.exercises.length,
        exerciseId: ex.exerciseId,
        fen: ex.fen,
        sideToMove: ex.sideToMove,
        phase: ex.phase,
        lessonCategory: ex.lessonCategory,
        difficultyEstimate: ex.difficultyEstimate,
        playedMoveSan: ex.playedMoveSan,
        bestMoveSan: ex.bestMoveSan,
        engineEvaluation: ex.evalBefore,
        evalSwingCp: ex.evalSwing,
        gameId: ex.gameId,
        ply: ex.ply,
        exerciseType: cognitive?.exerciseType ?? "tactical",
        recallData: cognitive?.recallData,
        visualizationData: cognitive?.visualizationData,
        reconstructionData: cognitive?.reconstructionData
          ? { gameMoveSan: cognitive.reconstructionData.gameMoveSan }
          : undefined,
        rationale: cognitive?.rationale,
        patternCategory: cognitive?.patternCategory,
        reasonCodes: ex.reasonCodes,
      };
    });

    return { exercises: views, error: null };
  } catch (e) {
    return { exercises: [], error: `Failed to load session: ${e}` };
  }
}

export async function submitMove(
  sessionId: string,
  exerciseIndex: number,
  moveInput: string
): Promise<GradeResult> {
  // Get cached exercises
  let exercises = getCachedExercises(sessionId);
  if (!exercises) {
    // Re-load if cache expired
    const data = await loadStudySession(sessionId);
    if (!data) {
      return { valid: false, error: "Session not found", attempt: null };
    }
    exercises = data.exercises;
    sessionCache.set(sessionId, { exercises, loadedAt: Date.now() });
  }

  const exercise = exercises[exerciseIndex];
  if (!exercise) {
    return { valid: false, error: "Exercise not found", attempt: null };
  }

  // Delegate to engine logic
  return validateAndGradeMove(exercise, exerciseIndex, moveInput);
}

export async function completeSession(
  sessionId: string,
  rawAttempts: Array<{
    exerciseId: string;
    exerciseIndex: number;
    fen: string;
    sideToMove: string;
    lessonCategory: string;
    difficultyEstimate: string;
    playedMoveSan: string;
    userMove: string;
    userMoveUci: string;
    engineMove: string;
    engineMoveUci: string;
    isCorrect: boolean;
    gradingTier: string;
    evalLossCp: number | null;
    timestamp: string;
  }>,
  startedAt: string
): Promise<CompletionResult> {
  // Reconstruct PuzzleAttempt[] (cast strings back to branded types)
  const attempts: PuzzleAttempt[] = rawAttempts as unknown as PuzzleAttempt[];
  return completeStudySession(sessionId, attempts, startedAt);
}

// Cognitive Exercise Actions

export async function submitRecallAttempt(
  sessionId: string,
  exerciseId: string,
  originalFen: string,
  reconstructedPieces: Array<{ square: string; piece: string }>,
  timeTakenMs: number
): Promise<RecallGradeResult> {
  return validateAndGradeRecall({
    exerciseId,
    originalFen,
    reconstructedPieces,
    timeTakenMs,
  });
}

export async function submitVisualizationAnswer(
  sessionId: string,
  exerciseId: string,
  answer: string,
  timeTakenMs: number,
  question: { type: string; prompt: string; correctAnswer: string; options?: string[] }
): Promise<VisualizationGradeResult> {
  return validateAndGradeVisualization(
    { exerciseId, answer, timeTakenMs },
    question as any
  );
}

export async function submitReconstructionMove(
  sessionId: string,
  exerciseIndex: number,
  moveInput: string
): Promise<GradeResult> {
  // Use the same grading logic as tactical (engine move comparison)
  // The study player handles the three-way display
  let exercises = getCachedExercises(sessionId);
  if (!exercises) {
    const data = await loadStudySession(sessionId);
    if (!data) {
      return { valid: false, error: "Session not found", attempt: null };
    }
    exercises = data.exercises;
    sessionCache.set(sessionId, { exercises, loadedAt: Date.now() });
  }

  const exercise = exercises[exerciseIndex];
  if (!exercise) {
    return { valid: false, error: "Exercise not found", attempt: null };
  }

  return validateAndGradeMove(exercise, exerciseIndex, moveInput);
}



