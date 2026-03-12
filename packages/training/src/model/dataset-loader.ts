import { readFileSync } from "fs";
import type { TrainingDatasetRow } from "../dataset/types";

/**
 * Load an aggregated JSONL dataset. Each line is one TrainingDatasetRow.
 */
export function loadDataset(jsonlPath: string): TrainingDatasetRow[] {
  const content = readFileSync(jsonlPath, "utf-8").trim();
  if (content.length === 0) return [];
  return content.split("\n").map((line) => JSON.parse(line) as TrainingDatasetRow);
}
