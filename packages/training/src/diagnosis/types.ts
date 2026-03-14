/**
 * Types for game loss diagnosis.
 *
 * A GameLossDiagnosis answers "what actually lost this game?" by identifying:
 *   - the primary loss reason from a bounded taxonomy
 *   - the first truly losing practical decision
 *   - optional contributing factors
 *   - a short actionable explanation
 */

import type { GamePhase, MistakeLabel } from "@chess-os/classifier";

// ── Diagnosis Category Taxonomy ─────────────────────────────────────

/**
 * Bounded taxonomy of primary loss reasons.
 *
 * Each category represents a distinct failure mode:
 *   - opening_memory_failure    — forgot or deviated from known theory
 *   - opening_concept_failure   — misunderstood opening principles
 *   - calculation_failure       — miscalculated a concrete variation
 *   - tactical_blunder          — missed a tactic (fork, pin, hanging piece)
 *   - strategic_misjudgment     — poor long-term plan or positional choice
 *   - time_trouble              — blunders concentrated in time pressure
 *   - endgame_technique_failure — failed to convert or defend an endgame
 *   - practical_collapse        — cascading errors after initial setback
 */
export type DiagnosisCategory =
  | "opening_memory_failure"
  | "opening_concept_failure"
  | "calculation_failure"
  | "tactical_blunder"
  | "strategic_misjudgment"
  | "time_trouble"
  | "endgame_technique_failure"
  | "practical_collapse";

// ── Diagnosis Move ──────────────────────────────────────────────────

/** The move identified as the first truly losing practical decision. */
export interface DiagnosisMove {
  positionId: string;
  ply: number;
  moveSan: string;
  fen: string;
  phase: GamePhase;
  label: MistakeLabel;
  evalBefore: number;
  evalAfter: number;
  swingCp: number;
}

// ── Contributing Factor ─────────────────────────────────────────────

/** A secondary factor that contributed to the loss. */
export interface ContributingFactor {
  category: DiagnosisCategory;
  ply: number;
  moveSan: string;
  swingCp: number;
  note: string;
}

// ── Game Loss Diagnosis ─────────────────────────────────────────────

/** Complete diagnosis for a single lost game. */
export interface GameLossDiagnosis {
  gameId: string;
  heroColor: "white" | "black" | null;

  /** Whether the game was actually lost (diagnosis only applies to losses). */
  gameLost: boolean;

  /** Primary loss reason from bounded taxonomy. */
  primaryCategory: DiagnosisCategory;

  /** The first truly losing practical decision. */
  losingMove: DiagnosisMove;

  /** Optional secondary factors that contributed to the loss (max 3). */
  contributingFactors: ContributingFactor[];

  /** Short actionable explanation (1-2 sentences). */
  explanation: string;

  /** Eval at game end (final position from hero perspective). */
  finalEvalCp: number;

  /** Total centipawn loss by hero across the game. */
  totalCpLoss: number;

  /** Number of mistakes/blunders by hero. */
  mistakeCount: number;
  blunderCount: number;

  diagnosedAt: string;
}
