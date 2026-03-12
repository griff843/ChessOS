import { getTrainingDatasetPath } from "./export-paths";
import { writeJsonFile } from "./write-json-file";

export interface ExportTrainingDatasetInput {
  gameId: string;
  dataset: unknown;
}

/**
 * Persist a training dataset artifact to the canonical path.
 * Returns the output file path.
 */
export function exportTrainingDataset(
  input: ExportTrainingDatasetInput
): string {
  const outputPath = getTrainingDatasetPath(input.gameId);
  writeJsonFile(outputPath, input.dataset);
  return outputPath;
}
