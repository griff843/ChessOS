/**
 * Build session snapshots from session history records.
 *
 * Pure function: transforms completed SessionHistoryRecords into
 * chronologically-ordered SessionSnapshots.
 */

import type { SessionHistoryRecord } from "../progress/types.js";
import type { SessionSnapshot } from "./types.js";

/**
 * Extract session snapshots from completed session history records.
 *
 * Filters to completion records only (completedAt !== null, results !== null).
 * Returns snapshots sorted by completedAt ascending (chronological).
 */
export function buildSessionSnapshots(
  history: SessionHistoryRecord[]
): SessionSnapshot[] {
  const completed = history.filter(
    (h) => h.completedAt !== null && h.results !== null && h.results.length > 0
  );

  completed.sort((a, b) =>
    (a.completedAt ?? "").localeCompare(b.completedAt ?? "")
  );

  return completed.map((h) => {
    const results = h.results!;
    const correctCount = results.filter((r) => r.result === "correct").length;
    const incorrectCount = results.length - correctCount;
    return {
      sessionId: h.sessionId,
      completedAt: h.completedAt!,
      exerciseCount: results.length,
      correctCount,
      incorrectCount,
      accuracy: results.length > 0 ? correctCount / results.length : 0,
      difficultyDistribution: { ...h.difficultyDistribution },
      categoryDistribution: { ...h.categoryDistribution },
    };
  });
}
