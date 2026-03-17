import type { EvaluatedPosition } from "@chess-os/engine";
import type { FeatureVector, MistakeClassification } from "@chess-os/classifier";
import type { ChessColor } from "@chess-os/chess-core";
import type { TrainingDatasetRow } from "./types";
import { deriveExercisePerspective } from "../perspective/player-perspective";

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
  classification: MistakeClassification,
  heroColor: ChessColor | null = null
): TrainingDatasetRow {
  return {
    gameId: positionBefore.gameId,
    positionId: positionBefore.id,
    ply: classification.ply,
    fen: positionBefore.fen,
    mover: positionBefore.sideToMove,
    heroColor,
    perspective: deriveExercisePerspective({ mover: positionBefore.sideToMove, heroColor }),
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
