/**
 * Running session progress display (M8A).
 *
 * Shown after each exercise attempt, computed from the
 * accumulated attempts array. Pure function, no I/O.
 */

import type { PuzzleAttempt } from "./types.js";

const TIER_ORDER = [
  "exact",
  "acceptable",
  "inaccuracy",
  "mistake",
  "blunder",
] as const;

/**
 * Compute the current streak from the end of the attempts array.
 *
 * @returns Count and type of consecutive identical results from the end
 */
function computeStreak(
  attempts: PuzzleAttempt[]
): { count: number; type: "correct" | "incorrect" } {
  if (attempts.length === 0) return { count: 0, type: "correct" };

  const lastResult = attempts[attempts.length - 1].isCorrect;
  let count = 0;

  for (let i = attempts.length - 1; i >= 0; i--) {
    if (attempts[i].isCorrect !== lastResult) break;
    count++;
  }

  return { count, type: lastResult ? "correct" : "incorrect" };
}

/**
 * Format running session progress shown after each attempt.
 *
 * @param attempts  All attempts completed so far (including current)
 * @param total     Total exercises in the session
 */
export function formatSessionProgress(
  attempts: PuzzleAttempt[],
  total: number
): string {
  const lines: string[] = [];
  const completed = attempts.length;
  const correct = attempts.filter((a) => a.isCorrect).length;

  lines.push(`  ${"──"} Progress ${"─".repeat(36)}`);

  // Progress bar: 10 chars
  const barWidth = 10;
  const filled = Math.round((completed / total) * barWidth);
  const bar =
    "=".repeat(Math.max(0, filled - 1)) +
    (filled > 0 ? ">" : "") +
    " ".repeat(barWidth - filled);
  const pct = ((correct / completed) * 100).toFixed(1);
  lines.push(
    `  [${bar}] ${completed}/${total}  Accuracy: ${pct}% (${correct}/${completed})`
  );

  // Grade distribution inline
  const dist: Record<string, number> = {};
  for (const a of attempts) {
    const t = a.gradingTier;
    dist[t] = (dist[t] ?? 0) + 1;
  }
  const gradeParts: string[] = [];
  for (const t of TIER_ORDER) {
    if (dist[t]) gradeParts.push(`${t}:${dist[t]}`);
  }
  if (gradeParts.length > 0) {
    lines.push(`  Grades: ${gradeParts.join("  ")}`);
  }

  // Streak
  const streak = computeStreak(attempts);
  if (streak.count > 0) {
    lines.push(`  Streak: ${streak.count} ${streak.type}`);
  }

  lines.push("");
  return lines.join("\n");
}
