import { readdir, readFile } from "fs/promises";
import { basename, extname, resolve } from "path";
import { pgnToSnapshots } from "@chess-os/chess-core";
import {
  extractFeatures,
  classifyGameMistakes,
  type MistakeLabel,
} from "../../../../packages/classifier/src/index";
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
  type EngineMode,
  type EvaluatedPosition,
} from "../../../../packages/engine/src/index";
import { buildGameDataset, type TrainingDatasetRow } from "@chess-os/training";

export interface ImportBatchResult {
  gamesProcessed: number;
  totalPositions: number;
  totalRows: number;
  aggregatedPath: string;
}

export async function runImportEvaluationBatch(
  dirPath: string,
  mode: EngineMode = "stockfish",
  depth = 20
): Promise<ImportBatchResult> {
  const files = (await readdir(dirPath, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".pgn")
    .map((entry) => entry.name)
    .sort();

  if (files.length === 0) {
    return {
      gamesProcessed: 0,
      totalPositions: 0,
      totalRows: 0,
      aggregatedPath: getAggregatedDatasetPath(),
    };
  }

  const engineName = mode === "stockfish" ? "stockfish" : "stub-stockfish";
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
      const pgn = await readFile(filePath, "utf-8");
      const { snapshots } = pgnToSnapshots(pgn, gameId);

      const evaluated: EvaluatedPosition[] = [];
      for (const snapshot of snapshots) {
        evaluated.push(await evaluatePosition(snapshot, engine, engineName, depth));
      }

      exportEvaluatedPositions({
        gameId,
        positions: evaluated,
        engineMode: mode,
        engineName,
        depth,
      });

      const features = evaluated.map(extractFeatures);
      const classifications = classifyGameMistakes(evaluated, features);
      const counts: Record<MistakeLabel, number> = {
        best_or_ok: 0,
        inaccuracy: 0,
        mistake: 0,
        blunder: 0,
      };
      for (const classification of classifications) counts[classification.label]++;

      const rows: TrainingDatasetRow[] = buildGameDataset(evaluated, features, classifications);
      exportTrainingDataset({
        gameId,
        dataset: {
          gameId,
          source: { format: "pgn" as const },
          engine: { mode, name: engineName, depth },
          createdAt: new Date().toISOString(),
          rowCount: rows.length,
          rows,
        },
      });
      exportTrainingDatasetJsonl({ gameId, rows });
      appendJsonlRows(aggregatedPath, rows);

      totalPositions += evaluated.length;
      totalRows += rows.length;
      gamesProcessed += 1;
    }
  } finally {
    await engine.quit?.();
  }

  return {
    gamesProcessed,
    totalPositions,
    totalRows,
    aggregatedPath,
  };
}

