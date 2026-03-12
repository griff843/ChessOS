/**
 * Build training targets for a game.
 *
 * Orchestrates: production-safe scoring → candidate selection → ranking.
 *
 * Production-safe scoring excludes moverIsBlack per the M5B decision.
 * The tree model passed in must be Config B (trained without moverIsBlack).
 */

import type { TrainingDatasetRow } from "../dataset/types";
import type { DecisionTreeParams } from "../model/decision-tree";
import { DecisionTree } from "../model/decision-tree";
import { rowToFeatures, FEATURE_NAMES } from "../model/feature-matrix";
import { scorePositionRisk } from "../intelligence/risk-score";
import { computeCriticalityScore } from "../intelligence/criticality-score";
import type { CriticalPosition } from "../intelligence/types";
import { selectTrainingTargets } from "./select-training-targets";
import type { TrainingTargetsResult } from "./types";

/** Features excluded for production scoring (M5B decision). */
export const PRODUCTION_EXCLUDED_FEATURES = ["moverIsBlack"];

const DEFAULT_TOP_N = 10;

/**
 * Build training targets for a single game.
 *
 * @param rows        All dataset rows for the game
 * @param treeParams  Config B tree params (trained without moverIsBlack)
 * @param topN        Maximum number of targets to return
 */
export function buildGameTrainingTargets(
  rows: TrainingDatasetRow[],
  treeParams: DecisionTreeParams,
  topN: number = DEFAULT_TOP_N
): TrainingTargetsResult {
  if (rows.length === 0) {
    return {
      gameId: "",
      totalPositions: 0,
      totalCandidates: 0,
      topN,
      targets: [],
      scoringConfig: {
        excludedFeatures: PRODUCTION_EXCLUDED_FEATURES,
        productionSafe: true,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  const tree = DecisionTree.fromParams(treeParams);
  const gameId = rows[0].gameId;

  // Compute indices to keep (exclude moverIsBlack)
  const keepIndices = FEATURE_NAMES
    .map((name, i) => ({ name, i }))
    .filter(({ name }) => !PRODUCTION_EXCLUDED_FEATURES.includes(name))
    .map(({ i }) => i);

  // Score all positions with production-safe features
  const allPositions: CriticalPosition[] = rows.map((row) => {
    const fullFeatures = rowToFeatures(row);
    const features = keepIndices.map((i) => fullFeatures[i]);
    const { predictedRisk, predictedClass } = scorePositionRisk(tree, features);
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
      rank: 0,
      factors,
    };
  });

  // Select and rank training targets
  const { targets, totalCandidates } = selectTrainingTargets(
    allPositions,
    topN
  );

  return {
    gameId,
    totalPositions: rows.length,
    totalCandidates,
    topN,
    targets,
    scoringConfig: {
      excludedFeatures: PRODUCTION_EXCLUDED_FEATURES,
      productionSafe: true,
    },
    generatedAt: new Date().toISOString(),
  };
}
