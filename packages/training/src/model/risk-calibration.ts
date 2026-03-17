/**
 * Risk calibration analysis for Decision Tree probability outputs.
 *
 * The Decision Tree (max_depth=5, min_samples_leaf=3) produces leaf
 * probabilities that are inherently coarse — a small number of distinct
 * values determined by the training sample ratios at each leaf.
 *
 * This module buckets predicted probabilities and compares them to
 * observed positive rates to assess whether "risk=100%" outputs are
 * genuinely calibrated or misleadingly sharp.
 */

import { DecisionTree, type DecisionTreeParams } from "./decision-tree";
import { rowsToFeatureMatrix, FEATURE_NAMES } from "./feature-matrix";
import type { TrainingDatasetRow } from "../dataset/types";

export interface CalibrationBucket {
  bucketLabel: string;
  lowerBound: number;
  upperBound: number;
  count: number;
  meanPredicted: number;
  observedPositiveRate: number;
  calibrationError: number;
}

export interface CalibrationResult {
  buckets: CalibrationBucket[];
  distinctProbabilities: number[];
  distinctCount: number;
  totalSamples: number;
  meanAbsoluteCalibrationError: number;
  finding: string;
}

/** Remove specified feature columns from feature vectors. */
function filterFeatures(
  X: number[][],
  exclude: string[]
): number[][] {
  if (exclude.length === 0) return X;
  const keepIndices = FEATURE_NAMES
    .map((name, i) => ({ name, i }))
    .filter(({ name }) => !exclude.includes(name))
    .map(({ i }) => i);
  return X.map((row) => keepIndices.map((i) => row[i]));
}

/**
 * Run calibration analysis on the given dataset rows using a tree model.
 */
export function runCalibrationAnalysis(
  rows: TrainingDatasetRow[],
  treeParams: DecisionTreeParams,
  excludedFeatures: string[] = []
): CalibrationResult {
  const tree = DecisionTree.fromParams(treeParams);
  const fm = rowsToFeatureMatrix(rows);
  const X = filterFeatures(fm.X, excludedFeatures);

  // Get probabilities for all samples
  const probabilities = X.map((x) => tree.predictProba(x)[1]);

  // Distinct probability values
  const distinctSet = new Set(probabilities.map((p) => Math.round(p * 10000) / 10000));
  const distinctProbabilities = Array.from(distinctSet).sort((a, b) => a - b);

  // Create 10 buckets
  const bucketBounds: Array<{ label: string; lower: number; upper: number }> = [];
  for (let i = 0; i < 10; i++) {
    const lower = i / 10;
    const upper = (i + 1) / 10;
    bucketBounds.push({
      label: `${lower.toFixed(1)}–${upper.toFixed(1)}`,
      lower,
      upper,
    });
  }

  const buckets: CalibrationBucket[] = bucketBounds.map(({ label, lower, upper }) => {
    const indices: number[] = [];
    for (let i = 0; i < probabilities.length; i++) {
      const p = probabilities[i];
      // Last bucket includes upper bound (1.0)
      if (upper === 1.0) {
        if (p >= lower && p <= upper) indices.push(i);
      } else {
        if (p >= lower && p < upper) indices.push(i);
      }
    }

    const count = indices.length;
    const meanPredicted =
      count > 0
        ? indices.reduce((s, i) => s + probabilities[i], 0) / count
        : (lower + upper) / 2;
    const observedPositiveRate =
      count > 0
        ? indices.filter((i) => fm.y[i] === 1).length / count
        : 0;
    const calibrationError = count > 0 ? Math.abs(meanPredicted - observedPositiveRate) : 0;

    return {
      bucketLabel: label,
      lowerBound: lower,
      upperBound: upper,
      count,
      meanPredicted,
      observedPositiveRate,
      calibrationError,
    };
  });

  // Mean absolute calibration error (weighted by bucket count)
  const nonEmptyBuckets = buckets.filter((b) => b.count > 0);
  const totalInBuckets = nonEmptyBuckets.reduce((s, b) => s + b.count, 0);
  const meanAbsoluteCalibrationError =
    totalInBuckets > 0
      ? nonEmptyBuckets.reduce((s, b) => s + b.calibrationError * b.count, 0) / totalInBuckets
      : 0;

  // Assess finding
  const highBucket = buckets.find((b) => b.lowerBound === 0.9);
  const lowBucket = buckets.find((b) => b.lowerBound === 0.0);
  const concentratedInExtremes =
    (highBucket?.count ?? 0) + (lowBucket?.count ?? 0) > rows.length * 0.6;

  let finding: string;
  if (distinctProbabilities.length <= 8) {
    finding =
      `The tree produces only ${distinctProbabilities.length} distinct probability values, ` +
      `indicating coarse leaf-level resolution. ` +
      `Predicted "risk" values cluster at a few discrete points rather than forming ` +
      `a continuous spectrum. `;
  } else {
    finding =
      `The tree produces ${distinctProbabilities.length} distinct probability values. `;
  }

  if (concentratedInExtremes) {
    finding +=
      `Probabilities are concentrated in the extreme buckets ` +
      `([0.0–0.1]: ${lowBucket?.count ?? 0}, [0.9–1.0]: ${highBucket?.count ?? 0}), ` +
      `producing sharp/overconfident risk outputs. `;
  }

  finding +=
    `Mean absolute calibration error: ${(meanAbsoluteCalibrationError * 100).toFixed(1)}%. `;

  if (highBucket && highBucket.count > 0) {
    finding +=
      `In the [0.9–1.0] bucket: predicted mean=${(highBucket.meanPredicted * 100).toFixed(1)}%, ` +
      `observed rate=${(highBucket.observedPositiveRate * 100).toFixed(1)}%. `;
    if (highBucket.calibrationError > 0.15) {
      finding += `This bucket is materially overconfident. `;
    } else if (highBucket.calibrationError < 0.05) {
      finding += `This bucket is well-calibrated. `;
    }
  }

  return {
    buckets,
    distinctProbabilities,
    distinctCount: distinctProbabilities.length,
    totalSamples: rows.length,
    meanAbsoluteCalibrationError,
    finding: finding.trim(),
  };
}
