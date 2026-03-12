/**
 * Build a study session from the exercise corpus.
 *
 * Orchestrates: difficulty calibration → exercise selection → session assembly.
 */

import type { TrainingExercise, DifficultyEstimate } from "../exercises/types";
import type {
  StudySession,
  DifficultyCalibration,
  SessionConfig,
} from "./types";
import { DEFAULT_SESSION_CONFIG } from "./types";
import { computeDifficultyCalibration } from "./rebalance-difficulty";
import { selectSessionExercises } from "./select-session-exercises";

/**
 * Generate a deterministic session ID from the selected exercise IDs.
 *
 * Uses a simple hash: sorts exercise IDs, joins them, and produces
 * a short hex digest via a basic string hash.
 */
function generateSessionId(exerciseIds: string[]): string {
  const key = [...exerciseIds].sort().join("|");
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  // Convert to unsigned hex, pad to 8 chars
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return `session-${hex}`;
}

/**
 * Build a study session from exercises.
 *
 * @param exercises     All available exercises from the corpus
 * @param calibration   Pre-computed difficulty calibration (or undefined to compute)
 * @param config        Session generation config
 */
export function buildStudySession(
  exercises: TrainingExercise[],
  calibration?: DifficultyCalibration,
  config: SessionConfig = DEFAULT_SESSION_CONFIG
): { session: StudySession; calibration: DifficultyCalibration } {
  // 1. Compute calibration if not provided
  const cal =
    calibration ??
    computeDifficultyCalibration(
      exercises.map((ex) => ex.explanation.difficultyScore)
    );

  // 2. Select exercises
  const selected = selectSessionExercises(exercises, cal, config);

  // 3. Compute metadata
  const difficultyDistribution: Record<DifficultyEstimate, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
  };
  const categoryDistribution: Record<string, number> = {};
  const sourceGames = new Set<string>();

  for (const ex of selected) {
    difficultyDistribution[ex.difficultyEstimate]++;
    categoryDistribution[ex.lessonCategory] =
      (categoryDistribution[ex.lessonCategory] ?? 0) + 1;
    sourceGames.add(ex.gameId);
  }

  // 4. Generate deterministic session ID
  const sessionId = generateSessionId(
    selected.map((ex) => ex.exerciseId)
  );

  const session: StudySession = {
    sessionId,
    createdAt: new Date().toISOString(),
    exerciseCount: selected.length,
    exercises: selected,
    metadata: {
      difficultyDistribution,
      categoryDistribution,
      sourceGames: [...sourceGames].sort(),
    },
  };

  return { session, calibration: cal };
}
