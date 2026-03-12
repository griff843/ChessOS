/**
 * Feature ablation study for the Decision Tree model.
 *
 * Trains and evaluates the model under multiple feature configurations
 * to test whether specific features (e.g., moverIsBlack) act as
 * shortcuts or reflect genuine predictive signal.
 *
 * Each configuration uses the same stratified split, same hyperparameters,
 * and same seed — the only difference is the feature set.
 */

import type { TrainingDatasetRow } from "../dataset/types";
import {
  rowsToFeatureMatrix,
  FEATURE_NAMES,
} from "./feature-matrix";
import {
  stratifiedSplit,
  DEFAULT_SPLIT_RATIOS,
  DEFAULT_SEED,
} from "./train-test-split";
import {
  DecisionTree,
  DEFAULT_MAX_DEPTH,
  DEFAULT_MIN_SAMPLES_LEAF,
} from "./decision-tree";
import { evaluateModel, type EvaluationMetrics } from "./evaluate-model";
import { computeFeatureImportance, type FeatureImportanceResult } from "./feature-importance";

function getTarget(row: TrainingDatasetRow): number {
  return row.label === "best_or_ok" ? 0 : 1;
}

/** Remove specified feature columns from a feature matrix. */
function excludeFeatures(
  X: number[][],
  allNames: string[],
  exclude: string[]
): { X: number[][]; featureNames: string[]; keepIndices: number[] } {
  const keepIndices = allNames
    .map((name, i) => ({ name, i }))
    .filter(({ name }) => !exclude.includes(name))
    .map(({ i }) => i);
  const featureNames = keepIndices.map((i) => allNames[i]);
  const filteredX = X.map((row) => keepIndices.map((i) => row[i]));
  return { X: filteredX, featureNames, keepIndices };
}

export interface AblationConfigResult {
  configName: string;
  excludedFeatures: string[];
  featureCount: number;
  featureNames: string[];
  train: EvaluationMetrics;
  val: EvaluationMetrics;
  test: EvaluationMetrics;
  featureImportance: FeatureImportanceResult;
  cvFoldF1s: number[];
  cvMeanF1: number;
  cvStdF1: number;
  treeParams: {
    root: import("./decision-tree").TreeNodeParams;
    maxDepth: number;
    featureCount: number;
  };
}

export interface AblationStudyResult {
  configs: AblationConfigResult[];
  datasetSize: number;
  trainSize: number;
  valSize: number;
  testSize: number;
  seed: number;
}

/** mulberry32 PRNG (same as train-test-split / cross-validation). */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Run tree-only stratified 5-fold CV with feature exclusion. */
function runTreeCV(
  rows: TrainingDatasetRow[],
  exclude: string[],
  k: number = 5,
  seed: number = 42
): { foldF1s: number[]; meanF1: number; stdF1: number } {
  // Create stratified folds
  const class0: number[] = [];
  const class1: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (getTarget(rows[i]) === 1) class1.push(i);
    else class0.push(i);
  }
  const shuffled0 = seededShuffle(class0, mulberry32(seed));
  const shuffled1 = seededShuffle(class1, mulberry32(seed + 1));

  const folds: number[][] = Array.from({ length: k }, () => []);
  for (let i = 0; i < shuffled0.length; i++) folds[i % k].push(shuffled0[i]);
  for (let i = 0; i < shuffled1.length; i++) folds[i % k].push(shuffled1[i]);

  const foldF1s: number[] = [];
  for (let f = 0; f < k; f++) {
    const testIdx = folds[f];
    const trainIdx: number[] = [];
    for (let j = 0; j < k; j++) {
      if (j !== f) trainIdx.push(...folds[j]);
    }

    const trainRows = trainIdx.map((i) => rows[i]);
    const testRows = testIdx.map((i) => rows[i]);

    const trainFM = rowsToFeatureMatrix(trainRows);
    const testFM = rowsToFeatureMatrix(testRows);

    const trainFiltered = excludeFeatures(trainFM.X, FEATURE_NAMES, exclude);
    const testFiltered = excludeFeatures(testFM.X, FEATURE_NAMES, exclude);

    const tree = new DecisionTree(DEFAULT_MAX_DEPTH, DEFAULT_MIN_SAMPLES_LEAF);
    tree.train(trainFiltered.X, trainFM.y);
    const pred = tree.predictBatch(testFiltered.X);
    const metrics = evaluateModel(testFM.y, pred);
    foldF1s.push(metrics.f1);
  }

  const meanF1 = foldF1s.reduce((a, b) => a + b, 0) / foldF1s.length;
  const variance = foldF1s.reduce((s, v) => s + (v - meanF1) ** 2, 0) / foldF1s.length;
  const stdF1 = Math.sqrt(variance);

  return { foldF1s, meanF1, stdF1 };
}

/**
 * Run the full ablation study.
 *
 * Configs:
 *   A: all features (baseline)
 *   B: all features minus moverIsBlack
 */
export function runAblationStudy(
  rows: TrainingDatasetRow[]
): AblationStudyResult {
  const configs: Array<{ name: string; exclude: string[] }> = [
    { name: "Config A: all features (baseline)", exclude: [] },
    { name: "Config B: no moverIsBlack", exclude: ["moverIsBlack"] },
  ];

  // Same stratified split for all configs
  const split = stratifiedSplit(rows, getTarget, DEFAULT_SPLIT_RATIOS, DEFAULT_SEED);

  const fullTrainFM = rowsToFeatureMatrix(split.train);
  const fullValFM = rowsToFeatureMatrix(split.val);
  const fullTestFM = rowsToFeatureMatrix(split.test);

  const results: AblationConfigResult[] = [];

  for (const cfg of configs) {
    const trainFiltered = excludeFeatures(fullTrainFM.X, FEATURE_NAMES, cfg.exclude);
    const valFiltered = excludeFeatures(fullValFM.X, FEATURE_NAMES, cfg.exclude);
    const testFiltered = excludeFeatures(fullTestFM.X, FEATURE_NAMES, cfg.exclude);

    // Train tree
    const tree = new DecisionTree(DEFAULT_MAX_DEPTH, DEFAULT_MIN_SAMPLES_LEAF);
    tree.train(trainFiltered.X, fullTrainFM.y);

    // Evaluate on all splits
    const trainPred = tree.predictBatch(trainFiltered.X);
    const valPred = tree.predictBatch(valFiltered.X);
    const testPred = tree.predictBatch(testFiltered.X);

    const trainMetrics = evaluateModel(fullTrainFM.y, trainPred);
    const valMetrics = evaluateModel(fullValFM.y, valPred);
    const testMetrics = evaluateModel(fullTestFM.y, testPred);

    // Feature importance
    const treeParams = tree.toParams();
    const fi = computeFeatureImportance(
      treeParams.root,
      trainFiltered.X,
      fullTrainFM.y,
      trainFiltered.featureNames
    );

    // Cross-validation
    const cv = runTreeCV(rows, cfg.exclude);

    results.push({
      configName: cfg.name,
      excludedFeatures: cfg.exclude,
      featureCount: trainFiltered.featureNames.length,
      featureNames: trainFiltered.featureNames,
      train: trainMetrics,
      val: valMetrics,
      test: testMetrics,
      featureImportance: fi,
      cvFoldF1s: cv.foldF1s,
      cvMeanF1: cv.meanF1,
      cvStdF1: cv.stdF1,
      treeParams,
    });
  }

  return {
    configs: results,
    datasetSize: rows.length,
    trainSize: split.train.length,
    valSize: split.val.length,
    testSize: split.test.length,
    seed: DEFAULT_SEED,
  };
}
