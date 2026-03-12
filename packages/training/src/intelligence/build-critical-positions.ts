/**
 * Build critical positions for a game.
 *
 * Orchestrates: feature extraction → risk scoring → criticality scoring → ranking.
 */

import type { TrainingDatasetRow } from "../dataset/types";
import type { DecisionTreeParams } from "../model/decision-tree";
import { DecisionTree } from "../model/decision-tree";
import { rowToFeatures, FEATURE_NAMES } from "../model/feature-matrix";
import { scorePositionRisk } from "./risk-score";
import { computeCriticalityScore } from "./criticality-score";
import { rankCriticalPositions } from "./rank-critical-positions";
import type { CriticalPosition, CriticalPositionsResult } from "./types";

const DEFAULT_TOP_N = 5;

/**
 * Compute indices to keep after excluding named features.
 * When excludeFeatureNames is empty, returns all indices (no-op).
 */
function computeKeepIndices(excludeFeatureNames: string[]): number[] {
  if (excludeFeatureNames.length === 0) {
    return FEATURE_NAMES.map((_, i) => i);
  }
  return FEATURE_NAMES
    .map((name, i) => ({ name, i }))
    .filter(({ name }) => !excludeFeatureNames.includes(name))
    .map(({ i }) => i);
}

/**
 * Score and rank all positions in a game. Returns the top N critical positions.
 *
 * @param excludeFeatureNames  Feature names to strip from the feature vector
 *   before passing to the tree. Use `["moverIsBlack"]` for production-safe
 *   scoring (per M5B decision). Default: [] (all features).
 */
export function buildGameCriticalPositions(
  rows: TrainingDatasetRow[],
  treeParams: DecisionTreeParams,
  topN: number = DEFAULT_TOP_N,
  excludeFeatureNames: string[] = []
): CriticalPositionsResult {
  if (rows.length === 0) {
    return {
      gameId: "",
      totalPositions: 0,
      topN,
      positions: [],
      scoredAt: new Date().toISOString(),
    };
  }

  const tree = DecisionTree.fromParams(treeParams);
  const gameId = rows[0].gameId;
  const keepIndices = computeKeepIndices(excludeFeatureNames);

  // Score every position
  const scored: CriticalPosition[] = rows.map((row) => {
    const fullFeatures = rowToFeatures(row);
    const features = keepIndices.map((i) => fullFeatures[i]);
    const { predictedRisk, predictedClass } = scorePositionRisk(
      tree,
      features
    );
    const { score, factors } = computeCriticalityScore(
      predictedRisk,
      row.evalCp,
      row.phase,
      row.swingCp
    );

    return {
      gameId: row.gameId,
      positionId: row.positionId,
      ply: row.ply,
      moveSan: row.moveSan,
      mover: row.mover,
      fen: row.fen,
      evalCp: row.evalCp,
      phase: row.phase,
      predictedRisk,
      predictedClass,
      actualLabel: row.label,
      criticalityScore: score,
      rank: 0, // assigned by ranking step
      factors,
    };
  });

  // Rank and take top N
  const topPositions = rankCriticalPositions(scored, topN);

  return {
    gameId,
    totalPositions: rows.length,
    topN,
    positions: topPositions,
    scoredAt: new Date().toISOString(),
  };
}
