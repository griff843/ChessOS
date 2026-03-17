/**
 * Bias / parity audit by mover color.
 *
 * For each model configuration, partitions predictions by mover color
 * (white vs black) and reports: actual positive rate, predicted positive
 * rate, precision, recall, and confusion matrix per color.
 *
 * This detects whether the model over/under-predicts for a specific color
 * and whether the moverIsBlack feature creates shortcut bias.
 */

import type { TrainingDatasetRow } from "../dataset/types";
import type { EvaluationMetrics, ConfusionMatrix } from "./evaluate-model";
import { evaluateModel } from "./evaluate-model";
import { DecisionTree, type DecisionTreeParams } from "./decision-tree";
import { rowsToFeatureMatrix, FEATURE_NAMES } from "./feature-matrix";

export interface ColorMetrics {
  count: number;
  actualPositiveRate: number;
  predictedPositiveRate: number;
  precision: number;
  recall: number;
  f1: number;
  confusion: ConfusionMatrix;
}

export interface BiasAuditConfigResult {
  configName: string;
  white: ColorMetrics;
  black: ColorMetrics;
  actualRateGap: number;
  predictedRateGap: number;
  f1Gap: number;
}

export interface BiasAuditResult {
  configs: BiasAuditConfigResult[];
  totalPositions: number;
  finding: string;
}

function computeColorMetrics(
  yTrue: number[],
  yPred: number[]
): ColorMetrics {
  const metrics = evaluateModel(yTrue, yPred);
  const positiveCount = yTrue.filter((v) => v === 1).length;
  const predictedPositiveCount = yPred.filter((v) => v === 1).length;
  return {
    count: yTrue.length,
    actualPositiveRate: yTrue.length > 0 ? positiveCount / yTrue.length : 0,
    predictedPositiveRate: yTrue.length > 0 ? predictedPositiveCount / yTrue.length : 0,
    precision: metrics.precision,
    recall: metrics.recall,
    f1: metrics.f1,
    confusion: metrics.confusion,
  };
}

/** Remove specified feature columns from feature vectors. */
function filterFeatures(
  X: number[][],
  exclude: string[]
): number[][] {
  const keepIndices = FEATURE_NAMES
    .map((name, i) => ({ name, i }))
    .filter(({ name }) => !exclude.includes(name))
    .map(({ i }) => i);
  return X.map((row) => keepIndices.map((i) => row[i]));
}

/**
 * Run the bias audit for a set of model configurations against test data.
 */
export function runBiasAudit(
  testRows: TrainingDatasetRow[],
  configs: Array<{
    name: string;
    treeParams: DecisionTreeParams;
    excludedFeatures: string[];
  }>
): BiasAuditResult {
  const fullFM = rowsToFeatureMatrix(testRows);

  // Partition indices by mover color
  const whiteIdx: number[] = [];
  const blackIdx: number[] = [];
  for (let i = 0; i < testRows.length; i++) {
    if (testRows[i].mover === "white") whiteIdx.push(i);
    else blackIdx.push(i);
  }

  const configResults: BiasAuditConfigResult[] = [];

  for (const cfg of configs) {
    const tree = DecisionTree.fromParams(cfg.treeParams);
    const filteredX = filterFeatures(fullFM.X, cfg.excludedFeatures);
    const predictions = tree.predictBatch(filteredX);

    const whiteYTrue = whiteIdx.map((i) => fullFM.y[i]);
    const whiteYPred = whiteIdx.map((i) => predictions[i]);
    const blackYTrue = blackIdx.map((i) => fullFM.y[i]);
    const blackYPred = blackIdx.map((i) => predictions[i]);

    const white = computeColorMetrics(whiteYTrue, whiteYPred);
    const black = computeColorMetrics(blackYTrue, blackYPred);

    configResults.push({
      configName: cfg.name,
      white,
      black,
      actualRateGap: Math.abs(white.actualPositiveRate - black.actualPositiveRate),
      predictedRateGap: Math.abs(white.predictedPositiveRate - black.predictedPositiveRate),
      f1Gap: Math.abs(white.f1 - black.f1),
    });
  }

  // Assess finding
  const baseline = configResults[0];
  const ablated = configResults.length > 1 ? configResults[1] : null;

  let finding: string;
  if (!ablated) {
    finding = `Single config audit. Predicted rate gap: ${(baseline.predictedRateGap * 100).toFixed(1)}pp.`;
  } else {
    const baselineGap = baseline.predictedRateGap;
    const ablatedGap = ablated.predictedRateGap;
    const gapReduction = baselineGap - ablatedGap;

    if (gapReduction > 0.02) {
      finding =
        `Removing moverIsBlack reduces predicted rate gap from ` +
        `${(baselineGap * 100).toFixed(1)}pp to ${(ablatedGap * 100).toFixed(1)}pp ` +
        `(${(gapReduction * 100).toFixed(1)}pp improvement). ` +
        `The baseline model exhibits color-based prediction asymmetry that is not present in actual labels. ` +
        `This confirms moverIsBlack acts as a shortcut feature.`;
    } else if (gapReduction > 0) {
      finding =
        `Removing moverIsBlack slightly reduces predicted rate gap from ` +
        `${(baselineGap * 100).toFixed(1)}pp to ${(ablatedGap * 100).toFixed(1)}pp. ` +
        `The effect is modest — moverIsBlack is a minor contributor to bias.`;
    } else {
      finding =
        `Removing moverIsBlack does not reduce predicted rate gap ` +
        `(baseline=${(baselineGap * 100).toFixed(1)}pp, ablated=${(ablatedGap * 100).toFixed(1)}pp). ` +
        `Other features may carry similar color signal (e.g., evalCp sign convention).`;
    }
  }

  return {
    configs: configResults,
    totalPositions: testRows.length,
    finding,
  };
}
