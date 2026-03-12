/**
 * Build the review report dashboard artifact.
 *
 * Pure function: groups review queue entries by reason and enriches
 * with exercise metadata from the progress store.
 */

import type { ProgressStore } from "../progress/types.js";
import type { ReviewQueue } from "../mastery/build-review-queue.js";
import type { LessonCategory, DifficultyEstimate } from "../exercises/types.js";
import type {
  ReviewReport,
  ReviewReportEntry,
  CategoryUrgency,
} from "./types.js";

/**
 * Build the review report from review queue and progress store.
 */
export function buildReviewReport(
  reviewQueue: ReviewQueue,
  store: ProgressStore
): ReviewReport {
  const now = new Date().toISOString();

  // Enrich queue entries with exercise metadata
  const enriched: ReviewReportEntry[] = reviewQueue.entries
    .map((entry) => {
      const exercise = store.exercises[entry.exerciseId];
      if (!exercise) return null;
      return {
        exerciseId: entry.exerciseId,
        masteryState: entry.masteryState,
        reviewUrgency: entry.reviewUrgency,
        lastGradingTier: entry.lastGradingTier,
        rollingQualityScore: entry.rollingQualityScore,
        intervalDays: entry.intervalDays,
        nextReviewAt: entry.nextReviewAt,
        reason: entry.reason,
        lessonCategory: exercise.lessonCategory,
        difficultyEstimate: exercise.difficultyEstimate,
      };
    })
    .filter((e): e is ReviewReportEntry => e !== null);

  // Group by reason
  const urgentItems = enriched
    .filter((e) => e.reason === "overdue")
    .sort((a, b) => b.reviewUrgency - a.reviewUrgency);

  const dueSoonItems = enriched
    .filter((e) => e.reason === "due_soon")
    .sort((a, b) => b.reviewUrgency - a.reviewUrgency);

  const unstableItems = enriched
    .filter((e) => e.masteryState === "unstable")
    .sort((a, b) => b.reviewUrgency - a.reviewUrgency);

  // Blunder-prone: last grading tier was blunder or mistake
  const blunderProneItems = enriched
    .filter(
      (e) =>
        e.lastGradingTier === "blunder" || e.lastGradingTier === "mistake"
    )
    .sort((a, b) => b.reviewUrgency - a.reviewUrgency);

  // Per-category urgency
  const catMap = new Map<
    string,
    { total: number; urgencySum: number; overdueCount: number }
  >();
  for (const entry of enriched) {
    const cat = entry.lessonCategory;
    let bucket = catMap.get(cat);
    if (!bucket) {
      bucket = { total: 0, urgencySum: 0, overdueCount: 0 };
      catMap.set(cat, bucket);
    }
    bucket.total++;
    bucket.urgencySum += entry.reviewUrgency;
    if (entry.reason === "overdue") bucket.overdueCount++;
  }

  const categoryUrgency: CategoryUrgency[] = [];
  for (const [category, bucket] of catMap) {
    categoryUrgency.push({
      category,
      totalReviewable: bucket.total,
      avgUrgency: bucket.total > 0 ? bucket.urgencySum / bucket.total : 0,
      overdueCount: bucket.overdueCount,
    });
  }
  categoryUrgency.sort((a, b) => b.avgUrgency - a.avgUrgency);

  return {
    generatedAt: now,
    totalOverdue: urgentItems.length,
    totalDueSoon: dueSoonItems.length,
    totalUnstable: unstableItems.length,
    urgentItems,
    dueSoonItems,
    unstableItems,
    blunderProneItems,
    categoryUrgency,
  };
}
