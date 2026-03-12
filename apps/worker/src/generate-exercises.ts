import { resolve, dirname } from "path";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  appendFileSync,
} from "fs";
import { buildGameTrainingExercises, formatExercisesMd } from "@chess-os/training";
import type { TrainingDatasetRow, TrainingTargetsResult } from "@chess-os/training";
import { getIntelligenceOutputDir, getExercisesOutputDir } from "@chess-os/db";

function findProjectRoot(): string {
  let dir = process.cwd();
  while (true) {
    const ws = resolve(dir, "pnpm-workspace.yaml");
    try {
      if (existsSync(ws)) return dir;
    } catch {}
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

export function generateTrainingExercises() {
  console.log("[exercises] chess-os training exercise generation (M5D)");
  const projectRoot = findProjectRoot();
  const gamesDir = resolve(projectRoot, "out", "games");

  if (!existsSync(gamesDir)) {
    throw new Error(`[exercises] no games found: ${gamesDir}`);
  }

  const targetGameId = process.env.GAME_ID;
  const gameDirs = targetGameId
    ? [targetGameId]
    : readdirSync(gamesDir)
        .filter((dirName) => existsSync(resolve(gamesDir, dirName, "training-dataset.json")))
        .sort();

  console.log(`[exercises] processing ${gameDirs.length} game(s)${targetGameId ? ` (GAME_ID=${targetGameId})` : ""}`);

  const aggregatedDir = resolve(projectRoot, "out", "datasets");
  mkdirSync(aggregatedDir, { recursive: true });
  const aggregatedPath = resolve(aggregatedDir, "training-exercises.jsonl");
  writeFileSync(aggregatedPath, "", "utf-8");

  let totalTargets = 0;
  let totalExercises = 0;
  const categoryCounts = new Map<string, number>();
  const difficultyCounts = new Map<string, number>();

  for (const gameId of gameDirs) {
    const datasetPath = resolve(gamesDir, gameId, "training-dataset.json");
    if (!existsSync(datasetPath)) continue;

    const intelligenceDir = getIntelligenceOutputDir(gameId);
    const targetsPath = resolve(intelligenceDir, "training-targets.json");
    if (!existsSync(targetsPath)) continue;

    const dataset = JSON.parse(readFileSync(datasetPath, "utf-8"));
    const rows: TrainingDatasetRow[] = dataset.rows;
    const targetsResult: TrainingTargetsResult = JSON.parse(readFileSync(targetsPath, "utf-8"));
    const result = buildGameTrainingExercises(targetsResult, rows);
    const outDir = getExercisesOutputDir(gameId);
    mkdirSync(outDir, { recursive: true });

    writeFileSync(resolve(outDir, "training-exercises.json"), JSON.stringify(result, null, 2), "utf-8");
    writeFileSync(resolve(outDir, "training-exercises.md"), formatExercisesMd(result), "utf-8");

    for (const exercise of result.exercises) {
      appendFileSync(aggregatedPath, JSON.stringify(exercise) + "\n", "utf-8");
    }

    totalTargets += result.totalTargets;
    totalExercises += result.exercises.length;

    for (const exercise of result.exercises) {
      categoryCounts.set(exercise.explanation.lessonCategory, (categoryCounts.get(exercise.explanation.lessonCategory) ?? 0) + 1);
      difficultyCounts.set(exercise.explanation.difficultyEstimate, (difficultyCounts.get(exercise.explanation.difficultyEstimate) ?? 0) + 1);
    }
  }

  console.log("\n[exercises] == generation complete ==");
  console.log(`[exercises] games processed: ${gameDirs.length}`);
  console.log(`[exercises] total targets: ${totalTargets}`);
  console.log(`[exercises] total exercises: ${totalExercises}`);
  for (const [category, count] of categoryCounts) {
    console.log(`[exercises] ${category}: ${count}`);
  }
  for (const [difficulty, count] of difficultyCounts) {
    console.log(`[exercises] ${difficulty}: ${count}`);
  }
  console.log(`[exercises] aggregated: ${aggregatedPath}`);

  return {
    gamesProcessed: gameDirs.length,
    totalTargets,
    totalExercises,
    aggregatedPath,
  };
}

if (require.main === module) {
  try {
    generateTrainingExercises();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "[exercises] generation failed");
    process.exit(1);
  }
}