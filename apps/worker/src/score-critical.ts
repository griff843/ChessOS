import { resolve, dirname } from "path";
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import {
  buildGameCriticalPositions,
  formatCriticalPositionsMd,
  runMoverColorAudit,
  loadDataset,
} from "@chess-os/training";
import type { TrainingDatasetRow } from "@chess-os/training";
import type { DecisionTreeParams } from "@chess-os/training";
import {
  getIntelligenceOutputDir,
  getModelsOutputDir,
  getAggregatedDatasetPath,
} from "@chess-os/db";

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

function main(): void {
  console.log("[score] chess-os critical position scoring (M5A)");

  const projectRoot = findProjectRoot();
  const modelsDir = getModelsOutputDir();

  // 1. Load tree model artifact
  const treePath = resolve(modelsDir, "tree-model.json");
  if (!existsSync(treePath)) {
    console.error(`[score] tree model not found: ${treePath}`);
    console.error("[score] run training first: pnpm --filter worker run train-model");
    process.exit(1);
  }

  const treeArtifact = JSON.parse(readFileSync(treePath, "utf-8"));
  const treeParams: DecisionTreeParams = {
    root: treeArtifact.root,
    maxDepth: treeArtifact.config.maxDepth,
    featureCount: treeArtifact.featureNames.length,
  };

  console.log(`[score] loaded tree model: ${treePath}`);

  // 2. Find games to score
  const gamesDir = resolve(projectRoot, "out", "games");
  if (!existsSync(gamesDir)) {
    console.error(`[score] no games found: ${gamesDir}`);
    process.exit(1);
  }

  const targetGameId = process.env.GAME_ID;
  const gameDirs = targetGameId
    ? [targetGameId]
    : readdirSync(gamesDir).filter((d) =>
        existsSync(resolve(gamesDir, d, "training-dataset.json"))
      ).sort();

  console.log(
    `[score] scoring ${gameDirs.length} game(s)${targetGameId ? ` (GAME_ID=${targetGameId})` : ""}`
  );

  const topN = parseInt(process.env.TOP_N ?? "5", 10);

  // 3. Score each game
  let totalPositions = 0;
  let totalCritical = 0;

  for (const gameId of gameDirs) {
    const datasetPath = resolve(gamesDir, gameId, "training-dataset.json");
    if (!existsSync(datasetPath)) {
      console.warn(`[score] skipping ${gameId}: no training-dataset.json`);
      continue;
    }

    const dataset = JSON.parse(readFileSync(datasetPath, "utf-8"));
    const rows: TrainingDatasetRow[] = dataset.rows;

    const result = buildGameCriticalPositions(rows, treeParams, topN);

    // Write JSON artifact
    const outDir = getIntelligenceOutputDir(gameId);
    mkdirSync(outDir, { recursive: true });

    const jsonPath = resolve(outDir, "critical-positions.json");
    writeFileSync(jsonPath, JSON.stringify(result, null, 2), "utf-8");

    // Write Markdown artifact
    const mdPath = resolve(outDir, "critical-positions.md");
    writeFileSync(mdPath, formatCriticalPositionsMd(result), "utf-8");

    totalPositions += result.totalPositions;
    totalCritical += result.positions.length;

    // Print top positions for this game
    console.log(`\n[score] ── ${gameId} (${rows.length} positions) ──`);
    for (const pos of result.positions) {
      const riskPct = (pos.predictedRisk * 100).toFixed(0);
      const critScore = pos.criticalityScore.toFixed(3);
      console.log(
        `[score]   #${pos.rank} ply=${pos.ply} ${pos.moveSan} (${pos.mover}) ` +
        `risk=${riskPct}% crit=${critScore} label=${pos.actualLabel}`
      );
    }
  }

  // 4. Mover color audit
  console.log("\n[score] ── moverIsBlack audit ──");

  const datasetPath = process.env.DATASET_PATH ?? getAggregatedDatasetPath();
  if (!existsSync(datasetPath)) {
    console.warn(`[score] audit skipped: dataset not found: ${datasetPath}`);
  } else {
    const allRows = loadDataset(datasetPath);

    // Load feature importance value
    const fiPath = resolve(modelsDir, "feature-importance.json");
    let moverIsBlackImportance = 0.273; // fallback
    if (existsSync(fiPath)) {
      const fi = JSON.parse(readFileSync(fiPath, "utf-8"));
      const entry = fi.ranking?.find(
        (r: { featureName: string }) => r.featureName === "moverIsBlack"
      );
      if (entry) moverIsBlackImportance = entry.importance;
    }

    const audit = runMoverColorAudit(allRows, treeParams, moverIsBlackImportance);

    const auditPath = resolve(modelsDir, "mover-color-audit.json");
    writeFileSync(auditPath, JSON.stringify(audit, null, 2), "utf-8");
    console.log(`[score] audit artifact: ${auditPath}`);

    console.log(
      `[score] white: n=${audit.white.count} actual=${(audit.white.positiveRate * 100).toFixed(1)}% predicted=${(audit.white.predictedPositiveRate * 100).toFixed(1)}%`
    );
    console.log(
      `[score] black: n=${audit.black.count} actual=${(audit.black.positiveRate * 100).toFixed(1)}% predicted=${(audit.black.predictedPositiveRate * 100).toFixed(1)}%`
    );
    console.log(`[score] finding: ${audit.finding}`);
  }

  // 5. Summary
  console.log("\n[score] ══ scoring complete ══");
  console.log(`[score]   games scored: ${gameDirs.length}`);
  console.log(`[score]   total positions: ${totalPositions}`);
  console.log(`[score]   critical positions: ${totalCritical}`);
  console.log(`[score]   artifacts: out/intelligence/<game-id>/critical-positions.{json,md}`);
}

main();
