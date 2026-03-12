/**
 * Simple deterministic spaced repetition scheduler.
 *
 * Interval progression on correct answers:
 *   1 → 3 → 7 → 14 → 30 (days)
 *
 * On incorrect answer:
 *   Reset interval to 1 day.
 *
 * nextReviewAt = current timestamp + intervalDays.
 *
 * This is intentionally simple. A full SM-2 or FSRS algorithm
 * can be added later if needed.
 */

/** The progression of review intervals in days. */
const INTERVAL_PROGRESSION = [1, 3, 7, 14, 30];

/**
 * Compute the next review interval based on the current interval
 * and whether the last attempt was correct.
 *
 * @param currentInterval  Current interval in days (0 if never reviewed)
 * @param wasCorrect       Whether the last attempt was correct
 * @returns The new interval in days
 */
export function computeNextInterval(
  currentInterval: number,
  wasCorrect: boolean
): number {
  if (!wasCorrect) {
    return INTERVAL_PROGRESSION[0]; // Reset to 1 day
  }

  // Find current position in progression and advance
  const currentIndex = INTERVAL_PROGRESSION.indexOf(currentInterval);

  if (currentIndex === -1) {
    // Not in standard progression — find closest step above
    const nextStep = INTERVAL_PROGRESSION.find((d) => d > currentInterval);
    return nextStep ?? INTERVAL_PROGRESSION[INTERVAL_PROGRESSION.length - 1];
  }

  // Advance to next step, cap at max
  const nextIndex = Math.min(
    currentIndex + 1,
    INTERVAL_PROGRESSION.length - 1
  );
  return INTERVAL_PROGRESSION[nextIndex];
}

/**
 * Compute the next review date as an ISO string.
 *
 * @param fromDate      The date to compute from (ISO string)
 * @param intervalDays  The interval in days
 * @returns ISO 8601 date string for the next review
 */
export function computeNextReviewAt(
  fromDate: string,
  intervalDays: number
): string {
  const date = new Date(fromDate);
  date.setDate(date.getDate() + intervalDays);
  return date.toISOString();
}
