/**
 * Audit of the moverIsBlack feature's influence on model predictions.
 *
 * Feature importance showed moverIsBlack at 27.3% — second only to evalCp.
 * This audit checks whether that reflects:
 *   - Real chess structure (Black genuinely makes more mistakes)
 *   - Dataset imbalance (more Black positions are mistakes due to sampling)
 *   - Model shortcut/bias (model over-relies on color as a proxy)
 */

import type { TrainingDatasetRow } from "../dataset/types";
import type { DecisionTreeParams } from "../model/decision-tree";
import { DecisionTree } from "../model/decision-tree";
import { rowToFeatures } from "../model/feature-matrix";
import type { MoverColorAuditResult, MoverColorStats } from "./types";

/**
 * Run the mover color audit across the full dataset.
 */
export function runMoverColorAudit(
  rows: TrainingDatasetRow[],
  treeParams: DecisionTreeParams,
  featureImportanceValue: number
): MoverColorAuditResult {
  const tree = DecisionTree.fromParams(treeParams);

  const whiteRows = rows.filter((r) => r.mover === "white");
  const blackRows = rows.filter((r) => r.mover === "black");

  function computeStats(subset: TrainingDatasetRow[]): MoverColorStats {
    const positiveCount = subset.filter((r) => r.label !== "best_or_ok").length;
    let predictedPositiveCount = 0;
    for (const row of subset) {
      const features = rowToFeatures(row);
      const pred = tree.predict(features);
      if (pred === 1) predictedPositiveCount++;
    }
    return {
      count: subset.length,
      positiveCount,
      positiveRate: subset.length > 0 ? positiveCount / subset.length : 0,
      predictedPositiveCount,
      predictedPositiveRate:
        subset.length > 0 ? predictedPositiveCount / subset.length : 0,
    };
  }

  const white = computeStats(whiteRows);
  const black = computeStats(blackRows);

  // Assess finding
  const actualDiff = Math.abs(black.positiveRate - white.positiveRate);
  const predictedDiff = Math.abs(
    black.predictedPositiveRate - white.predictedPositiveRate
  );

  let finding: string;
  if (actualDiff < 0.05) {
    // Actual rates are similar — model may be using color as a shortcut
    finding =
      "Actual mistake rates are similar between colors " +
      `(white=${(white.positiveRate * 100).toFixed(1)}%, black=${(black.positiveRate * 100).toFixed(1)}%). ` +
      "The high feature importance of moverIsBlack may indicate the model is using color " +
      "as a proxy for other correlated features (e.g., eval sign convention, position types). " +
      "Consider investigating whether removing moverIsBlack degrades or improves generalization.";
  } else if (actualDiff >= 0.05 && predictedDiff < actualDiff * 1.5) {
    // Actual rates differ and model tracks proportionally — likely real structure
    finding =
      "Black has a meaningfully different mistake rate than white " +
      `(white=${(white.positiveRate * 100).toFixed(1)}%, black=${(black.positiveRate * 100).toFixed(1)}%). ` +
      "The model's predictions track this difference proportionally " +
      `(predicted: white=${(white.predictedPositiveRate * 100).toFixed(1)}%, black=${(black.predictedPositiveRate * 100).toFixed(1)}%). ` +
      "This likely reflects real chess structure: Black faces more defensive positions " +
      "and may be more error-prone in this dataset's game population.";
  } else {
    // Model amplifies the color difference beyond actual rates
    finding =
      "The model amplifies the color-based difference beyond actual rates " +
      `(actual diff=${(actualDiff * 100).toFixed(1)}pp, predicted diff=${(predictedDiff * 100).toFixed(1)}pp). ` +
      "This suggests potential shortcut bias — the model may be over-relying on moverIsBlack. " +
      "Recommend ablation study: retrain without moverIsBlack and compare test F1.";
  }

  return {
    totalPositions: rows.length,
    white,
    black,
    featureImportance: featureImportanceValue,
    finding,
  };
}
