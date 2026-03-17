import type { EvaluatedPosition, EngineMode } from "@chess-os/engine";

/**
 * Canonical export artifact per EVALUATED_POSITION_EXPORT_CONTRACT.md.
 * Preserves EvaluatedPosition objects exactly.
 */
export interface EvaluatedPositionExport {
  gameId: string;
  source: {
    format: "pgn";
    name?: string;
  };
  engine: {
    mode: EngineMode;
    name: string;
    depth?: number;
  };
  createdAt: string;
  positions: EvaluatedPosition[];
}
