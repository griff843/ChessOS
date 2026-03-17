import { writeFileSync, mkdirSync } from "fs";
import { loadDataset } from "./dataset-loader";
import {
  stratifiedSplit,
  DEFAULT_SPLIT_RATIOS,
  DEFAULT_SEED,
} from "./train-test-split";
import {
  rowsToFeatureMatrix,
  computeStandardization,
  standardize,
  FEATURE_NAMES,
} from "./feature-matrix";
import { LogisticRegression, computeClassWeights } from "./baseline-model";
import {
  DecisionTree,
  DEFAULT_MAX_DEPTH,
  DEFAULT_MIN_SAMPLES_LEAF,
} from "./decision-tree";
import {
  evaluateModel,
  formatEvaluationReport,
  type EvaluationMetrics,
  type ModelMetrics,
} from "./evaluate-model";
import { computeFeatureImportance, type FeatureImportanceResult } from "./feature-importance";
import { tuneThreshold, applyThreshold, type ThresholdTuningResult } from "./threshold-tuning";
import { runCrossValidation, type CrossValidationResult } from "./cross-validation";
import type { TrainingDatasetRow } from "../dataset/types";

const DEFAULT_EPOCHS = 200;
const DEFAULT_LEARNING_RATE = 0.1;

/** Binary target function for stratified splitting. */
function getTarget(row: TrainingDatasetRow): number {
  return row.label === "best_or_ok" ? 0 : 1;
}

export interface TrainPipelineResult {
  models: ModelMetrics[];
  logisticArtifactPath: string;
  treeArtifactPath: string;
  evaluationReportPath: string;
  featureImportancePath: string;
  thresholdAnalysisPath: string;
  crossValidationPath: string;
  totalRows: number;
  trainSize: number;
  valSize: number;
  testSize: number;
  featureImportance: FeatureImportanceResult;
  thresholdTuning: ThresholdTuningResult;
  crossValidation: CrossValidationResult;
}

/**
 * Run the full training pipeline:
 *   load → stratified split → features → standardize
 *   → train both models → evaluate
 *   → feature importance → threshold tuning → cross-validation
 *   → persist all artifacts
 */
export function runTrainPipeline(
  datasetPath: string,
  outputDir: string
): TrainPipelineResult {
  // 1. Load dataset
  console.log(`[train] loading dataset: ${datasetPath}`);
  const rows = loadDataset(datasetPath);
  console.log(`[train] loaded ${rows.length} rows`);

  if (rows.length < 10) {
    throw new Error(
      `Dataset too small (${rows.length} rows). Need at least 10 rows.`
    );
  }

  // Class distribution
  const nPos = rows.filter((r) => getTarget(r) === 1).length;
  const nNeg = rows.length - nPos;
  console.log(
    `[train] class distribution: not_mistake=${nNeg} mistake_or_worse=${nPos} (${((nPos / rows.length) * 100).toFixed(1)}% positive)`
  );

  // 2. Stratified split (deterministic, seed=42)
  const split = stratifiedSplit(rows, getTarget, DEFAULT_SPLIT_RATIOS, DEFAULT_SEED);
  console.log(
    `[train] stratified split (seed=${DEFAULT_SEED}): train=${split.train.length} val=${split.val.length} test=${split.test.length}`
  );

  // 3. Extract features
  const trainFM = rowsToFeatureMatrix(split.train);
  const valFM = rowsToFeatureMatrix(split.val);
  const testFM = rowsToFeatureMatrix(split.test);

  console.log(
    `[train] features: ${trainFM.featureNames.length} numeric features`
  );

  const trainPos = trainFM.y.filter((v) => v === 1).length;
  console.log(
    `[train] train class balance: not_mistake=${trainFM.y.length - trainPos} mistake_or_worse=${trainPos}`
  );

  // 4. Standardize (for logistic regression)
  const stdParams = computeStandardization(trainFM.X);
  const XTrainStd = standardize(trainFM.X, stdParams);
  const XValStd = standardize(valFM.X, stdParams);
  const XTestStd = standardize(testFM.X, stdParams);

  // ═══════════════════════════════════════════
  // Model 1: Logistic Regression (class-weighted)
  // ═══════════════════════════════════════════
  console.log(
    `\n[train] ── Logistic Regression (class-weighted, epochs=${DEFAULT_EPOCHS}, lr=${DEFAULT_LEARNING_RATE}) ──`
  );

  const classWeights = computeClassWeights(trainFM.y);
  console.log(
    `[train] class weights: w0=${classWeights.w0.toFixed(3)} w1=${classWeights.w1.toFixed(3)}`
  );

  const logModel = new LogisticRegression(FEATURE_NAMES.length);
  const lossHistory = logModel.train(
    XTrainStd,
    trainFM.y,
    DEFAULT_EPOCHS,
    DEFAULT_LEARNING_RATE,
    classWeights
  );
  const finalLoss = lossHistory[lossHistory.length - 1];
  console.log(
    `[train] loss: ${lossHistory[0].toFixed(4)} → ${finalLoss.toFixed(4)}`
  );

  const logTrainPred = logModel.predictBatch(XTrainStd);
  const logValPred = logModel.predictBatch(XValStd);
  const logTestPred = logModel.predictBatch(XTestStd);

  const logMetrics: ModelMetrics = {
    name: "Logistic Regression (weighted)",
    train: evaluateModel(trainFM.y, logTrainPred),
    val: evaluateModel(valFM.y, logValPred),
    test: evaluateModel(testFM.y, logTestPred),
  };

  console.log(
    `[train] LR test: accuracy=${(logMetrics.test.accuracy * 100).toFixed(1)}% precision=${(logMetrics.test.precision * 100).toFixed(1)}% recall=${(logMetrics.test.recall * 100).toFixed(1)}% F1=${(logMetrics.test.f1 * 100).toFixed(1)}%`
  );

  // ═══════════════════════════════════════════
  // Model 2: Decision Tree (no standardization needed)
  // ═══════════════════════════════════════════
  console.log(
    `\n[train] ── Decision Tree (max_depth=${DEFAULT_MAX_DEPTH}, min_leaf=${DEFAULT_MIN_SAMPLES_LEAF}) ──`
  );

  const treeModel = new DecisionTree(DEFAULT_MAX_DEPTH, DEFAULT_MIN_SAMPLES_LEAF);
  treeModel.train(trainFM.X, trainFM.y);

  const treeTrainPred = treeModel.predictBatch(trainFM.X);
  const treeValPred = treeModel.predictBatch(valFM.X);
  const treeTestPred = treeModel.predictBatch(testFM.X);

  const treeMetrics: ModelMetrics = {
    name: "Decision Tree",
    train: evaluateModel(trainFM.y, treeTrainPred),
    val: evaluateModel(valFM.y, treeValPred),
    test: evaluateModel(testFM.y, treeTestPred),
  };

  console.log(
    `[train] DT test: accuracy=${(treeMetrics.test.accuracy * 100).toFixed(1)}% precision=${(treeMetrics.test.precision * 100).toFixed(1)}% recall=${(treeMetrics.test.recall * 100).toFixed(1)}% F1=${(treeMetrics.test.f1 * 100).toFixed(1)}%`
  );

  // ═══════════════════════════════════════════
  // Feature Importance
  // ═══════════════════════════════════════════
  console.log(`\n[train] ── Feature Importance ──`);

  const treeParams = treeModel.toParams();
  const featureImportance = computeFeatureImportance(
    treeParams.root,
    trainFM.X,
    trainFM.y,
    FEATURE_NAMES
  );

  const top5 = featureImportance.ranking.slice(0, 5);
  console.log(`[train] top 5 features:`);
  for (const f of top5) {
    console.log(
      `[train]   ${f.featureName}: ${(f.importance * 100).toFixed(1)}%`
    );
  }

  // ═══════════════════════════════════════════
  // Threshold Tuning (Logistic Regression)
  // ═══════════════════════════════════════════
  console.log(`\n[train] ── Threshold Tuning ──`);

  const valProba = split.val.map((_, i) => logModel.predictProba(XValStd[i]));
  const thresholdTuning = tuneThreshold(valProba, valFM.y);

  console.log(
    `[train] optimal threshold: ${thresholdTuning.optimalThreshold.toFixed(2)} (val F1=${(thresholdTuning.optimalMetrics.f1 * 100).toFixed(1)}%)`
  );

  // Apply optimal threshold to test set for reporting
  const testProba = split.test.map((_, i) => logModel.predictProba(XTestStd[i]));
  const optTestPred = applyThreshold(testProba, thresholdTuning.optimalThreshold);
  const optTestMetrics = evaluateModel(testFM.y, optTestPred);
  console.log(
    `[train] LR test @${thresholdTuning.optimalThreshold.toFixed(2)}: F1=${(optTestMetrics.f1 * 100).toFixed(1)}% (was ${(logMetrics.test.f1 * 100).toFixed(1)}% @0.50)`
  );

  // ═══════════════════════════════════════════
  // Cross-Validation
  // ═══════════════════════════════════════════
  console.log(`\n[train] ── 5-Fold Cross-Validation ──`);

  const crossValidation = runCrossValidation(rows, 5, DEFAULT_SEED);

  for (const fold of crossValidation.folds) {
    console.log(
      `[train] fold ${fold.fold}: LR F1=${(fold.logistic.f1 * 100).toFixed(1)}%  DT F1=${(fold.tree.f1 * 100).toFixed(1)}%`
    );
  }

  const fmtPct = (v: number) => (v * 100).toFixed(1) + "%";
  console.log(
    `[train] CV LR: F1=${fmtPct(crossValidation.logisticAggregate.meanF1)} (±${fmtPct(crossValidation.logisticAggregate.stdF1)})`
  );
  console.log(
    `[train] CV DT: F1=${fmtPct(crossValidation.treeAggregate.meanF1)} (±${fmtPct(crossValidation.treeAggregate.stdF1)})`
  );

  // ═══════════════════════════════════════════
  // Persist artifacts
  // ═══════════════════════════════════════════
  mkdirSync(outputDir, { recursive: true });

  // Logistic model artifact
  const logArtifact = {
    type: "logistic-regression",
    target: "mistake_or_worse",
    featureNames: FEATURE_NAMES,
    ...logModel.toParams(),
    standardization: stdParams,
    classWeights,
    optimalThreshold: thresholdTuning.optimalThreshold,
    trainedAt: new Date().toISOString(),
    datasetPath,
    config: {
      epochs: DEFAULT_EPOCHS,
      learningRate: DEFAULT_LEARNING_RATE,
      splitRatios: DEFAULT_SPLIT_RATIOS,
      seed: DEFAULT_SEED,
      classWeighted: true,
    },
  };
  const logPath = `${outputDir}/logistic-model.json`;
  writeFileSync(logPath, JSON.stringify(logArtifact, null, 2), "utf-8");
  console.log(`\n[train] logistic model: ${logPath}`);

  // Decision tree artifact
  const treeArtifact = {
    type: "decision-tree",
    target: "mistake_or_worse",
    featureNames: FEATURE_NAMES,
    ...treeModel.toParams(),
    trainedAt: new Date().toISOString(),
    datasetPath,
    config: {
      maxDepth: DEFAULT_MAX_DEPTH,
      minSamplesLeaf: DEFAULT_MIN_SAMPLES_LEAF,
      splitRatios: DEFAULT_SPLIT_RATIOS,
      seed: DEFAULT_SEED,
    },
  };
  const treePath = `${outputDir}/tree-model.json`;
  writeFileSync(treePath, JSON.stringify(treeArtifact, null, 2), "utf-8");
  console.log(`[train] tree model: ${treePath}`);

  // Feature importance artifact
  const fiPath = `${outputDir}/feature-importance.json`;
  writeFileSync(fiPath, JSON.stringify(featureImportance, null, 2), "utf-8");
  console.log(`[train] feature importance: ${fiPath}`);

  // Threshold analysis artifact
  const ttPath = `${outputDir}/threshold-analysis.json`;
  writeFileSync(ttPath, JSON.stringify(thresholdTuning, null, 2), "utf-8");
  console.log(`[train] threshold analysis: ${ttPath}`);

  // Cross-validation artifact
  const cvPath = `${outputDir}/cross-validation.json`;
  writeFileSync(cvPath, JSON.stringify(crossValidation, null, 2), "utf-8");
  console.log(`[train] cross-validation: ${cvPath}`);

  // Evaluation report
  const allModels = [logMetrics, treeMetrics];
  const reportPath = `${outputDir}/baseline-evaluation.md`;
  const report = formatEvaluationReport(allModels, {
    datasetPath,
    totalRows: rows.length,
    featureCount: FEATURE_NAMES.length,
    classDistribution: { notMistake: nNeg, mistakeOrWorse: nPos },
    splitSizes: {
      train: split.train.length,
      val: split.val.length,
      test: split.test.length,
    },
    splitStrategy: `Stratified shuffled split (seed=${DEFAULT_SEED}), 80/10/10`,
    logisticConfig: {
      epochs: DEFAULT_EPOCHS,
      learningRate: DEFAULT_LEARNING_RATE,
      finalTrainLoss: finalLoss,
      classWeighted: true,
    },
    treeConfig: {
      maxDepth: DEFAULT_MAX_DEPTH,
      minSamplesLeaf: DEFAULT_MIN_SAMPLES_LEAF,
    },
    featureImportance,
    thresholdTuning,
    crossValidation,
  });
  writeFileSync(reportPath, report, "utf-8");
  console.log(`[train] evaluation report: ${reportPath}`);

  return {
    models: allModels,
    logisticArtifactPath: logPath,
    treeArtifactPath: treePath,
    evaluationReportPath: reportPath,
    featureImportancePath: fiPath,
    thresholdAnalysisPath: ttPath,
    crossValidationPath: cvPath,
    totalRows: rows.length,
    trainSize: split.train.length,
    valSize: split.val.length,
    testSize: split.test.length,
    featureImportance,
    thresholdTuning,
    crossValidation,
  };
}
