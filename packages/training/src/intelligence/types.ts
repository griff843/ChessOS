/**
 * Types for Chess-OS intelligence layer: critical position scoring and ranking.
 */

import type { ChessColor } from "@chess-os/chess-core";
import type { GamePhase, MistakeLabel } from "@chess-os/classifier";

/** Factor breakdown for a criticality score. */
export interface CriticalityFactors {
  riskComponent: number;
  tensionComponent: number;
  phaseComponent: number;
  swingComponent: number;
}

/** A scored and ranked position within a game. */
export interface CriticalPosition {
  gameId: string;
  positionId: string;
  ply: number;
  moveSan: string;
  mover: ChessColor;
  fen: string;
  evalCp: number;
  phase: GamePhase;
  predictedRisk: number;
  predictedClass: number;
  actualLabel: MistakeLabel;
  criticalityScore: number;
  rank: number;
  factors: CriticalityFactors;
}

/** Result artifact for a single game's critical positions. */
export interface CriticalPositionsResult {
  gameId: string;
  totalPositions: number;
  topN: number;
  positions: CriticalPosition[];
  scoredAt: string;
}

/** Mover color audit results. */
export interface MoverColorStats {
  count: number;
  positiveCount: number;
  positiveRate: number;
  predictedPositiveCount: number;
  predictedPositiveRate: number;
}

export interface MoverColorAuditResult {
  totalPositions: number;
  white: MoverColorStats;
  black: MoverColorStats;
  featureImportance: number;
  finding: string;
}
