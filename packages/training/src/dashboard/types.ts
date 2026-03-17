/**
 * Types for M8B learner analytics dashboard.
 *
 * All report types are read-only snapshots — no mutation to canonical state.
 */

import type { LessonCategory, DifficultyEstimate } from "../exercises/types.js";
import type { MasteryState } from "../mastery/derive-mastery-state.js";
import type { GradingTier } from "../grading/eval-loss-bands.js";
import type { QueueReason } from "../mastery/build-review-queue.js";
import type { TrendDirection } from "../trends/types.js";

// ── Session Snapshot ────────────────────────────────────────────────

/** Aggregated stats from a single completed session. */
export interface SessionSnapshot {
  sessionId: string;
  completedAt: string;
  exerciseCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  difficultyDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
}

// ── Learner Overview ────────────────────────────────────────────────

/** A weakness highlight entry for the overview. */
export interface WeaknessHighlight {
  key: string;
  accuracy: number;
  missRate: number;
  dueCount: number;
  trendDirection: TrendDirection | null;
}

/** Review load summary. */
export interface ReviewLoad {
  overdueCount: number;
  dueSoonCount: number;
  unstableCount: number;
  totalReviewable: number;
}

/** Trend summary grouping categories by direction. */
export interface TrendSummary {
  improvingCategories: string[];
  worseningCategories: string[];
  stableCategories: string[];
  insufficientDataCategories: string[];
}

/** Top-level learner dashboard artifact. */
export interface LearnerOverview {
  generatedAt: string;

  // Progress summary
  totalExercises: number;
  totalSeen: number;
  totalUnseen: number;
  totalCorrect: number;
  totalIncorrect: number;
  lifetimeAccuracy: number;

  // Recent accuracy
  recentSessionCount: number;
  recentAccuracy: number | null;

  // Mastery distribution
  masteryDistribution: Record<MasteryState, number>;

  // Review load
  reviewLoad: ReviewLoad;

  // Weakness highlights (top 3 each)
  topWeakCategories: WeaknessHighlight[];
  topWeakDifficulties: WeaknessHighlight[];

  // Trend summary
  trendSummary: TrendSummary;

  // Recent sessions (last N)
  recentSessions: SessionSnapshot[];

  // Focus recommendations
  focusRecommendations: FocusRecommendation[];
}

// ── Trend Report ────────────────────────────────────────────────────

/** A single trend entry for a category or difficulty bucket. */
export interface TrendEntry {
  key: string;
  lifetimeAccuracy: number;
  recentAccuracy: number | null;
  trendDirection: TrendDirection;
  lifetimeSeen: number;
  recentSeen: number;
  adaptiveWeight: number;
  dueCount: number;
}

/** Eval loss trend entry from session analytics. */
export interface EvalLossTrendEntry {
  sessionId: string;
  completedAt: string;
  avgEvalLossCp: number | null;
  medianEvalLossCp: number | null;
}

/** Session timeline entry for accuracy-over-time. */
export interface SessionTimelineEntry {
  sessionId: string;
  completedAt: string;
  accuracy: number;
  exerciseCount: number;
  correctCount: number;
}

/** Detailed trend report artifact. */
export interface TrendReport {
  generatedAt: string;
  recentWindowSize: number;
  overallAccuracy: number;
  categoryTrends: TrendEntry[];
  difficultyTrends: TrendEntry[];
  evalLossTrend: EvalLossTrendEntry[] | null;
  sessionTimeline: SessionTimelineEntry[];
}

// ── Review Report ───────────────────────────────────────────────────

/** A review report entry enriched with exercise metadata. */
export interface ReviewReportEntry {
  exerciseId: string;
  masteryState: MasteryState;
  reviewUrgency: number;
  lastGradingTier: GradingTier | null;
  rollingQualityScore: number;
  intervalDays: number;
  nextReviewAt: string | null;
  reason: QueueReason;
  lessonCategory: LessonCategory;
  difficultyEstimate: DifficultyEstimate;
}

/** Per-category review urgency summary. */
export interface CategoryUrgency {
  category: string;
  totalReviewable: number;
  avgUrgency: number;
  overdueCount: number;
}

/** Review-focused report artifact. */
export interface ReviewReport {
  generatedAt: string;
  totalOverdue: number;
  totalDueSoon: number;
  totalUnstable: number;
  urgentItems: ReviewReportEntry[];
  dueSoonItems: ReviewReportEntry[];
  unstableItems: ReviewReportEntry[];
  blunderProneItems: ReviewReportEntry[];
  categoryUrgency: CategoryUrgency[];
}

// ── Focus Recommendations ───────────────────────────────────────────

/** Factors contributing to a focus recommendation score. */
export interface FocusFactors {
  weaknessWeight: number;
  trendPenalty: number;
  reviewPressure: number;
  masteryGap: number;
}

/** A single deterministic next-study recommendation. */
export interface FocusRecommendation {
  rank: number;
  category: LessonCategory;
  difficulty: DifficultyEstimate | null;
  reason: string;
  focusScore: number;
  factors: FocusFactors;
}

/** Configuration for focus recommendations. */
export const FOCUS_CONFIG = {
  maxRecommendations: 5,
  weights: {
    weakness: 0.35,
    trend: 0.25,
    review: 0.20,
    masteryGap: 0.20,
  },
  trendPenalties: {
    worsening: 0.30,
    stable: 0.10,
    improving: 0.00,
    insufficient_data: 0.15,
  },
} as const;
