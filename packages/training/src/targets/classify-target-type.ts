/**
 * Classify a position into a training target type.
 *
 * Taxonomy:
 *   blunder        — actualLabel === "blunder"
 *   mistake        — actualLabel === "mistake"
 *   inaccuracy     — actualLabel === "inaccuracy"
 *   critical_test  — actualLabel === "best_or_ok" with high predicted risk
 */

import type { MistakeLabel } from "@chess-os/classifier";
import type { TrainingTargetType } from "./types";

/** Minimum predicted risk for a best_or_ok position to qualify as critical_test. */
const CRITICAL_TEST_RISK_THRESHOLD = 0.4;

/**
 * Classify a position's target type. Returns null if the position
 * does not qualify as a training target.
 */
export function classifyTargetType(
  actualLabel: MistakeLabel,
  predictedRisk: number
): TrainingTargetType | null {
  switch (actualLabel) {
    case "blunder":
      return "blunder";
    case "mistake":
      return "mistake";
    case "inaccuracy":
      return "inaccuracy";
    case "best_or_ok":
      return predictedRisk >= CRITICAL_TEST_RISK_THRESHOLD
        ? "critical_test"
        : null;
    default:
      return null;
  }
}
