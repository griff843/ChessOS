import { resolve, dirname } from "path";
import { existsSync } from "fs";

/**
 * Find the monorepo root by walking up from cwd looking for pnpm-workspace.yaml.
 * Ensures `out/` artifacts land at the project root, not inside individual packages.
 */
function findProjectRoot(): string {
  let dir = process.cwd();
  while (true) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return process.cwd();
}

/**
 * Canonical output directory for a game's artifacts.
 * Resolves to `<project-root>/out/games/<gameId>/`.
 */
export function getGameOutputDir(gameId: string): string {
  return resolve(findProjectRoot(), "out", "games", gameId);
}

/**
 * Canonical path for the evaluated positions JSON artifact.
 */
export function getEvaluatedPositionsPath(gameId: string): string {
  return resolve(getGameOutputDir(gameId), "evaluated-positions.json");
}

/**
 * Canonical path for the training dataset JSON artifact.
 */
export function getTrainingDatasetPath(gameId: string): string {
  return resolve(getGameOutputDir(gameId), "training-dataset.json");
}

/**
 * Canonical path for the per-game training dataset JSONL artifact.
 */
export function getTrainingDatasetJsonlPath(gameId: string): string {
  return resolve(getGameOutputDir(gameId), "training-dataset.jsonl");
}

/**
 * Canonical path for the aggregated global dataset.
 * Resolves to `<project-root>/out/datasets/all-games.jsonl`.
 */
export function getAggregatedDatasetPath(): string {
  return resolve(findProjectRoot(), "out", "datasets", "all-games.jsonl");
}

/**
 * Canonical output directory for intelligence artifacts.
 * Resolves to `<project-root>/out/intelligence/<gameId>/`.
 */
export function getIntelligenceOutputDir(gameId: string): string {
  return resolve(findProjectRoot(), "out", "intelligence", gameId);
}

/**
 * Canonical path for the models output directory.
 * Resolves to `<project-root>/out/models/`.
 */
export function getModelsOutputDir(): string {
  return resolve(findProjectRoot(), "out", "models");
}

/**
 * Canonical output directory for exercise artifacts.
 * Resolves to `<project-root>/out/exercises/<gameId>/`.
 */
export function getExercisesOutputDir(gameId: string): string {
  return resolve(findProjectRoot(), "out", "exercises", gameId);
}

/**
 * Canonical output directory for study session artifacts.
 * Resolves to `<project-root>/out/sessions/<sessionId>/`.
 */
export function getSessionOutputDir(sessionId: string): string {
  return resolve(findProjectRoot(), "out", "sessions", sessionId);
}

/**
 * Canonical output directory for progress tracking artifacts.
 * Resolves to `<project-root>/out/progress/`.
 */
export function getProgressDir(): string {
  return resolve(findProjectRoot(), "out", "progress");
}

/**
 * Canonical output directory for puzzle result artifacts.
 * Resolves to `<project-root>/out/results/<sessionId>/`.
 */
export function getResultsOutputDir(sessionId: string): string {
  return resolve(findProjectRoot(), "out", "results", sessionId);
}

/**
 * Canonical output directory for dashboard/analytics artifacts.
 * Resolves to `<project-root>/out/dashboard/`.
 */
export function getDashboardDir(): string {
  return resolve(findProjectRoot(), "out", "dashboard");
}

/**
 * Canonical output directory for coach/study-guidance artifacts.
 * Resolves to `<project-root>/out/coach/`.
 */
export function getCoachDir(): string {
  return resolve(findProjectRoot(), "out", "coach");
}

/**
 * Canonical output directory for curriculum planner artifacts.
 * Resolves to `<project-root>/out/curriculum/`.
 */
export function getCurriculumDir(): string {
  return resolve(findProjectRoot(), "out", "curriculum");
}

/**
 * Canonical output directory for learning artifacts.
 * Resolves to `<project-root>/out/learning/`.
 */
export function getLearningDir(): string {
  return resolve(findProjectRoot(), "out", "learning");
}

/**
 * Canonical output directory for concept graph artifacts.
 * Resolves to `<project-root>/out/concepts/`.
 */
export function getConceptsDir(): string {
  return resolve(findProjectRoot(), "out", "concepts");
}

/**
 * Canonical output directory for opening intelligence artifacts.
 * Resolves to `<project-root>/out/openings/`.
 */
export function getOpeningsDir(): string {
  return resolve(findProjectRoot(), "out", "openings");
}
