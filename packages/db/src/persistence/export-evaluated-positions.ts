import type { EvaluatedPosition, EngineMode } from "@chess-os/engine";
import type { EvaluatedPositionExport } from "./types";
import { getEvaluatedPositionsPath } from "./export-paths";
import { writeJsonFile } from "./write-json-file";

export interface ExportEvaluatedPositionsInput {
  gameId: string;
  positions: EvaluatedPosition[];
  engineMode: EngineMode;
  engineName: string;
  depth?: number;
  sourceName?: string;
}

/**
 * Compose an evaluated-positions export artifact and write it to disk.
 * Returns the absolute path of the written file.
 */
export function exportEvaluatedPositions(
  input: ExportEvaluatedPositionsInput
): string {
  const artifact: EvaluatedPositionExport = {
    gameId: input.gameId,
    source: {
      format: "pgn",
      name: input.sourceName,
    },
    engine: {
      mode: input.engineMode,
      name: input.engineName,
      depth: input.depth,
    },
    createdAt: new Date().toISOString(),
    positions: input.positions,
  };

  const outputPath = getEvaluatedPositionsPath(input.gameId);
  writeJsonFile(outputPath, artifact);
  return outputPath;
}
