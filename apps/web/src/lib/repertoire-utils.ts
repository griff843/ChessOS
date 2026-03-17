/**
 * Pure helpers for the repertoire product surface.
 * No I/O — deterministic, testable.
 */

// ── Line name lookup ─────────────────────────────────────────────────────────

/**
 * Find the display name for a given lineId by searching repair queue entries
 * first, then drill queue entries. Returns null when the ID is absent or
 * neither queue contains a match.
 */
export function findLineNameForId(
  lineId: string | null | undefined,
  repairEntries: Array<{ lineId: string; lineName: string }>,
  drillEntries: Array<{ lineId: string; lineName: string }>
): string | null {
  if (!lineId) return null;
  return (
    repairEntries.find((e) => e.lineId === lineId)?.lineName ??
    drillEntries.find((e) => e.lineId === lineId)?.lineName ??
    null
  );
}

// ── Grade humanization ───────────────────────────────────────────────────────

const GRADE_LABELS: Record<string, string> = {
  exact_recall: "Exact recall",
  partial_recall: "Partial recall — check the move order",
  failed: "Not recalled — review this line soon",
};

/**
 * Convert a raw drill grade string (e.g. "exact_recall") to a human-readable
 * display string. Falls back to capitalizing the raw value if unknown.
 */
export function formatDrillGrade(grade: string): string {
  return (
    GRADE_LABELS[grade] ??
    grade.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}
