import type { EvaluatedPosition } from "@chess-os/engine";
import type { EvalBucket, FeatureVector } from "./types";
import { extractFenFeatures } from "./fen-features";
import { extractMaterialFeatures } from "./material-features";
import { extractPhase } from "./phase-features";

function evalToBucket(evalCp: number): EvalBucket {
  if (evalCp >= 500) return "crushing_advantage";
  if (evalCp >= 200) return "winning";
  if (evalCp >= 50) return "slight_advantage";
  if (evalCp > -50) return "equal";
  if (evalCp > -200) return "slight_disadvantage";
  if (evalCp > -500) return "losing";
  return "crushing_disadvantage";
}

/**
 * Extract a typed FeatureVector from a single EvaluatedPosition.
 * Pure function — no I/O, fully deterministic.
 */
export function extractFeatures(pos: EvaluatedPosition): FeatureVector {
  const fen = extractFenFeatures(pos.fen);
  const material = extractMaterialFeatures(pos.fen);
  const phase = extractPhase(material, pos.ply);

  return {
    // Core metadata
    gameId: pos.gameId,
    positionId: pos.id,
    ply: pos.ply,
    sideToMove: pos.sideToMove,

    // Engine features
    evalCp: pos.evalCp,
    evalBucket: evalToBucket(pos.evalCp),
    depth: pos.depth,
    bestMovePresent: pos.bestMove != null,
    pvLength: pos.pv?.length ?? 0,

    // FEN / game-state
    ...fen,

    // Material
    ...material,

    // Phase
    phase,
  };
}
