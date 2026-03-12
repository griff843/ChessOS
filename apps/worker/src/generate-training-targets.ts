import { resolve, dirname } from "path";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  appendFileSync,
} from "fs";
import {
  buildGameTrainingTargets,
  formatTrainingTargetsMd,
  PRODUCTION_EXCLUDED_FEATURES,
} from "@chess-os/training";
import type { TrainingDatasetRow, DecisionTreeParams } from "@chess-os/training";
import { getIntelligenceOutputDir, getModelsOutputDir } from "@chess-os/db";

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

export function generateTrainingTargets(topN = parseInt(process.env.TOP_N ?? "10", 10)) {
  console.log("[targets] chess-os training target generation (M5C)");
  const projectRoot = findProjectRoot();
  const modelsDir = getModelsOutputDir();
  const ablationPath = resolve(modelsDir, "feature-ablation.json");
  const treeModelPath = resolve(modelsDir, "tree-model.json");

  let treeParams: DecisionTreeParams;
  if (existsSync(ablationPath)) {
    const ablation = JSON.parse(readFileSync(ablationPath, "utf-8"));
    const configB = ablation.configs?.find(
      (config: { excludedFeatures: string[] }) => config.excludedFeatures.includes("moverIsBlack")
    );

    if (!configB?.treeParams) {
      throw new Error("[targets] Config B (no moverIsBlack) not found in ablation artifact");
    }

    treeParams = configB.treeParams;
    console.log(
      `[targets] loaded Config B tree (${configB.featureCount} features, excludes: ${PRODUCTION_EXCLUDED_FEATURES.join(", ")})`
    );
  } else {
    if (!existsSync(treeModelPath)) {
      throw new Error(`[targets] model artifact not found: ${treeModelPath}`);
    }

    treeParams = JSON.parse(readFileSync(treeModelPath, "utf-8")) as DecisionTreeParams;
    console.log("[targets] feature ablation artifact missing; falling back to tree-model.json");
  }

  const gamesDir = resolve(projectRoot, "out", "games");
  if (!existsSync(gamesDir)) {
    throw new Error(`[targets] no games found: ${gamesDir}`);
  }

  const targetGameId = process.env.GAME_ID;
  const gameDirs = targetGameId
    ? [targetGameId]
    : readdirSync(gamesDir)
        .filter((dirName) => existsSync(resolve(gamesDir, dirName, "training-dataset.json")))
        .sort();

  console.log(`[targets] processing ${gameDirs.length} game(s)${targetGameId ? ` (GAME_ID=${targetGameId})` : ""}`);

  const aggregatedDir = resolve(projectRoot, "out", "datasets");
  mkdirSync(aggregatedDir, { recursive: true });
  const aggregatedPath = resolve(aggregatedDir, "training-targets.jsonl");
  writeFileSync(aggregatedPath, "", "utf-8");

  let totalPositions = 0;
  let totalCandidates = 0;
  let totalTargets = 0;
  const typeCounts = new Map<string, number>();

  for (const gameId of gameDirs) {
    const datasetPath = resolve(gamesDir, gameId, "training-dataset.json");
    if (!existsSync(datasetPath)) continue;

    const dataset = JSON.parse(readFileSync(datasetPath, "utf-8"));
    const rows: TrainingDatasetRow[] = dataset.rows;
    const result = buildGameTrainingTargets(rows, treeParams, topN);
    const outDir = getIntelligenceOutputDir(gameId);
    mkdirSync(outDir, { recursive: true });

    writeFileSync(resolve(outDir, "training-targets.json"), JSON.stringify(result, null, 2), "utf-8");
    writeFileSync(resolve(outDir, "training-targets.md"), formatTrainingTargetsMd(result), "utf-8");

    for (const target of result.targets) {
      appendFileSync(aggregatedPath, JSON.stringify(target) + "\n", "utf-8");
    }

    totalPositions += result.totalPositions;
    totalCandidates += result.totalCandidates;
    totalTargets += result.targets.length;

    for (const target of result.targets) {
      typeCounts.set(target.targetType, (typeCounts.get(target.targetType) ?? 0) + 1);
    }
  }

  console.log("\n[targets] == generation complete ==");
  console.log(`[targets] games processed: ${gameDirs.length}`);
  console.log(`[targets] total positions: ${totalPositions}`);
  console.log(`[targets] total candidates: ${totalCandidates}`);
  console.log(`[targets] total targets: ${totalTargets}`);
  for (const [type, count] of typeCounts) {
    console.log(`[targets] ${type}: ${count}`);
  }
  console.log(`[targets] aggregated: ${aggregatedPath}`);

  return {
    gamesProcessed: gameDirs.length,
    totalPositions,
    totalCandidates,
    totalTargets,
    aggregatedPath,
  };
}

if (require.main === module) {
  try {
    generateTrainingTargets();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "[targets] generation failed");
    process.exit(1);
  }
}
