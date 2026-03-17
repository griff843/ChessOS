/**
 * Types for repair target generation.
 *
 * A RepairTargetRecommendation maps a GameLossDiagnosis to actionable
 * training focus areas using a bounded RepairTarget taxonomy.
 */

import type { DiagnosisCategory } from "../diagnosis/types.js";
import type { OpeningFamily } from "../openings/types.js";

// ── Session Performance Band ─────────────────────────────────────────

/**
 * How well the learner performed on exercises relevant to a repair target
 * within a targeted training session.
 */
export type SessionPerformanceBand =
  | "strong"           // ≥70% correct on relevant exercises
  | "mixed"            // 40–69% correct
  | "weak"             // <40% correct
  | "insufficient_data"; // fewer than MIN_MATCH_THRESHOLD relevant exercises

// ── Target Accuracy Summary ───────────────────────────────────────────

/**
 * Bounded per-session accuracy for exercises relevant to a repair target.
 * Derived from real session results — never overclaimed.
 */
export interface TargetAccuracySummary {
  /** Session this accuracy was computed from. */
  sessionId: string;
  /** The repair target being evaluated. */
  target: RepairTarget;
  /** Exercises in the session whose lessonCategory mapped to this target. */
  matchedExerciseCount: number;
  /** Total exercises in the session (for context). */
  totalExerciseCount: number;
  /** Matched exercises answered correctly. */
  correctCount: number;
  /** correctCount / matchedExerciseCount, null when insufficient data. */
  accuracyRate: number | null;
  /** Interpretive band derived from accuracyRate. */
  performanceBand: SessionPerformanceBand;
  /** Deterministic human-readable explanation. */
  explanation: string;
}

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
  /** Coaching memory emphasis override, if available. */
  coachingEmphasis?: CoachingEmphasis | null;
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

// ── Coaching Memory ──────────────────────────────────────────────────

/**
 * Persistence state that accounts for whether targeted training has
 * been launched and what happened across subsequent games.
 */
export type CoachingPersistenceState =
  | "first_occurrence"
  | "emerging"
  | "recurring_no_training"
  | "improving_after_training"
  | "persistent_despite_training"
  | "recurring_limited_data";

/** Recommended emphasis adjustment for the next training session. */
export type CoachingEmphasis = "increase" | "maintain" | "reduce" | "monitor";

// ── Coaching Memory Summary (M009) ────────────────────────────────────

/**
 * How much data is available to support a meaningful coaching memory summary.
 * Controls messaging and warnings in the UI.
 */
export type MemorySummaryReadiness =
  | "ready"    // ≥ MIN_GAMES_FOR_SUMMARY games analyzed
  | "sparse"   // Some data, but < MIN_GAMES_FOR_SUMMARY
  | "no_data"; // No diagnosed games at all

/**
 * A single repair target's training-aware state for display in the summary.
 * Distilled from CoachingMemory for compact rendering.
 */
export interface CoachingMemoryEntry {
  /** The repair target category. */
  target: RepairTarget;
  /** Training-aware persistence classification. */
  persistenceState: CoachingPersistenceState;
  /** Confidence in the classification. */
  confidence: "high" | "moderate" | "low";
  /** Recommended emphasis for next session. */
  recommendedEmphasis: CoachingEmphasis;
  /** Total times this target appeared across all diagnosed games. */
  totalOccurrences: number;
  /** Number of sessions that targeted this repair target. */
  targetedSessionCount: number;
  /** Deterministic explanation from CoachingMemory. */
  explanation: string;
  /** Numeric rank for ordering: higher = higher priority. */
  priorityScore: number;
}

/**
 * Bounded cross-game summary of coaching memory state.
 *
 * Aggregates CoachingMemory evaluations across all available game
 * diagnoses into a single, interpretable summary for the coach page.
 * Deterministic and grounded in real session + diagnosis truth.
 */
export interface CoachingMemorySummary {
  generatedAt: string;
  /** Data availability classification. */
  readiness: MemorySummaryReadiness;
  /** Total game diagnoses available (all games, not just losses). */
  totalGamesAnalyzed: number;
  /** Number of distinct repair targets with ≥1 occurrence. */
  totalTargetsTracked: number;

  // ── Grouped by persistence state ───────────────────────────────────
  /** Targets that recur despite targeted training. */
  persistent: CoachingMemoryEntry[];
  /** Targets showing improvement after training. */
  improving: CoachingMemoryEntry[];
  /** Recurring targets with no targeted training launched yet. */
  recurringNoTraining: CoachingMemoryEntry[];
  /** Targets with training launched but insufficient post-game data. */
  limitedData: CoachingMemoryEntry[];
  /** Targets appearing 1-2 times, not yet a clear pattern. */
  emerging: CoachingMemoryEntry[];

  // ── Counts ─────────────────────────────────────────────────────────
  persistentCount: number;
  improvingCount: number;
  recurringNoTrainingCount: number;
  limitedDataCount: number;
  emergingCount: number;

  /**
   * Top-priority targets ordered by urgency.
   * At most 5 entries: persistent → recurringNoTraining → limitedData → emerging.
   * Targets in "improving" are excluded (they do not need urgent attention).
   */
  topPriorities: CoachingMemoryEntry[];

  /** One-line summary message for display. */
  summaryMessage: string;
}

/** Minimal summary of a session that included reviewTargeting metadata. */
export interface TargetedSessionSummary {
  sessionId: string;
  createdAt: string;
  primaryTarget: string;
  boostStrength: string;
}

/**
 * Training-aware coaching memory for a repair target.
 *
 * Layers on top of RepairEvidence by incorporating whether targeted
 * training sessions have been launched and whether the weakness
 * persists, improves, or is too early to judge.
 *
 * v2 (M008): adds optional session-performance fields derived from
 * actual exercise accuracy in targeted sessions.
 */
export interface CoachingMemory {
  /** The repair target being tracked. */
  target: RepairTarget;
  /** Game that triggered this evaluation. */
  gameId: string;
  /** Training-aware persistence classification. */
  persistenceState: CoachingPersistenceState;
  /** Underlying frequency-based evidence. */
  evidence: RepairEvidence;
  /** How many targeted sessions exist for this target. */
  targetedSessionCount: number;
  /** ISO timestamp of the most recent targeted session, or null. */
  mostRecentTargetedSessionAt: string | null;
  /** Games analyzed after the most recent targeted session (excluding current). */
  gamesAfterTraining: number;
  /** How many post-training games had the same target diagnosed. */
  recurrencesAfterTraining: number;
  /** Confidence in the persistence classification. */
  confidence: "high" | "moderate" | "low";
  /** Deterministic human-readable explanation. */
  explanation: string;
  /** Recommended emphasis for the next session. */
  recommendedEmphasis: CoachingEmphasis;
  /**
   * Performance band derived from actual exercise accuracy in the most
   * recent targeted session. Undefined when no session data is available
   * or matching exercise count was insufficient.
   */
  sessionPerformanceBand?: SessionPerformanceBand;
  /**
   * Short note added to the explanation from target-accuracy evidence.
   * Only present when sessionPerformanceBand is not "insufficient_data".
   */
  sessionPerformanceNote?: string;
}
