/**
 * Build a review queue from the progress store.
 *
 * Includes exercises that are:
 *   - overdue:   past their nextReviewAt date
 *   - unstable:  masteryState === "unstable"
 *   - due_soon:  nextReviewAt within 24 hours
 *
 * Entries are sorted by review urgency (descending).
 *
 * When patternIntelligence is provided, the enhanced 6-factor urgency
 * formula is used for scoring (severity, recurrence, mastery gap).
 */

import type { ExerciseProgress, ProgressStore } from "../progress/types.js";
import type { MasteryState } from "./derive-mastery-state.js";
import type { GradingTier } from "../grading/eval-loss-bands.js";
import type { PatternIntelligence, RecurrenceEntry } from "../strategic/types.js";
import {
  computeReviewUrgency,
  type ReviewUrgencyOptions,
} from "../scheduling/compute-review-urgency.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Why an exercise is in the review queue. */
export type QueueReason = "overdue" | "due_soon" | "unstable";

/** A single entry in the review queue. */
export interface ReviewQueueEntry {
  exerciseId: string;
  masteryState: MasteryState;
  reviewUrgency: number;
  lastGradingTier: GradingTier | null;
  rollingQualityScore: number;
  intervalDays: number;
  nextReviewAt: string | null;
  reason: QueueReason;
}

/** The review queue artifact. */
export interface ReviewQueue {
  generatedAt: string;
  totalEntries: number;
  entries: ReviewQueueEntry[];
}

/** Mastery gap values for enhanced urgency scoring. */
const MASTERY_GAP: Record<string, number> = {
  unseen: 0.3,
  learning: 0.8,
  unstable: 1.0,
  improving: 0.2,
  mastered: 0.0,
};

/**
 * Build the review queue from the progress store.
 *
 * @param store               The progress store
 * @param now                 Current timestamp as ISO string
 * @param patternIntelligence Optional pattern intelligence for enhanced scoring
 */
export function buildReviewQueue(
  store: ProgressStore,
  now: string,
  patternIntelligence?: PatternIntelligence
): ReviewQueue {
  const nowMs = new Date(now).getTime();

  // Build recurrence lookup when pattern intelligence is available
  let recurrenceLookup: Map<string, RecurrenceEntry> | undefined;
  if (patternIntelligence) {
    recurrenceLookup = new Map(
      patternIntelligence.recurrenceEntries.map((e) => [e.category, e])
    );
  }

  const entries: ReviewQueueEntry[] = [];

  for (const entry of Object.values(store.exercises)) {
    const reason = getQueueReason(entry, nowMs);
    if (!reason) continue;

    // Build enhanced options if pattern intelligence available
    let options: ReviewUrgencyOptions | undefined;
    if (recurrenceLookup) {
      const rec = recurrenceLookup.get(entry.lessonCategory);
      options = {
        categorySeverity: rec?.severity ?? null,
        categoryRecurrence: rec?.recurrenceScore ?? 0,
        masteryGap: MASTERY_GAP[entry.masteryState ?? "learning"] ?? 0.5,
      };
    }

    // Compute urgency (enhanced when options provided)
    const urgency = computeReviewUrgency(
      entry.nextReviewAt,
      now,
      entry.lastGradingTier,
      entry.timesCorrect,
      entry.timesIncorrect,
      options
    );

    entries.push({
      exerciseId: entry.exerciseId,
      masteryState: entry.masteryState ?? "learning",
      reviewUrgency: urgency,
      lastGradingTier: entry.lastGradingTier ?? null,
      rollingQualityScore: entry.rollingQualityScore ?? 0,
      intervalDays: entry.intervalDays,
      nextReviewAt: entry.nextReviewAt,
      reason,
    });
  }

  // Sort by urgency descending
  entries.sort((a, b) => b.reviewUrgency - a.reviewUrgency);

  return {
    generatedAt: now,
    totalEntries: entries.length,
    entries,
  };
}

/**
 * Determine if an exercise belongs in the review queue, and why.
 */
function getQueueReason(
  entry: ExerciseProgress,
  nowMs: number
): QueueReason | null {
  // Never attempted → not in queue
  if (entry.status === "unseen") return null;

  // Overdue: past nextReviewAt
  if (entry.nextReviewAt) {
    const reviewMs = new Date(entry.nextReviewAt).getTime();
    if (reviewMs <= nowMs) return "overdue";

    // Due soon: within 24 hours
    if (reviewMs - nowMs <= MS_PER_DAY) return "due_soon";
  }

  // Unstable mastery state
  if (entry.masteryState === "unstable") return "unstable";

  return null;
}
