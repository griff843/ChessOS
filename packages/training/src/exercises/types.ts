/**
 * Types for the M5D explanation layer / answer key scaffold.
 *
 * A TrainingExercise enriches a TrainingTarget with:
 *   - engine answer (best move, PV, eval swing)
 *   - lesson category (deterministic taxonomy)
 *   - difficulty estimate (easy / medium / hard)
 *   - reason codes (structured tags)
 */

import type { ChessColor } from "@chess-os/chess-core";
import type { GamePhase, MistakeLabel } from "@chess-os/classifier";
import type { CriticalityFactors } from "../intelligence/types";
import type { TrainingTargetType, TargetPriorityFactors } from "../targets/types";

// ── Lesson Category Taxonomy ──────────────────────────────────────────

/**
 * Deterministic lesson categories derived from eval swing, phase,
 * material change, and PV length.
 *
 * Cascade priority (first match wins):
 *   1. critical_defense  — critical_test target (correct move under danger)
 *   2. endgame_technique — error in endgame phase
 *   3. material_loss     — eval swing >= 300cp (roughly a piece)
 *   4. opening_inaccuracy— error in opening phase
 *   5. calculation_error — PV length >= 5 AND swing >= 150cp
 *   6. tactical_miss     — swing >= 200cp in middlegame
 *   7. positional_error  — default for remaining errors
 */
export type LessonCategory =
  | "tactical_miss"
  | "material_loss"
  | "positional_error"
  | "endgame_technique"
  | "opening_inaccuracy"
  | "calculation_error"
  | "critical_defense";

// ── Difficulty Estimate ───────────────────────────────────────────────

/**
 * Difficulty tiers for exercises.
 *
 * Derived from a composite score:
 *   pvLength_norm × 0.35  (longer PV = harder to calculate)
 *   + risk_norm × 0.25    (higher model risk = harder position)
 *   + swing_norm × 0.25   (larger swing = more to see)
 *   + phase_weight × 0.15 (middlegame hardest)
 *
 * Thresholds: >= 0.60 → hard, >= 0.35 → medium, else → easy
 */
export type DifficultyEstimate = "easy" | "medium" | "hard";

// ── Reason Codes ──────────────────────────────────────────────────────

/**
 * Machine-readable tags explaining why a position is important.
 * Multiple codes can apply to a single position.
 */
export type ReasonCode =
  | "high_eval_swing"
  | "critical_position"
  | "blunder"
  | "late_blunder"
  | "endgame_mistake"
  | "opening_error"
  | "long_calculation"
  | "near_equality"
  | "high_risk_correct";

// ── Engine Answer ─────────────────────────────────────────────────────

/** Engine analysis answer key for a single position. */
export interface EngineAnswer {
  bestMoveUci: string | undefined;
  bestMoveSan: string | undefined;
  pv: string[];
  evalBefore: number;
  evalAfter: number;
  evalSwing: number;
}

// ── Explanation Scaffold ──────────────────────────────────────────────

/** Structured explanation metadata for a single exercise. */
export interface ExplanationScaffold {
  lessonCategory: LessonCategory;
  reasonCodes: ReasonCode[];
  difficultyEstimate: DifficultyEstimate;
  difficultyScore: number;
}

// ── Training Exercise ─────────────────────────────────────────────────

/** A complete exercise enriched from a training target. */
export interface TrainingExercise {
  // Position identity
  gameId: string;
  positionId: string;
  ply: number;
  fen: string;
  sideToMove: ChessColor;
  phase: GamePhase;

  // Played move
  playedMoveSan: string;

  // Engine answer key
  engineAnswer: EngineAnswer;

  // Training metadata (carried from TrainingTarget)
  targetType: TrainingTargetType;
  targetPriority: number;
  predictedRisk: number;
  criticalityScore: number;
  criticalityFactors: CriticalityFactors;
  priorityFactors: TargetPriorityFactors;
  actualLabel: MistakeLabel;

  // Explanation scaffold
  explanation: ExplanationScaffold;

  // Rank within game (from target selection)
  rank: number;
}

// ── Result Envelope ───────────────────────────────────────────────────

/** Per-game artifact envelope for training exercises. */
export interface TrainingExercisesResult {
  gameId: string;
  totalTargets: number;
  exercises: TrainingExercise[];
  generatedAt: string;
}
