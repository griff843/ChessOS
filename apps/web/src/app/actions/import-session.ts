"use server";

import { appendFile, mkdir } from "fs/promises";
import { join } from "path";
import { atomicWriteFile } from "@chess-os/db";
import {
  buildStudySession,
  computeDifficultyCalibration,
  createSessionHistoryRecord,
  DEFAULT_SESSION_CONFIG,
  formatSessionMd,
  initProgressStore,
  markExercisesSeen,
  mergeProgressStore,
  prioritizeByProgress,
  refreshDueStatus,
  serializeProgressStore,
  type SessionPerspective,
  type ProgressStore,
} from "@chess-os/training";
import type { TrainingExercise, StudySession, SessionConfig } from "@chess-os/training";
import { revalidatePath } from "next/cache";
import { loadExerciseCorpusRaw, loadProgressStoreRaw } from "@/lib/generation-server";
import { OUT } from "@/lib/paths";
import { importPresetCategories } from "@/lib/import-results";
import type { ImportSessionPreset } from "@/lib/import-types";

export interface GenerateImportSessionResult {
  success: boolean;
  sessionId: string | null;
  redirectPath: string | null;
  exerciseCount: number;
  message: string;
}

const PRESET_LABELS: Record<ImportSessionPreset, string> = {
  tactical_recovery: "Tactical recovery session",
  opening_mistakes: "Opening mistakes session",
  endgame_mistakes: "Endgame mistakes session",
  mixed_improvement: "Mixed improvement session",
};

let launching = false;

function revalidateImportSessionSurfaces() {
  revalidatePath("/import");
  revalidatePath("/sessions");
  revalidatePath("/");
  revalidatePath("/coach");
}

function buildImportSessionArtifact(
  session: StudySession,
  preset: ImportSessionPreset,
  themes: string[]
) {
  return {
    source: "import",
    preset,
    label: PRESET_LABELS[preset],
    games: session.metadata.sourceGames,
    themes,
    exercise_count: session.exerciseCount,
    difficulty: "adaptive",
    created_at: session.createdAt,
    redirect_path: `/training/session/${session.sessionId}`,
  };
}

function filterExercisesForPerspective(
  exercises: TrainingExercise[],
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

export async function generateImportSession(
  preset: ImportSessionPreset,
  perspective: SessionPerspective = "hero"
): Promise<GenerateImportSessionResult> {
  if (launching) {
    return {
      success: false,
      sessionId: null,
      redirectPath: null,
      exerciseCount: 0,
      message: "An import session is already being generated.",
    };
  }

  launching = true;
  try {
    const exercises = await loadExerciseCorpusRaw();
    if (exercises.length === 0) {
      return {
        success: false,
        sessionId: null,
        redirectPath: null,
        exerciseCount: 0,
        message: "Training exercises are missing. Analyze PGNs first.",
      };
    }

    const categories = importPresetCategories(preset);
    const perspectiveExercises = filterExercisesForPerspective(exercises, perspective);
    const filtered = categories
      ? perspectiveExercises.filter((exercise) => categories.includes(exercise.explanation.lessonCategory))
      : perspectiveExercises;

    if (filtered.length === 0) {
      return {
        success: false,
        sessionId: null,
        redirectPath: null,
        exerciseCount: 0,
        message: `No exercises are available for ${PRESET_LABELS[preset].toLowerCase()}.`,
      };
    }

    const calibration = computeDifficultyCalibration(
      perspectiveExercises.map((exercise) => exercise.explanation.difficultyScore)
    );

    const existing = await loadProgressStoreRaw();
    let store: ProgressStore = existing
      ? mergeProgressStore(existing, perspectiveExercises, calibration)
      : initProgressStore(perspectiveExercises, calibration);

    const now = new Date().toISOString();
    refreshDueStatus(store, now);

    const prioritized = prioritizeByProgress(filtered as TrainingExercise[], store);
    const sessionSize = Math.min(20, prioritized.length);
    const config: SessionConfig = {
      ...DEFAULT_SESSION_CONFIG,
      sessionSize,
    };

    const { session } = buildStudySession(prioritized, calibration, config, { selectedPerspective: perspective });
    session.metadata.exerciseTypeMix = undefined;

    const sourceGames = [...new Set(session.exercises.map((exercise) => exercise.gameId))];
    const themes = [...new Set(session.exercises.map((exercise) => exercise.lessonCategory))];

    markExercisesSeen(
      store,
      session.exercises.map((exercise) => exercise.exerciseId),
      session.createdAt
    );

    const sessionDir = join(OUT, "sessions", session.sessionId);
    await mkdir(sessionDir, { recursive: true });
    await atomicWriteFile(join(sessionDir, "study-session.json"), JSON.stringify(session, null, 2));
    await atomicWriteFile(join(sessionDir, "study-session.md"), formatSessionMd(session));
    await atomicWriteFile(
      join(sessionDir, "session.json"),
      JSON.stringify(buildImportSessionArtifact(session, preset, themes), null, 2)
    );

    const historyPath = join(OUT, "progress", "session-history.jsonl");
    await mkdir(join(OUT, "progress"), { recursive: true });
    await appendFile(historyPath, JSON.stringify(createSessionHistoryRecord(session)) + "\n");

    await mkdir(join(OUT, "datasets"), { recursive: true });
    await appendFile(join(OUT, "datasets", "study-sessions.jsonl"), JSON.stringify(session) + "\n");
    await atomicWriteFile(join(OUT, "progress", "exercise-progress.json"), serializeProgressStore(store));

    revalidateImportSessionSurfaces();

    return {
      success: true,
      sessionId: session.sessionId,
      redirectPath: `/training/session/${session.sessionId}`,
      exerciseCount: session.exerciseCount,
      message: `${PRESET_LABELS[preset]} ready with ${session.exerciseCount} exercise(s) from ${sourceGames.length} imported game(s).`,
    };
  } catch (error) {
    return {
      success: false,
      sessionId: null,
      redirectPath: null,
      exerciseCount: 0,
      message: error instanceof Error ? error.message : "Unable to generate an import session.",
    };
  } finally {
    launching = false;
  }
}
