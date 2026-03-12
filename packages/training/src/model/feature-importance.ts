/**
 * Feature importance extraction from a trained Decision Tree.
 *
 * Computes impurity-based importance: at each split node, the weighted
 * Gini reduction is accumulated for the feature used. Importance scores
 * are normalized to sum to 1.0.
 *
 * This is the same approach used by scikit-learn's DecisionTreeClassifier.
 */

import type { TreeNodeParams } from "./decision-tree";

export interface FeatureImportanceEntry {
  featureIndex: number;
  featureName: string;
  importance: number;
}

export interface FeatureImportanceResult {
  ranking: FeatureImportanceEntry[];
  raw: number[];
}

/**
 * Compute feature importance by running training data through the tree.
 *
 * For each split node encountered during prediction:
 *   importance[feature] += Gini_decrease * n_samples_at_node
 *
 * This is more accurate than trying to reconstruct from tree structure alone.
 */
export function computeFeatureImportance(
  root: TreeNodeParams,
  X: number[][],
  y: number[],
  featureNames: string[]
): FeatureImportanceResult {
  const nFeatures = featureNames.length;
  const importances = new Array(nFeatures).fill(0);

  // Build a map of node → sample indices by routing all training samples
  computeNodeImportances(root, Array.from({ length: X.length }, (_, i) => i), X, y, importances);

  // Normalize to sum to 1.0
  const total = importances.reduce((a: number, b: number) => a + b, 0);
  const normalized = total > 0
    ? importances.map((v: number) => v / total)
    : importances;

  // Build ranked list
  const ranking: FeatureImportanceEntry[] = featureNames
    .map((name, i) => ({
      featureIndex: i,
      featureName: name,
      importance: normalized[i],
    }))
    .sort((a, b) => b.importance - a.importance);

  return { ranking, raw: normalized };
}

/**
 * Recursively compute Gini decrease at each split node using actual sample routing.
 */
function computeNodeImportances(
  node: TreeNodeParams,
  indices: number[],
  X: number[][],
  y: number[],
  importances: number[]
): void {
  if (node.type === "leaf" || indices.length === 0) return;

  const n = indices.length;
  const labels = indices.map((i) => y[i]);
  const p1 = labels.filter((l) => l === 1).length / n;
  const parentGini = 1 - p1 * p1 - (1 - p1) * (1 - p1);

  // Route samples to children
  const leftIdx: number[] = [];
  const rightIdx: number[] = [];
  for (const i of indices) {
    if (X[i][node.featureIndex!] <= node.threshold!) {
      leftIdx.push(i);
    } else {
      rightIdx.push(i);
    }
  }

  const nLeft = leftIdx.length;
  const nRight = rightIdx.length;

  if (nLeft === 0 || nRight === 0) return;

  const leftLabels = leftIdx.map((i) => y[i]);
  const rightLabels = rightIdx.map((i) => y[i]);

  const pL1 = leftLabels.filter((l) => l === 1).length / nLeft;
  const leftGini = 1 - pL1 * pL1 - (1 - pL1) * (1 - pL1);

  const pR1 = rightLabels.filter((l) => l === 1).length / nRight;
  const rightGini = 1 - pR1 * pR1 - (1 - pR1) * (1 - pR1);

  // Weighted impurity decrease
  const decrease = n * parentGini - nLeft * leftGini - nRight * rightGini;
  importances[node.featureIndex!] += decrease;

  // Recurse
  computeNodeImportances(node.left!, leftIdx, X, y, importances);
  computeNodeImportances(node.right!, rightIdx, X, y, importances);
}
