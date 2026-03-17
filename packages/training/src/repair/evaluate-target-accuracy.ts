/**
 * Evaluate a learner's session performance on exercises relevant to a
 * repair target.
 *
 * Uses REPAIR_TARGET_TO_LESSON_CATEGORIES to filter session exercises
 * to those matching the target's lesson categories, then summarises
 * correctness into a bounded SessionPerformanceBand.
 *
 * Pure function — no I/O, deterministic, never overclaims.
 */

import type { LessonCategory } from "../exercises/types.js";
import type {
  RepairTarget,
  SessionPerformanceBand,
  TargetAccuracySummary,
} from "./types.js";
import { REPAIR_TARGET_TO_LESSON_CATEGORIES } from "./repair-target-matching.js";

// ── Constants ────────────────────────────────────────────────────────

/** Minimum matched exercises needed to report a meaningful band. */
const MIN_MATCH_THRESHOLD = 2;

/** Accuracy rate at or above which performance is classified as strong. */
const STRONG_THRESHOLD = 0.7;

/** Accuracy rate at or above which performance is classified as mixed (below → weak). */
const MIXED_THRESHOLD = 0.4;

// ── Exercise Outcome ─────────────────────────────────────────────────

/**
 * Minimal per-exercise data needed to evaluate target accuracy.
 * Derived by joining StudySession.exercises with SessionResults.results.
 */
export interface ExerciseOutcome {
  lessonCategory: LessonCategory;
  result: "correct" | "incorrect";
}

// ── Target label map (for human-readable output) ─────────────────────

const TARGET_LABELS: Record<RepairTarget, string> = {
  opening_line_recall: "opening line recall",
  opening_concept_understanding: "opening concept understanding",
  calculation_discipline: "calculation discipline",
  tactical_pattern_recognition: "tactical pattern recognition",
  candidate_move_generation: "candidate move generation",
  strategic_planning: "strategic planning",
  time_management: "time management",
  endgame_technique: "endgame technique",
  practical_stabilization: "practical stabilization",
};

// ── Main Function ────────────────────────────────────────────────────

/**
 * Evaluate how well the learner performed on exercises relevant to a
 * repair target within a single session.
 *
 * @param target - The repair target to evaluate performance for.
 * @param sessionId - The session ID (for traceability in the output).
 * @param outcomes - Per-exercise lessonCategory + result pairs.
 * @returns A bounded TargetAccuracySummary with performance band.
 */
export function evaluateTargetAccuracy(
  target: RepairTarget,
  sessionId: string,
  outcomes: ExerciseOutcome[]
): TargetAccuracySummary {
  const targetCategories = REPAIR_TARGET_TO_LESSON_CATEGORIES[target];
  const label = TARGET_LABELS[target];

  const matched = outcomes.filter((o) =>
    targetCategories.includes(o.lessonCategory)
  );
  const matchedCount = matched.length;
  const totalCount = outcomes.length;

  // Insufficient data — cannot form a meaningful judgment
  if (matchedCount < MIN_MATCH_THRESHOLD) {
    const shortfall =
      matchedCount === 0
        ? `No exercises matched ${label}.`
        : `Only ${matchedCount} exercise matched — not enough to judge performance on ${label}.`;
    return {
      sessionId,
      target,
      matchedExerciseCount: matchedCount,
      totalExerciseCount: totalCount,
      correctCount: 0,
      accuracyRate: null,
      performanceBand: "insufficient_data",
      explanation: shortfall,
    };
  }

  const correctCount = matched.filter((o) => o.result === "correct").length;
  const rate = correctCount / matchedCount;
  const band: SessionPerformanceBand =
    rate >= STRONG_THRESHOLD
      ? "strong"
      : rate >= MIXED_THRESHOLD
        ? "mixed"
        : "weak";

  return {
    sessionId,
    target,
    matchedExerciseCount: matchedCount,
    totalExerciseCount: totalCount,
    correctCount,
    accuracyRate: rate,
    performanceBand: band,
    explanation: `${correctCount} of ${matchedCount} relevant exercises correct (${Math.round(rate * 100)}%).`,
  };
}

// ── Aggregate over multiple sessions ────────────────────────────────

/**
 * From a list of per-session accuracy summaries, return the one
 * with the most matched exercises. If there is a tie, return the
 * most recent (last in the sorted list, since callers should pass
 * them in chronological order).
 *
 * Returns null when the list is empty or all are insufficient_data.
 */
export function pickMostInformativeAccuracy(
  summaries: TargetAccuracySummary[]
): TargetAccuracySummary | null {
  const informative = summaries.filter(
    (s) => s.performanceBand !== "insufficient_data"
  );
  if (informative.length === 0) return null;
  return informative.reduce((best, current) =>
    current.matchedExerciseCount >= best.matchedExerciseCount ? current : best
  );
}
