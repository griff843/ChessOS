/**
 * Rank positions within a game by criticality score (descending).
 * Returns the top N most critical positions with rank assignments.
 */

import type { CriticalPosition } from "./types";

const DEFAULT_TOP_N = 5;

/**
 * Sort positions by criticality (descending) and assign ranks.
 * Returns the top N positions.
 */
export function rankCriticalPositions(
  positions: CriticalPosition[],
  topN: number = DEFAULT_TOP_N
): CriticalPosition[] {
  const sorted = [...positions].sort(
    (a, b) => b.criticalityScore - a.criticalityScore
  );

  // Assign ranks (1-indexed)
  for (let i = 0; i < sorted.length; i++) {
    sorted[i] = { ...sorted[i], rank: i + 1 };
  }

  return sorted.slice(0, topN);
}
