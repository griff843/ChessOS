/**
 * Threshold tuning for logistic regression.
 *
 * Sweeps classification thresholds from 0.10 to 0.90 (step 0.05),
 * evaluates F1 at each threshold on a validation set, and selects
 * the threshold that maximizes F1.
 *
 * This avoids test set leakage: optimal threshold is chosen on val,
 * then applied to test for final evaluation.
 */

import { evaluateModel, type EvaluationMetrics } from "./evaluate-model";

export interface ThresholdResult {
  threshold: number;
  metrics: EvaluationMetrics;
}

export interface ThresholdTuningResult {
  /** All evaluated thresholds with their metrics. */
  results: ThresholdResult[];
  /** The threshold that maximizes F1 on the validation set. */
  optimalThreshold: number;
  /** Metrics at the optimal threshold. */
  optimalMetrics: EvaluationMetrics;
}

/**
 * Evaluate a set of thresholds on predicted probabilities.
 *
 * @param probabilities - P(y=1) for each sample (from logistic regression)
 * @param yTrue - actual binary labels
 * @param thresholds - thresholds to evaluate (default 0.10 to 0.90 step 0.05)
 */
export function tuneThreshold(
  probabilities: number[],
  yTrue: number[],
  thresholds?: number[]
): ThresholdTuningResult {
  const steps =
    thresholds ??
    Array.from({ length: 17 }, (_, i) => +(0.1 + i * 0.05).toFixed(2));

  const results: ThresholdResult[] = steps.map((threshold) => {
    const yPred = probabilities.map((p) => (p >= threshold ? 1 : 0));
    return {
      threshold,
      metrics: evaluateModel(yTrue, yPred),
    };
  });

  // Find threshold with maximum F1
  let bestIdx = 0;
  for (let i = 1; i < results.length; i++) {
    if (results[i].metrics.f1 > results[bestIdx].metrics.f1) {
      bestIdx = i;
    }
  }

  return {
    results,
    optimalThreshold: results[bestIdx].threshold,
    optimalMetrics: results[bestIdx].metrics,
  };
}

/**
 * Apply a threshold to probabilities to produce binary predictions.
 */
export function applyThreshold(
  probabilities: number[],
  threshold: number
): number[] {
  return probabilities.map((p) => (p >= threshold ? 1 : 0));
}
