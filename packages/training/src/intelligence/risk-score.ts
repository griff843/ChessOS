/**
 * Risk scoring using the Decision Tree model.
 *
 * The risk score for a position is P(mistake_or_worse) — the probability
 * that the position leads to a mistake or worse move, as estimated by
 * the tree's leaf probability distribution.
 *
 * Deterministic: same features always reach the same leaf.
 */

import { DecisionTree } from "../model/decision-tree";

/**
 * Score a single position's risk using the decision tree.
 * Returns P(mistake_or_worse) ∈ [0, 1].
 */
export function scorePositionRisk(
  tree: DecisionTree,
  features: number[]
): { predictedRisk: number; predictedClass: number } {
  const proba = tree.predictProba(features);
  return {
    predictedRisk: proba[1],
    predictedClass: proba[1] > 0.5 ? 1 : 0,
  };
}
