import { readFile, readdir } from "fs/promises";
import { join } from "path";
import type {
  TrainingExercise,
  ProgressStore,
  SessionHistoryRecord,
  SessionAnalytics,
  CognitiveSessionExercise,
  StudySession,
  ObjectiveProgressState,
} from "@chess-os/training";
import { ROOT, OUT } from "./paths";
import { safeParseJsonl } from "./safe-parse";

export { ROOT, OUT };

export async function loadExerciseCorpusRaw(): Promise<TrainingExercise[]> {
  const corpusPath = join(OUT, "datasets", "training-exercises.jsonl");
  const raw = await readFile(corpusPath, "utf-8");
  const { rows, skipped } = safeParseJsonl<TrainingExercise>(raw, corpusPath);
  if (skipped > 0) {
    console.warn(`[chess-os] Skipped ${skipped} bad lines in training-exercises.jsonl`);
  }
  return rows;
}

export async function loadProgressStoreRaw(): Promise<ProgressStore | null> {
  try {
    const raw = await readFile(join(OUT, "progress", "exercise-progress.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function loadHistoryRecords(): Promise<SessionHistoryRecord[]> {
  try {
    const historyPath = join(OUT, "progress", "session-history.jsonl");
    const raw = await readFile(historyPath, "utf-8");
    const { rows } = safeParseJsonl<SessionHistoryRecord>(raw, historyPath);
    return rows;
  } catch {
    return [];
  }
}

export async function loadObjectiveProgressRaw(): Promise<ObjectiveProgressState | null> {
  try {
    const raw = await readFile(join(OUT, "objective", "objective-progress.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function loadAllStudySessionsRaw(): Promise<StudySession[]> {
  const sessionsDir = join(OUT, "sessions");
  try {
    const entries = await readdir(sessionsDir, { withFileTypes: true });
    const sessions: StudySession[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const raw = await readFile(join(sessionsDir, entry.name, "study-session.json"), "utf-8");
        sessions.push(JSON.parse(raw) as StudySession);
      } catch {
        // Skip malformed session artifacts.
      }
    }
    return sessions;
  } catch {
    return [];
  }
}

export async function loadCognitiveExercises(
  sessionId: string
): Promise<CognitiveSessionExercise[] | null> {
  try {
    const raw = await readFile(join(OUT, "sessions", sessionId, "cognitive-exercises.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function loadAnalyticsMap(): Promise<Record<string, SessionAnalytics> | null> {
  const resultsDir = join(OUT, "results");
  try {
    const entries = await readdir(resultsDir, { withFileTypes: true });
    const map: Record<string, SessionAnalytics> = {};
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const raw = await readFile(join(resultsDir, entry.name, "session-analytics.json"), "utf-8");
        const analytics: SessionAnalytics = JSON.parse(raw);
        map[analytics.sessionId] = analytics;
      } catch {
        // Skip malformed analytics artifacts.
      }
    }
    return Object.keys(map).length > 0 ? map : null;
  } catch {
    return null;
  }
}

