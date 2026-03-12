import type { EvaluatedPosition } from "@chess-os/engine";
import type { FeatureVector, MistakeClassification } from "@chess-os/classifier";
import type { TrainingDatasetRow } from "./types";

/**
 * Build a single training dataset row from aligned pipeline outputs.
 *
 * @param positionBefore — the evaluated position from which the move was played
 * @param feature — the feature vector extracted from positionBefore
 * @param classification — the mistake classification for this move
 */
export function buildDatasetRow(
  positionBefore: EvaluatedPosition,
  feature: FeatureVector,
  classification: MistakeClassification
): TrainingDatasetRow {
  return {
    gameId: positionBefore.gameId,
    positionId: positionBefore.id,
    ply: classification.ply,
    fen: positionBefore.fen,
    mover: positionBefore.sideToMove,
    moveSan: classification.moveSan,

    evalCp: positionBefore.evalCp,
    depth: positionBefore.depth,
    bestMove: positionBefore.bestMove,
    pv: positionBefore.pv,

    swingCp: classification.swingCp,
    label: classification.label,
    phase: classification.phase,

    features: feature,
  };
}
