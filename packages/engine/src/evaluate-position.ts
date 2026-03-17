import type { PositionSnapshot } from "@chess-os/chess-core";
import type { AnalysisEngine, EvaluatedPosition } from "./analysis/types";

const DEFAULT_DEPTH = 20;

/**
 * Evaluate a single position through an engine adapter.
 * This is the core seam between the snapshot pipeline and engine analysis.
 */
export async function evaluatePosition(
  snapshot: PositionSnapshot,
  engine: AnalysisEngine,
  engineName: string,
  depth: number = DEFAULT_DEPTH
): Promise<EvaluatedPosition> {
  const result = await engine.analyzePosition({
    fen: snapshot.fen,
    depth,
  });

  return {
    ...snapshot,
    evalCp: result.bestLine.scoreCp ?? 0,
    depth,
    bestMove: result.bestLine.move,
    pv: result.bestLine.pv,
    engineName,
  };
}
