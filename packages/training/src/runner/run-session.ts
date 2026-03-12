/**
 * Session runner helpers — pure functions for enriching exercises
 * and building puzzle results.
 *
 * These functions handle no I/O. The CLI layer (solve-session.ts)
 * is responsible for file reading/writing and user interaction.
 */

import type { SessionExercise } from "../sessions/types";
import type { TrainingExercise } from "../exercises/types";
import type { EnrichedExercise, PuzzleAttempt, PuzzleResult } from "./types";
import { validateMove } from "@chess-os/chess-core";

/**
 * Convert a SAN move to UCI using chess-core's validateMove.
 * Returns undefined if the SAN is invalid for the position.
 */
function computePlayedMoveUci(
  fen: string,
  playedMoveSan: string
): string | undefined {
  const result = validateMove(fen, playedMoveSan);
  return result.valid ? result.uci ?? undefined : undefined;
}

/**
 * Build a lookup map from exerciseId → TrainingExercise.
 */
export function buildExerciseCorpusMap(
  corpus: TrainingExercise[]
): Map<string, TrainingExercise> {
  const map = new Map<string, TrainingExercise>();
  for (const ex of corpus) {
    map.set(ex.positionId, ex);
  }
  return map;
}

/**
 * Enrich a SessionExercise with full engine answer data from the corpus.
 *
 * SessionExercise only has bestMoveSan. The corpus TrainingExercise
 * has bestMoveUci, pv, evalSwing, reasonCodes — all needed for the runner.
 *
 * Returns undefined if the exercise is not found in the corpus.
 */
export function enrichExercise(
  sessionEx: SessionExercise,
  corpusMap: Map<string, TrainingExercise>
): EnrichedExercise | undefined {
  const full = corpusMap.get(sessionEx.exerciseId);
  if (!full) return undefined;

  // Runner requires a definite engine answer to check correctness
  if (!full.engineAnswer.bestMoveUci || !full.engineAnswer.bestMoveSan) return undefined;

  return {
    exerciseId: sessionEx.exerciseId,
    gameId: sessionEx.gameId,
    ply: sessionEx.ply,
    fen: sessionEx.fen,
    sideToMove: sessionEx.sideToMove,
    phase: sessionEx.phase,
    playedMoveSan: sessionEx.playedMoveSan,
    bestMoveSan: full.engineAnswer.bestMoveSan,
    bestMoveUci: full.engineAnswer.bestMoveUci,
    pv: full.engineAnswer.pv,
    evalBefore: full.engineAnswer.evalBefore,
    evalAfter: full.engineAnswer.evalAfter,
    evalSwing: full.engineAnswer.evalSwing,
    lessonCategory: full.explanation.lessonCategory,
    difficultyEstimate: full.explanation.difficultyEstimate,
    difficultyScore: full.explanation.difficultyScore,
    reasonCodes: full.explanation.reasonCodes,
    targetPriority: sessionEx.targetPriority,
    playedMoveUci: computePlayedMoveUci(sessionEx.fen, sessionEx.playedMoveSan),
  };
}

/**
 * Enrich all session exercises. Skips any not found in corpus.
 */
export function enrichSessionExercises(
  session: { exercises: SessionExercise[] },
  corpus: TrainingExercise[]
): EnrichedExercise[] {
  const corpusMap = buildExerciseCorpusMap(corpus);
  const enriched: EnrichedExercise[] = [];

  for (const ex of session.exercises) {
    const result = enrichExercise(ex, corpusMap);
    if (result) {
      enriched.push(result);
    }
  }

  return enriched;
}

/**
 * Build a PuzzleResult from completed attempts.
 */
export function buildPuzzleResult(
  sessionId: string,
  attempts: PuzzleAttempt[],
  startedAt: string
): PuzzleResult {
  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const total = attempts.length;

  return {
    sessionId,
    startedAt,
    completedAt: new Date().toISOString(),
    totalExercises: total,
    correctCount,
    incorrectCount: total - correctCount,
    accuracy: total > 0 ? correctCount / total : 0,
    attempts,
  };
}

/**
 * Build a record-session compatible result input from puzzle attempts.
 */
export function buildSessionResultInput(
  sessionId: string,
  attempts: PuzzleAttempt[]
): {
  sessionId: string;
  results: Array<{ exerciseId: string; result: "correct" | "incorrect" }>;
} {
  return {
    sessionId,
    results: attempts.map((a) => ({
      exerciseId: a.exerciseId,
      result: a.isCorrect ? "correct" : "incorrect",
    })),
  };
}
