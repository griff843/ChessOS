/**
 * Types for M9B personalized curriculum planner.
 *
 * All types are read-only snapshots — no mutation to canonical state.
 */

import type { LessonCategory } from "../exercises/types.js";

// ── Curriculum Theme ──────────────────────────────────────────────

/**
 * Theme assigned to each session in the curriculum.
 *
 * Priority order (first matching rule wins):
 *   1. blunder_cleanup       — critical blunder patterns detected
 *   2. tactical_repair       — tactical/calculation categories worsening
 *   3. instability_reduction — high ratio of unstable exercises
 *   4. consolidation         — improving trends but fragile mastery
 *   5. difficulty_expansion  — ready for harder material
 */
export type CurriculumTheme =
  | "blunder_cleanup"
  | "tactical_repair"
  | "consolidation"
  | "instability_reduction"
  | "difficulty_expansion";

// ── Difficulty Mix ────────────────────────────────────────────────

/** Difficulty distribution for a session (must sum to 10). */
export interface DifficultyMix {
  easy: number;
  medium: number;
  hard: number;
}

// ── Exercise Quota ────────────────────────────────────────────────

/** How many review vs fresh exercises to include. */
export interface ExerciseQuota {
  reviewSlots: number;
  freshSlots: number;
  total: number;
  reason: string;
}

// ── Session Roadmap ───────────────────────────────────────────────

/** Per-session roadmap detail within the curriculum. */
export interface SessionRoadmap {
  sessionIndex: number;
  theme: CurriculumTheme;
  focusCategory: LessonCategory;
  secondaryCategory: LessonCategory | null;
  difficultyMix: DifficultyMix;
  exerciseQuota: ExerciseQuota;
  rationale: string;
}

// ── Progression Gates ─────────────────────────────────────────────

/** A single gate criterion with current value and threshold. */
export interface GateCriterion {
  name: string;
  description: string;
  currentValue: number;
  threshold: number;
  passed: boolean;
}

/** Gate type classification. */
export type GateType = "accuracy" | "mastery" | "review_load" | "trend" | "eval_loss";

/** Progression gate for advancing difficulty/complexity. */
export interface ProgressionGate {
  gateName: string;
  gateType: GateType;
  criteria: GateCriterion[];
  allPassed: boolean;
  recommendation: string;
}

/** Complete progression gates artifact. */
export interface ProgressionGates {
  generatedAt: string;
  gates: ProgressionGate[];
  overallReadiness: boolean;
  readinessSummary: string;
}

// ── Curriculum Plan ───────────────────────────────────────────────

/** Theme selection rationale for a single session. */
export interface ThemeAssignment {
  sessionIndex: number;
  theme: CurriculumTheme;
  reason: string;
  triggerMetric: string;
  triggerValue: number;
}

/** Complete curriculum plan artifact. */
export interface CurriculumPlan {
  generatedAt: string;
  sessionCount: number;
  themeAssignments: ThemeAssignment[];
  sessions: SessionRoadmap[];
  progressionGates: ProgressionGates;
  overallRationale: string;
}

// ── Configuration Constants ───────────────────────────────────────

export const CURRICULUM_CONFIG = {
  defaultSessionCount: 5,
  defaultSessionSize: 10,

  /** Difficulty mixes by theme (must sum to 10). */
  difficultyMixByTheme: {
    blunder_cleanup: { easy: 5, medium: 3, hard: 2 },
    tactical_repair: { easy: 3, medium: 4, hard: 3 },
    consolidation: { easy: 2, medium: 5, hard: 3 },
    instability_reduction: { easy: 4, medium: 4, hard: 2 },
    difficulty_expansion: { easy: 2, medium: 3, hard: 5 },
  } satisfies Record<CurriculumTheme, DifficultyMix>,

  /** Review slots by review pressure level. */
  reviewSlotsByPressure: {
    high: 5,
    normal: 3,
    low: 1,
    none: 0,
  },

  /** Overdue count thresholds for pressure levels. */
  pressureThresholds: {
    high: 10,
    normal: 3,
    low: 1,
  },

  /** Thresholds for theme selection. */
  themeThresholds: {
    blunderCleanupMinBlunders: 3,
    blunderCleanupOnCritical: true,
    tacticalRepairCategories: [
      "tactical_miss",
      "calculation_error",
    ] as LessonCategory[],
    instabilityRatioThreshold: 0.25,
    consolidationMinImproving: 1,
    expansionMinAccuracy: 0.75,
    expansionMaxUnstableRatio: 0.10,
  },

  /** Progression gate thresholds. */
  gateThresholds: {
    accuracyMinRecent: 0.75,
    masteryMinRatio: 0.50,
    reviewMaxOverdue: 5,
    trendMaxWorsening: 0,
    evalLossMaxAvg: 150,
  },
} as const;
