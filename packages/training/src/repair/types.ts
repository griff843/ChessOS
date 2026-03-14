/**
 * Types for repair target generation.
 *
 * A RepairTargetRecommendation maps a GameLossDiagnosis to actionable
 * training focus areas using a bounded RepairTarget taxonomy.
 */

import type { DiagnosisCategory } from "../diagnosis/types.js";
import type { OpeningFamily } from "../openings/types.js";

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

// ── Repertoire Branch Repair ─────────────────────────────────────────

/** Confidence band for a repertoire branch match. */
export type BranchRepairConfidence = "high" | "medium" | "low";

/**
 * The type of opening repair recommended.
 * - line_recall: memorise the specific canonical move order
 * - concept_review: study the structural/strategic ideas of the branch
 * - family_study: broader study of the opening family (used when match is weak)
 */
export type BranchRepairMode = "line_recall" | "concept_review" | "family_study";

/**
 * Output of branch-aware opening repair matching.
 *
 * Connects an opening-related GameLossDiagnosis to the nearest seeded
 * repertoire line. When matched is false the system degrades gracefully
 * to broader guidance without fabricating precision.
 */
export interface RepertoireBranchRepair {
  /** Whether a trustworthy repertoire branch match was found. */
  matched: boolean;

  /** The matched repertoire line ID (e.g. "scotch_main"), null when not matched. */
  lineId: string | null;

  /** Human-readable line name, null when not matched. */
  lineName: string | null;

  /** Repertoire key (e.g. "white_scotch"), null when not matched. */
  repertoireKey: string | null;

  /** Repertoire display name, null when not matched. */
  repertoireName: string | null;

  /** Opening family of the matched line or null. */
  openingFamily: OpeningFamily | null;

  /** How many game moves matched the canonical line prefix. */
  matchedMoveCount: number;

  /** Ply (1-indexed) where the game first diverged, null if stayed on path. */
  firstDeviationPly: number | null;

  /** The move played at the deviation point, null if stayed on path. */
  firstDeviationMove: string | null;

  /** True when the deviation was made by the user (not the opponent). */
  deviationByUser: boolean;

  /** Type of repair recommended based on diagnosis category and match quality. */
  repairMode: BranchRepairMode;

  /** Match quality band derived from matched move count. */
  confidence: BranchRepairConfidence;

  /** Deterministic human-readable explanation for the recommendation. */
  explanation: string;

  /** Line ID to link when routing to the repertoire drill page. */
  drillLineId: string | null;
}

// ── Review Session Request ───────────────────────────────────────────

/**
 * How strongly the review weighting should bias session exercise selection.
 * Derived from EvidenceStatus — "none" triggers a graceful skip of weighting.
 */
export type ReviewWeightingStrength = "strong" | "moderate" | "weak" | "none";

/**
 * Typed input from review that biases the next generated study session.
 *
 * Created by `buildReviewSessionRequest` from the coaching review output.
 * Consumed by `applyReviewWeighting` (training) and `generateNewSession` (web action).
 */
export interface ReviewSessionRequest {
  /** Game that triggered this review (for observability). */
  sourceGameId: string;
  /** Primary repair target identified in the review. */
  primaryTarget: RepairTarget;
  /** Secondary targets from contributing factors. */
  secondaryTargets: RepairTarget[];
  /** Pattern evidence status — influences boost strength. null when evidence is unavailable. */
  evidenceStatus: EvidenceStatus | null;
  /** Whether a repertoire branch match was found (for opening targets). */
  branchRepairMatched: boolean;
  /**
   * Pre-computed boost strength, derived from evidenceStatus:
   * - recurring/persistent → "strong" (score 3 for primary matches)
   * - emerging/null → "moderate" (score 2)
   * - isolated → "weak" (score 1)
   * - improving → "none" (skip weighting — system is already trending correctly)
   */
  targetBoostStrength: ReviewWeightingStrength;
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
