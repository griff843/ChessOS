/**
 * Types for training target generation.
 *
 * Training targets are positions selected from critical positions
 * that are suitable for puzzle / drill / review exercises.
 */

import type { ChessColor } from "@chess-os/chess-core";
import type { GamePhase, MistakeLabel } from "@chess-os/classifier";
import type { CriticalityFactors } from "../intelligence/types";
import type { ExercisePerspective } from "../perspective/player-perspective";

/**
 * Target type taxonomy.
 *
 * - blunder:        Player blundered — highest training value
 * - mistake:        Player made a mistake
 * - inaccuracy:     Player made an inaccuracy
 * - critical_test:  Player found the right move under high predicted risk
 */
export type TrainingTargetType =
  | "blunder"
  | "mistake"
  | "inaccuracy"
  | "critical_test";

/** Priority factor breakdown for a training target. */
export interface TargetPriorityFactors {
  criticalityComponent: number;
  labelSeverityComponent: number;
  tensionComponent: number;
  phaseComponent: number;
}

/** A single training target derived from a critical position. */
export interface TrainingTarget {
  gameId: string;
  positionId: string;
  ply: number;
  moveSan: string;
  mover: ChessColor;
  heroColor: ChessColor | null;
  perspective: ExercisePerspective;
  fen: string;
  evalCp: number;
  phase: GamePhase;
  actualLabel: MistakeLabel;
  targetType: TrainingTargetType;
  predictedRisk: number;
  criticalityScore: number;
  criticalityFactors: CriticalityFactors;
  targetPriority: number;
  priorityFactors: TargetPriorityFactors;
  rank: number;
}

/** Result artifact for a single game's training targets. */
export interface TrainingTargetsResult {
  gameId: string;
  totalPositions: number;
  totalCandidates: number;
  topN: number;
  targets: TrainingTarget[];
  scoringConfig: {
    excludedFeatures: string[];
    productionSafe: boolean;
  };
  generatedAt: string;
}
