/**
 * Stratified k-fold cross-validation.
 *
 * Deterministic: uses mulberry32 PRNG with a fixed seed to shuffle
 * each class partition, then assigns samples round-robin to k folds.
 * This guarantees proportional class distribution in every fold.
 *
 * For each fold, trains both models on the other k-1 folds and
 * evaluates on the held-out fold. Aggregates mean and stddev.
 */

import {
  rowsToFeatureMatrix,
  computeStandardization,
  standardize,
  FEATURE_NAMES,
} from "./feature-matrix";
import { LogisticRegression, computeClassWeights } from "./baseline-model";
import { DecisionTree, DEFAULT_MAX_DEPTH, DEFAULT_MIN_SAMPLES_LEAF } from "./decision-tree";
import { evaluateModel, type EvaluationMetrics } from "./evaluate-model";
import type { TrainingDatasetRow } from "../dataset/types";

/** mulberry32 PRNG — same as in train-test-split.ts. */
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

export interface FoldMetrics {
  fold: number;
  logistic: EvaluationMetrics;
  tree: EvaluationMetrics;
}

export interface AggregateMetrics {
  meanAccuracy: number;
  meanPrecision: number;
  meanRecall: number;
  meanF1: number;
  stdAccuracy: number;
  stdPrecision: number;
  stdRecall: number;
  stdF1: number;
}

export interface CrossValidationResult {
  k: number;
  seed: number;
  folds: FoldMetrics[];
  logisticAggregate: AggregateMetrics;
  treeAggregate: AggregateMetrics;
}

function getTarget(row: TrainingDatasetRow): number {
  return row.label === "best_or_ok" ? 0 : 1;
}

/**
 * Create stratified k-fold indices.
 *
 * 1. Partition row indices by class.
 * 2. Shuffle each partition with a seeded PRNG.
 * 3. Assign indices round-robin to k folds.
 */
function createStratifiedFolds(
  rows: TrainingDatasetRow[],
  k: number,
  seed: number
): number[][] {
  const class0: number[] = [];
  const class1: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (getTarget(rows[i]) === 1) {
      class1.push(i);
    } else {
      class0.push(i);
    }
  }

  const rng0 = mulberry32(seed);
  const rng1 = mulberry32(seed + 1);
  const shuffled0 = seededShuffle(class0, rng0);
  const shuffled1 = seededShuffle(class1, rng1);

  // Round-robin assignment
  const folds: number[][] = Array.from({ length: k }, () => []);
  for (let i = 0; i < shuffled0.length; i++) {
    folds[i % k].push(shuffled0[i]);
  }
  for (let i = 0; i < shuffled1.length; i++) {
    folds[i % k].push(shuffled1[i]);
  }

  return folds;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function std(values: number[]): number {
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function aggregateMetrics(foldMetrics: EvaluationMetrics[]): AggregateMetrics {
  return {
    meanAccuracy: mean(foldMetrics.map((m) => m.accuracy)),
    meanPrecision: mean(foldMetrics.map((m) => m.precision)),
    meanRecall: mean(foldMetrics.map((m) => m.recall)),
    meanF1: mean(foldMetrics.map((m) => m.f1)),
    stdAccuracy: std(foldMetrics.map((m) => m.accuracy)),
    stdPrecision: std(foldMetrics.map((m) => m.precision)),
    stdRecall: std(foldMetrics.map((m) => m.recall)),
    stdF1: std(foldMetrics.map((m) => m.f1)),
  };
}

const DEFAULT_EPOCHS = 200;
const DEFAULT_LEARNING_RATE = 0.1;

/**
 * Run stratified k-fold cross-validation.
 *
 * For each fold:
 *   - Train logistic regression (standardized, class-weighted) on k-1 folds
 *   - Train decision tree on k-1 folds
 *   - Evaluate both on the held-out fold
 *
 * Returns per-fold metrics and aggregated mean/std.
 */
export function runCrossValidation(
  rows: TrainingDatasetRow[],
  k: number = 5,
  seed: number = 42
): CrossValidationResult {
  const foldIndices = createStratifiedFolds(rows, k, seed);

  const foldResults: FoldMetrics[] = [];

  for (let f = 0; f < k; f++) {
    // Build train/test indices for this fold
    const testIdx = foldIndices[f];
    const trainIdx: number[] = [];
    for (let j = 0; j < k; j++) {
      if (j !== f) {
        trainIdx.push(...foldIndices[j]);
      }
    }

    const trainRows = trainIdx.map((i) => rows[i]);
    const testRows = testIdx.map((i) => rows[i]);

    const trainFM = rowsToFeatureMatrix(trainRows);
    const testFM = rowsToFeatureMatrix(testRows);

    // Logistic regression (standardized, class-weighted)
    const stdParams = computeStandardization(trainFM.X);
    const XTrainStd = standardize(trainFM.X, stdParams);
    const XTestStd = standardize(testFM.X, stdParams);

    const classWeights = computeClassWeights(trainFM.y);
    const logModel = new LogisticRegression(FEATURE_NAMES.length);
    logModel.train(XTrainStd, trainFM.y, DEFAULT_EPOCHS, DEFAULT_LEARNING_RATE, classWeights);
    const logPred = logModel.predictBatch(XTestStd);
    const logMetrics = evaluateModel(testFM.y, logPred);

    // Decision tree (raw features)
    const treeModel = new DecisionTree(DEFAULT_MAX_DEPTH, DEFAULT_MIN_SAMPLES_LEAF);
    treeModel.train(trainFM.X, trainFM.y);
    const treePred = treeModel.predictBatch(testFM.X);
    const treeMetrics = evaluateModel(testFM.y, treePred);

    foldResults.push({
      fold: f + 1,
      logistic: logMetrics,
      tree: treeMetrics,
    });
  }

  return {
    k,
    seed,
    folds: foldResults,
    logisticAggregate: aggregateMetrics(foldResults.map((f) => f.logistic)),
    treeAggregate: aggregateMetrics(foldResults.map((f) => f.tree)),
  };
}
