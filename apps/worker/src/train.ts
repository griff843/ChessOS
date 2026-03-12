import { resolve, dirname } from "path";
import { existsSync } from "fs";
import { runTrainPipeline } from "@chess-os/training";
import { getAggregatedDatasetPath } from "@chess-os/db";

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

export function runTrainingModel(datasetPath = process.env.DATASET_PATH ?? getAggregatedDatasetPath()) {
  console.log("[train] chess-os model training (M4C)");

  if (!existsSync(datasetPath)) {
    throw new Error(`[train] dataset not found: ${datasetPath}`);
  }

  const outputDir = resolve(findProjectRoot(), "out", "models");
  const result = runTrainPipeline(datasetPath, outputDir);

  console.log("\n[train] == training complete ==");
  console.log(`[train] dataset: ${result.totalRows} rows`);
  console.log(`[train] split: train=${result.trainSize} val=${result.valSize} test=${result.testSize}`);
  for (const model of result.models) {
    console.log(`[train] ${model.name}: test F1=${(model.test.f1 * 100).toFixed(1)}%`);
  }
  console.log(`[train] logistic model: ${result.logisticArtifactPath}`);
  console.log(`[train] tree model: ${result.treeArtifactPath}`);
  console.log(`[train] feature importance: ${result.featureImportancePath}`);
  console.log(`[train] threshold analysis: ${result.thresholdAnalysisPath}`);
  console.log(`[train] cross-validation: ${result.crossValidationPath}`);
  console.log(`[train] report: ${result.evaluationReportPath}`);
  return result;
}

if (require.main === module) {
  try {
    runTrainingModel();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "[train] training failed");
    process.exit(1);
  }
}