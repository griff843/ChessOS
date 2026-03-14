/**
 * Types for repair target generation.
 *
 * A RepairTargetRecommendation maps a GameLossDiagnosis to actionable
 * training focus areas using a bounded RepairTarget taxonomy.
 */

import type { DiagnosisCategory } from "../diagnosis/types.js";

// ── Repair Target Taxonomy ──────────────────────────────────────────

export type RepairTarget =
  | "opening_line_recall"
  | "opening_concept_understanding"
  | "calculation_discipline"
  | "tactical_pattern_recognition"
  | "candidate_move_generation"
  | "strategic_planning"
  | "time_management"
  | "endgame_technique"
  | "practical_stabilization";

// ── Secondary Repair Target ─────────────────────────────────────────

/** A secondary training focus derived from a contributing factor. */
export interface SecondaryRepairTarget {
  target: RepairTarget;
  sourceCategory: DiagnosisCategory;
  reason: string;
}

// ── Repair Target Recommendation ────────────────────────────────────

/** Complete repair recommendation derived from a game diagnosis. */
export interface RepairTargetRecommendation {
  gameId: string;

  /** Whether repair is needed (false when game was not lost). */
  repairNeeded: boolean;

  /** Primary repair target derived from primaryCategory. */
  primaryTarget: RepairTarget;

  /** Why this target was selected (1 sentence). */
  primaryReason: string;

  /** Secondary targets from contributing factors, deduped against primary. */
  secondaryTargets: SecondaryRepairTarget[];

  /** 1-2 sentence human-readable summary. */
  summary: string;

  generatedAt: string;
}

// ── Evidence Status ─────────────────────────────────────────────────

export type EvidenceStatus =
  | "isolated"
  | "emerging"
  | "recurring"
  | "improving"
  | "persistent";

// ── Diagnosis History Entry ─────────────────────────────────────────

/** Lightweight summary of a prior game's diagnosis for evidence tracking. */
export interface DiagnosisHistoryEntry {
  gameId: string;
  primaryTarget: RepairTarget;
  diagnosedAt: string;
}

// ── Repair Evidence ─────────────────────────────────────────────────

/** Evidence evaluation for a repair target across game history. */
export interface RepairEvidence {
  currentTarget: RepairTarget;
  status: EvidenceStatus;
  totalOccurrences: number;
  recentOccurrences: number;
  olderOccurrences: number;
  totalGamesAnalyzed: number;
  explanation: string;
}
