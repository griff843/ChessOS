import type { TrainingDatasetRow } from "../dataset/types";

/**
 * Ordered list of numeric features extracted from each TrainingDatasetRow.
 * Booleans → 0/1. Categoricals → ordinal or one-hot encoded.
 */
export const FEATURE_NAMES: string[] = [
  // Engine features
  "evalCp",
  "depth",
  "pvLength",
  "bestMovePresent",

  // Game state
  "ply",
  "halfmoveClock",
  "fullmoveNumber",
  "moverIsBlack",

  // Castling (4 flags)
  "castlingWK",
  "castlingWQ",
  "castlingBK",
  "castlingBQ",
  "enPassantAvailable",

  // Piece counts (10)
  "whitePawnCount",
  "whiteKnightCount",
  "whiteBishopCount",
  "whiteRookCount",
  "whiteQueenCount",
  "blackPawnCount",
  "blackKnightCount",
  "blackBishopCount",
  "blackRookCount",
  "blackQueenCount",

  // Material aggregates
  "materialWhite",
  "materialBlack",
  "materialDiff",

  // Phase one-hot
  "phaseOpening",
  "phaseMiddlegame",
  "phaseEndgame",

  // Eval bucket (ordinal 0-6)
  "evalBucketOrdinal",
];

const EVAL_BUCKET_ORDINAL: Record<string, number> = {
  crushing_disadvantage: 0,
  losing: 1,
  slight_disadvantage: 2,
  equal: 3,
  slight_advantage: 4,
  winning: 5,
  crushing_advantage: 6,
};

/**
 * Extract a numeric feature vector from a single dataset row.
 */
export function rowToFeatures(row: TrainingDatasetRow): number[] {
  const f = row.features;
  return [
    f.evalCp,
    f.depth,
    f.pvLength,
    f.bestMovePresent ? 1 : 0,

    f.ply,
    f.halfmoveClock,
    f.fullmoveNumber,
    row.mover === "black" ? 1 : 0,

    f.castlingRightsWhiteKingside ? 1 : 0,
    f.castlingRightsWhiteQueenside ? 1 : 0,
    f.castlingRightsBlackKingside ? 1 : 0,
    f.castlingRightsBlackQueenside ? 1 : 0,
    f.enPassantAvailable ? 1 : 0,

    f.whitePawnCount,
    f.whiteKnightCount,
    f.whiteBishopCount,
    f.whiteRookCount,
    f.whiteQueenCount,
    f.blackPawnCount,
    f.blackKnightCount,
    f.blackBishopCount,
    f.blackRookCount,
    f.blackQueenCount,

    f.materialWhite,
    f.materialBlack,
    f.materialDiff,

    f.phase === "opening" ? 1 : 0,
    f.phase === "middlegame" ? 1 : 0,
    f.phase === "endgame" ? 1 : 0,

    EVAL_BUCKET_ORDINAL[f.evalBucket] ?? 3,
  ];
}

/**
 * Convert the label to a binary target:
 *   0 = not_mistake (best_or_ok)
 *   1 = mistake_or_worse (inaccuracy | mistake | blunder)
 */
function rowToTarget(row: TrainingDatasetRow): number {
  return row.label === "best_or_ok" ? 0 : 1;
}

export interface FeatureMatrix {
  X: number[][];
  y: number[];
  featureNames: string[];
}

/**
 * Convert dataset rows into a numeric feature matrix and target vector.
 */
export function rowsToFeatureMatrix(rows: TrainingDatasetRow[]): FeatureMatrix {
  return {
    X: rows.map(rowToFeatures),
    y: rows.map(rowToTarget),
    featureNames: FEATURE_NAMES,
  };
}

/**
 * Standardization parameters (mean/std per feature).
 */
export interface StandardizationParams {
  means: number[];
  stds: number[];
}

/**
 * Compute mean and stddev for each feature column from training data.
 */
export function computeStandardization(X: number[][]): StandardizationParams {
  const nFeatures = X[0].length;
  const means = new Array(nFeatures).fill(0);
  const stds = new Array(nFeatures).fill(0);

  for (const row of X) {
    for (let j = 0; j < nFeatures; j++) {
      means[j] += row[j];
    }
  }
  for (let j = 0; j < nFeatures; j++) {
    means[j] /= X.length;
  }

  for (const row of X) {
    for (let j = 0; j < nFeatures; j++) {
      stds[j] += (row[j] - means[j]) ** 2;
    }
  }
  for (let j = 0; j < nFeatures; j++) {
    stds[j] = Math.sqrt(stds[j] / X.length);
  }

  return { means, stds };
}

/**
 * Apply standardization: (x - mean) / std. Constant features (std=0) become 0.
 */
export function standardize(
  X: number[][],
  params: StandardizationParams
): number[][] {
  return X.map((row) =>
    row.map((val, j) =>
      params.stds[j] > 0 ? (val - params.means[j]) / params.stds[j] : 0
    )
  );
}
