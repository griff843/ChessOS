import { readFileSync, readdirSync } from "fs";
import { resolve, basename, extname } from "path";
import { pgnToSnapshots } from "@chess-os/chess-core";
import {
  extractFeatures,
  classifyGameMistakes,
  type MistakeLabel,
} from "@chess-os/classifier";
import {
  exportEvaluatedPositions,
  exportTrainingDataset,
  exportTrainingDatasetJsonl,
  getAggregatedDatasetPath,
  initJsonlFile,
  appendJsonlRows,
} from "@chess-os/db";
import {
  createEngine,
  evaluatePosition,
  type AnalysisEngine,
  type EngineMode,
  type EvaluatedPosition,
} from "@chess-os/engine";
import { buildGameDataset, type TrainingDatasetRow } from "@chess-os/training";

const DEFAULT_DEPTH = 20;

export interface SingleGameResult {
  gameId: string;
  positionCount: number;
  rowCount: number;
  rows: TrainingDatasetRow[];
}

export async function processSingleGame(
  pgn: string,
  gameId: string,
  engine: AnalysisEngine,
  engineName: string,
  mode: EngineMode,
  depth: number
): Promise<SingleGameResult> {
  console.log(`[worker] pipeline started for game: ${gameId}`);
  const { snapshots, totalPlies } = pgnToSnapshots(pgn, gameId);
  console.log(`[worker] stage 1 complete: ${totalPlies} plies -> ${snapshots.length} snapshots`);

  const evaluated: EvaluatedPosition[] = [];
  for (const snapshot of snapshots) {
    evaluated.push(await evaluatePosition(snapshot, engine, engineName, depth));
  }
  console.log(`[worker] stage 2 complete: ${evaluated.length} positions evaluated`);

  const evalPath = exportEvaluatedPositions({
    gameId,
    positions: evaluated,
    engineMode: mode,
    engineName,
    depth,
  });
  console.log(`[worker] stage 3 complete: ${evalPath}`);

  const features = evaluated.map(extractFeatures);
  console.log(`[worker] stage 4 complete: ${features.length} feature vectors`);

  const classifications = classifyGameMistakes(evaluated, features);
  const counts: Record<MistakeLabel, number> = {
    best_or_ok: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };
  for (const classification of classifications) counts[classification.label]++;
  console.log(
    `[worker] stage 5 complete: ${classifications.length} classified best_or_ok=${counts.best_or_ok} inaccuracy=${counts.inaccuracy} mistake=${counts.mistake} blunder=${counts.blunder}`
  );

  const rows = buildGameDataset(evaluated, features, classifications);
  const datasetArtifact = {
    gameId,
    source: { format: "pgn" as const },
    engine: { mode, name: engineName, depth },
    createdAt: new Date().toISOString(),
    rowCount: rows.length,
    rows,
  };

  const jsonPath = exportTrainingDataset({ gameId, dataset: datasetArtifact });
  const jsonlPath = exportTrainingDatasetJsonl({ gameId, rows });
  console.log(`[worker] stage 6 complete: ${rows.length} rows -> ${jsonPath}`);
  console.log(`[worker] jsonl -> ${jsonlPath}`);

  if (rows.length > 0) {
    const sample = rows[0];
    console.log(
      `[worker] sample: ply=${sample.ply} ${sample.moveSan} (${sample.mover}) eval=${sample.evalCp}cp swing=${sample.swingCp}cp label=${sample.label} phase=${sample.phase}`
    );
  }

  return {
    gameId,
    positionCount: evaluated.length,
    rowCount: rows.length,
    rows,
  };
}

export async function processDirectory(
  dirPath: string,
  mode: EngineMode = (process.env.ENGINE_MODE ?? "stub") as EngineMode,
  depth: number = DEFAULT_DEPTH
): Promise<void> {
  const engineName = mode === "stockfish" ? "stockfish" : "stub-stockfish";
  const files = readdirSync(dirPath)
    .filter((file) => extname(file).toLowerCase() === ".pgn")
    .sort();

  if (files.length === 0) {
    console.log(`[worker] no .pgn files found in ${dirPath}`);
    return;
  }

  console.log(`[worker] batch: ${files.length} PGN file(s) in ${dirPath} engine=${mode}`);
  const engine = await createEngine({ mode });
  const aggregatedPath = getAggregatedDatasetPath();
  initJsonlFile(aggregatedPath);

  let totalPositions = 0;
  let totalRows = 0;
  let gamesProcessed = 0;

  try {
    for (const file of files) {
      const filePath = resolve(dirPath, file);
      const gameId = basename(file, extname(file));
      const pgn = readFileSync(filePath, "utf-8");
      console.log(`\n[worker] -- game ${gamesProcessed + 1}/${files.length}: ${file} --`);

      const result = await processSingleGame(pgn, gameId, engine, engineName, mode, depth);
      appendJsonlRows(aggregatedPath, result.rows);
      totalPositions += result.positionCount;
      totalRows += result.rowCount;
      gamesProcessed++;
    }
  } finally {
    await engine.quit?.();
  }

  console.log("\n[worker] == batch complete ==");
  console.log(`[worker] games processed: ${gamesProcessed}`);
  console.log(`[worker] total positions evaluated: ${totalPositions}`);
  console.log(`[worker] total dataset rows: ${totalRows}`);
  console.log(`[worker] aggregated dataset: ${aggregatedPath}`);
}

const SAMPLE_PGN = `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. Nbd2 Bb7 12. Bc2 Re8 13. Nf1 Bf8 14. Ng3 g6 15. Bg5 h6 16. Bd2 Bg7 17. a4 c5 18. d5 c4 19. b4 Nh5 20. Nxh5 gxh5 1/2-1/2`;

async function main(): Promise<void> {
  console.log("[worker] chess-os worker booted");
  const pgnDir = process.env.PGN_DIR;

  if (pgnDir) {
    await processDirectory(resolve(pgnDir), (process.env.ENGINE_MODE ?? "stub") as EngineMode, DEFAULT_DEPTH);
    return;
  }

  const mode = (process.env.ENGINE_MODE ?? "stub") as EngineMode;
  const engineName = mode === "stockfish" ? "stockfish" : "stub-stockfish";
  const engine = await createEngine({ mode });
  console.log(`[worker] single-game mode engine=${mode}`);
  try {
    await processSingleGame(SAMPLE_PGN, "sample-game-001", engine, engineName, mode, DEFAULT_DEPTH);
    console.log("[worker] pipeline complete.");
  } finally {
    await engine.quit?.();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[worker] pipeline failed: ${err.message}`);
    process.exit(1);
  });
}

