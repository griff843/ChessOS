/**
 * Types for M9A coach layer / deterministic study guidance.
 *
 * All types are read-only snapshots — no mutation to canonical state.
 */

import type { LessonCategory, DifficultyEstimate } from "../exercises/types.js";
import type { TrendDirection } from "../trends/types.js";

// ── Mistake Patterns ────────────────────────────────────────────────

/** Severity classification for a category pattern. */
export type PatternSeverity = "critical" | "moderate" | "minor";

/** A single category's mistake pattern analysis. */
export interface MistakePatternEntry {
  category: LessonCategory;
  severity: PatternSeverity;
  lifetimeMissRate: number;
  recentMissRate: number | null;
  trendDirection: TrendDirection;
  avgEvalLossCp: number | null;
  exerciseCount: number;
  incorrectCount: number;
  overdueCount: number;
  unstableCount: number;
  description: string;
}

/** Difficulty-level mistake pattern. */
export interface DifficultyPattern {
  difficulty: DifficultyEstimate;
  lifetimeMissRate: number;
  recentMissRate: number | null;
  trendDirection: TrendDirection;
  exerciseCount: number;
  incorrectCount: number;
}

/** Profile of blunder and mistake frequency. */
export interface BlunderProfile {
  totalBlunders: number;
  totalMistakes: number;
  worstCategories: string[];
  avgEvalLossCp: number | null;
}

/** Complete mistake patterns artifact. */
export interface MistakePatterns {
  generatedAt: string;
  categoryPatterns: MistakePatternEntry[];
  difficultyPatterns: DifficultyPattern[];
  blunderProfile: BlunderProfile;
  recurringWeaknesses: string[];
}

// ── Study Plan ──────────────────────────────────────────────────────

/** A focus area within the study plan. */
export interface StudyPlanFocus {
  category: LessonCategory;
  difficulty: DifficultyEstimate | null;
  reason: string;
  exerciseCount: number;
}

/** Review focus within the study plan. */
export interface StudyPlanReviewFocus {
  urgentCount: number;
  topCategories: string[];
  reason: string;
}

/** Exercise composition slot. */
export interface ExerciseComposition {
  source: "review" | "weakness" | "new";
  count: number;
  description: string;
}

/** Complete study plan artifact. */
export interface StudyPlan {
  generatedAt: string;
  primaryFocus: StudyPlanFocus;
  secondaryFocus: StudyPlanFocus | null;
  reviewFocus: StudyPlanReviewFocus | null;
  targetDifficultyMix: { easy: number; medium: number; hard: number };
  suggestedSessionSize: number;
  exerciseComposition: ExerciseComposition[];
  rationale: string;
}

// ── Coaching Summary ────────────────────────────────────────────────

/** Type of coaching insight. */
export type InsightType = "strength" | "weakness" | "trend" | "review" | "milestone";

/** A single coaching insight with priority for ordering. */
export interface CoachingInsight {
  type: InsightType;
  message: string;
  priority: number;
}

/** Complete coaching summary artifact. */
export interface CoachingSummary {
  generatedAt: string;
  headline: string;
  insights: CoachingInsight[];
  progressStatement: string;
  nextStepStatement: string;
}
