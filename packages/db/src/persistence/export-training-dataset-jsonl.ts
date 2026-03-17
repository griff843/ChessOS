import { getTrainingDatasetJsonlPath } from "./export-paths";
import { writeJsonlFile } from "./write-jsonl-file";

export interface ExportTrainingDatasetJsonlInput {
  gameId: string;
  rows: unknown[];
}

/**
 * Persist a per-game training dataset as JSONL (one row per line).
 * Returns the output file path.
 */
export function exportTrainingDatasetJsonl(
  input: ExportTrainingDatasetJsonlInput
): string {
  const outputPath = getTrainingDatasetJsonlPath(input.gameId);
  writeJsonlFile(outputPath, input.rows);
  return outputPath;
}
