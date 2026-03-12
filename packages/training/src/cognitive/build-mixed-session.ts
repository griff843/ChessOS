/**
 * Build a mixed-type study session combining tactical, recall,
 * visualization, and reconstruction exercises.
 */

import type { TrainingExercise, DifficultyEstimate } from "../exercises/types";
import type {
  StudySession,
  DifficultyCalibration,
  SessionConfig,
} from "../sessions/types";
import { DEFAULT_SESSION_CONFIG } from "../sessions/types";
import { selectSessionExercises } from "../sessions/select-session-exercises";
import type {
  ExerciseTypeMix,
  CognitiveSessionExercise,
  MixRationale,
} from "./types";
import { DEFAULT_EXERCISE_TYPE_MIX } from "./types";
import { generateRecallExercises } from "./generate-recall";
import { generateVisualizationExercises } from "./generate-visualization";
import { detectTacticalPatterns } from "./detect-patterns";
import { buildMixRationale } from "./build-mix-rationale";

function generateSessionId(exerciseIds: string[]): string {
  const key = [...exerciseIds].sort().join("|");
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return `session-${hex}`;
}

function scaleDifficultyDistribution(
  base: { easy: number; medium: number; hard: number },
  targetSize: number
): { easy: number; medium: number; hard: number } {
  if (targetSize <= 0) return { easy: 0, medium: 0, hard: 0 };

  const totalBase = base.easy + base.medium + base.hard;
  if (totalBase <= 0) return { easy: targetSize, medium: 0, hard: 0 };

  const scaled = {
    easy: Math.floor((base.easy / totalBase) * targetSize),
    medium: Math.floor((base.medium / totalBase) * targetSize),
    hard: Math.floor((base.hard / totalBase) * targetSize),
  };

  let remaining = targetSize - (scaled.easy + scaled.medium + scaled.hard);
  const order: Array<"medium" | "easy" | "hard"> = ["medium", "easy", "hard"];
  let idx = 0;
  while (remaining > 0) {
    const key = order[idx % order.length];
    scaled[key]++;
    remaining--;
    idx++;
  }

  return scaled;
}

export function buildMixedSession(
  exercises: TrainingExercise[],
  calibration: DifficultyCalibration,
  sessionConfig: SessionConfig = DEFAULT_SESSION_CONFIG,
  typeMix: ExerciseTypeMix = DEFAULT_EXERCISE_TYPE_MIX
): {
  session: StudySession;
  cognitiveExercises: CognitiveSessionExercise[];
  mixRationale: MixRationale;
} {
  const totalRequested =
    typeMix.tactical +
    typeMix.recall +
    typeMix.visualization +
    typeMix.reconstruction;
  const sessionSize = Math.min(totalRequested, sessionConfig.sessionSize);
  const degradationNotes: string[] = [];

  const usedIds = new Set<string>();

  const recallExercises = generateRecallExercises(
    exercises.filter((ex) => !usedIds.has(ex.positionId)),
    typeMix.recall
  ).map((ex) => ({
    ...ex,
    rationale: "Selected for position-memory reconstruction under timed reveal/hide window.",
  }));
  for (const ex of recallExercises) usedIds.add(ex.exerciseId);

  if (recallExercises.length < typeMix.recall) {
    degradationNotes.push(
      `Recall: requested ${typeMix.recall}, only ${recallExercises.length} candidates available`
    );
  }

  const vizExercises = generateVisualizationExercises(
    exercises.filter((ex) => !usedIds.has(ex.positionId)),
    typeMix.visualization
  ).map((ex) => ({
    ...ex,
    rationale: "Selected to train boardless calculation and deterministic result inference.",
  }));
  for (const ex of vizExercises) usedIds.add(ex.exerciseId);

  if (vizExercises.length < typeMix.visualization) {
    degradationNotes.push(
      `Visualization: requested ${typeMix.visualization}, only ${vizExercises.length} candidates available`
    );
  }

  const reconstructionCandidates = exercises.filter(
    (ex) =>
      !usedIds.has(ex.positionId) &&
      ex.engineAnswer.bestMoveSan &&
      ex.playedMoveSan
  );

  const reconstructionExercises: CognitiveSessionExercise[] = [];
  for (
    let i = 0;
    i < Math.min(typeMix.reconstruction, reconstructionCandidates.length);
    i++
  ) {
    const ex = reconstructionCandidates[i];
    usedIds.add(ex.positionId);
    reconstructionExercises.push({
      exerciseId: ex.positionId,
      exerciseType: "reconstruction",
      fen: ex.fen,
      sideToMove: ex.sideToMove,
      phase: ex.phase,
      lessonCategory: ex.explanation.lessonCategory,
      difficultyEstimate: ex.explanation.difficultyEstimate,
      difficultyScore: ex.explanation.difficultyScore,
      targetPriority: ex.targetPriority,
      rationale: "Selected for game continuation reconstruction with exact and acceptable move grading.",
      reconstructionData: {
        gameMoveSan: ex.playedMoveSan,
        engineMoveSan: ex.engineAnswer.bestMoveSan,
      },
    });
  }

  if (reconstructionExercises.length < typeMix.reconstruction) {
    degradationNotes.push(
      `Reconstruction: requested ${typeMix.reconstruction}, only ${reconstructionExercises.length} candidates available`
    );
  }

  const cognitiveCount =
    recallExercises.length +
    vizExercises.length +
    reconstructionExercises.length;
  const tacticalSlots = Math.max(0, sessionSize - cognitiveCount);

  const tacticalPool = exercises.filter((ex) => !usedIds.has(ex.positionId));
  const tacticalConfig: SessionConfig = {
    ...sessionConfig,
    sessionSize: tacticalSlots,
    difficultyDistribution: scaleDifficultyDistribution(
      sessionConfig.difficultyDistribution,
      tacticalSlots
    ),
  };

  const tacticalSelected =
    tacticalSlots > 0
      ? selectSessionExercises(tacticalPool, calibration, tacticalConfig)
      : [];

  const tacticalCognitive: CognitiveSessionExercise[] = tacticalSelected.map(
    (ex) => {
      const source = exercises.find((e) => e.positionId === ex.exerciseId);
      const patterns = source?.engineAnswer.bestMoveUci
        ? detectTacticalPatterns(ex.fen, source.engineAnswer.bestMoveUci, ex.phase)
        : (["unclassified"] as const);
      const patternCategory = patterns[0] ?? "unclassified";

      return {
        exerciseId: ex.exerciseId,
        exerciseType: "tactical",
        fen: ex.fen,
        sideToMove: ex.sideToMove,
        phase: ex.phase,
        lessonCategory: ex.lessonCategory,
        difficultyEstimate: ex.difficultyEstimate,
        difficultyScore: ex.difficultyScore,
        targetPriority: ex.targetPriority,
        rationale: `Selected for tactical pattern execution (${patternCategory.replace("_", " ")}).`,
        patternCategory,
        tacticalData: {
          playedMoveSan: ex.playedMoveSan,
          bestMoveSan: ex.bestMoveSan!,
          patterns: [...patterns],
        },
      };
    }
  );

  const allCognitive: CognitiveSessionExercise[] = [
    ...tacticalCognitive,
    ...recallExercises,
    ...vizExercises,
    ...reconstructionExercises,
  ];

  const sessionExercises = [
    ...tacticalSelected.map((ex) => ({ ...ex, exerciseType: "tactical" as const })),
    ...recallExercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      gameId: "",
      ply: 0,
      fen: ex.fen,
      sideToMove: ex.sideToMove,
      phase: ex.phase,
      playedMoveSan: "",
      bestMoveSan: undefined as string | undefined,
      lessonCategory: ex.lessonCategory,
      difficultyEstimate: ex.difficultyEstimate,
      difficultyScore: ex.difficultyScore,
      predictedRisk: 0,
      targetPriority: ex.targetPriority,
      exerciseType: "recall" as const,
    })),
    ...vizExercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      gameId: "",
      ply: 0,
      fen: ex.fen,
      sideToMove: ex.sideToMove,
      phase: ex.phase,
      playedMoveSan: "",
      bestMoveSan: undefined as string | undefined,
      lessonCategory: ex.lessonCategory,
      difficultyEstimate: ex.difficultyEstimate,
      difficultyScore: ex.difficultyScore,
      predictedRisk: 0,
      targetPriority: ex.targetPriority,
      exerciseType: "visualization" as const,
    })),
    ...reconstructionExercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      gameId: "",
      ply: 0,
      fen: ex.fen,
      sideToMove: ex.sideToMove,
      phase: ex.phase,
      playedMoveSan: ex.reconstructionData?.gameMoveSan ?? "",
      bestMoveSan: ex.reconstructionData?.engineMoveSan,
      lessonCategory: ex.lessonCategory,
      difficultyEstimate: ex.difficultyEstimate,
      difficultyScore: ex.difficultyScore,
      predictedRisk: 0,
      targetPriority: ex.targetPriority,
      exerciseType: "reconstruction" as const,
    })),
  ];

  const difficultyDistribution: Record<DifficultyEstimate, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
  };
  const categoryDistribution: Record<string, number> = {};
  const sourceGames = new Set<string>();
  const typeMixActual: Record<string, number> = {
    tactical: tacticalCognitive.length,
    recall: recallExercises.length,
    visualization: vizExercises.length,
    reconstruction: reconstructionExercises.length,
  };

  for (const ex of sessionExercises) {
    difficultyDistribution[ex.difficultyEstimate]++;
    categoryDistribution[ex.lessonCategory] =
      (categoryDistribution[ex.lessonCategory] ?? 0) + 1;
    if (ex.gameId) sourceGames.add(ex.gameId);
  }

  const sessionId = generateSessionId(sessionExercises.map((ex) => ex.exerciseId));

  const session: StudySession = {
    sessionId,
    createdAt: new Date().toISOString(),
    exerciseCount: sessionExercises.length,
    exercises: sessionExercises,
    metadata: {
      difficultyDistribution,
      categoryDistribution,
      sourceGames: [...sourceGames].sort(),
      exerciseTypeMix: typeMixActual,
    },
  };

  const mixRationale = buildMixRationale(typeMix, allCognitive, degradationNotes);

  return { session, cognitiveExercises: allCognitive, mixRationale };
}
