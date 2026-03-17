/**
 * Derive a deterministic mastery state from exercise progress fields.
 *
 * States form a progression: unseen → learning → unstable|improving → mastered.
 * The derivation is pure and stateless — computed from current fields only.
 */

/**
 * Mastery state of an exercise.
 *
 * - unseen:    never attempted
 * - learning:  fewer than 3 attempts (insufficient data)
 * - unstable:  poor accuracy or quality (needs review)
 * - improving:  decent accuracy and quality (progressing)
 * - mastered:  high accuracy, high quality, long interval
 */
export type MasteryState =
  | "unseen"
  | "learning"
  | "unstable"
  | "improving"
  | "mastered";

/**
 * Derive the mastery state from exercise progress fields.
 *
 * @param totalAttempts       Total number of attempts (timesCorrect + timesIncorrect)
 * @param timesCorrect        Number of correct (exact) answers
 * @param timesIncorrect      Number of incorrect answers
 * @param rollingQualityScore EMA quality score [0, 1]
 * @param intervalDays        Current review interval in days
 */
export function deriveMasteryState(
  totalAttempts: number,
  timesCorrect: number,
  timesIncorrect: number,
  rollingQualityScore: number,
  intervalDays: number
): MasteryState {
  if (totalAttempts === 0) return "unseen";
  if (totalAttempts < 3) return "learning";

  const accuracy = timesCorrect / (timesCorrect + timesIncorrect);

  // Mastered: high accuracy, decent quality, long interval
  if (totalAttempts >= 5 && accuracy >= 0.8 && intervalDays >= 14) {
    return "mastered";
  }

  // Unstable: poor accuracy or very low quality
  if (accuracy < 0.5 || rollingQualityScore < 0.3) {
    return "unstable";
  }

  // Improving: decent accuracy and quality
  if (accuracy >= 0.5 && rollingQualityScore >= 0.5) {
    return "improving";
  }

  // Gap between thresholds (quality 0.3–0.5) → still learning
  return "learning";
}
