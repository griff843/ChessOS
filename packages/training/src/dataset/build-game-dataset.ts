import type { EvaluatedPosition } from "@chess-os/engine";
import type { FeatureVector, MistakeClassification } from "@chess-os/classifier";
import type { TrainingDatasetRow } from "./types";
import { buildDatasetRow } from "./build-dataset-row";

/**
 * Build the full training dataset for one game.
 *
 * Aligns N evaluated positions, N feature vectors, and N-1 classifications
 * into N-1 dataset rows. Each row pairs the pre-move position (evaluated[i])
 * with its feature vector (features[i]) and the classification of the move
 * played from that position (classifications[i]).
 */
export function buildGameDataset(
  evaluated: EvaluatedPosition[],
  features: FeatureVector[],
  classifications: MistakeClassification[]
): TrainingDatasetRow[] {
  const rows: TrainingDatasetRow[] = [];

  for (let i = 0; i < classifications.length; i++) {
    rows.push(buildDatasetRow(evaluated[i], features[i], classifications[i]));
  }

  return rows;
}
