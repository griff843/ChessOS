/**
 * Eval loss bands for tiered move quality grading.
 *
 * Separate from classifier MISTAKE_THRESHOLDS because:
 *   1. These grade user attempts, not original game moves
 *   2. No side-to-move tempo artifact (eval loss is direct difference)
 *   3. Tighter bands (50/150/300 vs 100/200/350)
 */

/**
 * Six-tier move quality grading.
 *
 * - exact:      user played the engine's best move
 * - acceptable:  eval loss < 50cp
 * - inaccuracy:  eval loss 50–149cp
 * - mistake:     eval loss 150–299cp
 * - blunder:     eval loss ≥ 300cp
 * - illegal:     move failed validation (pre-grading)
 */
export type GradingTier =
  | "exact"
  | "acceptable"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "illegal";

/** Centipawn thresholds for grading tiers. */
export const EVAL_LOSS_BANDS = {
  /** < 50cp: acceptable */
  acceptable: 50,
  /** 50–149cp: inaccuracy */
  inaccuracy: 150,
  /** 150–299cp: mistake; ≥ 300cp: blunder */
  mistake: 300,
} as const;

/** Default tier when eval loss is unknown (no engine data). */
export const DEFAULT_UNKNOWN_TIER: GradingTier = "inaccuracy";

/**
 * Map a centipawn loss value to a grading tier.
 *
 * @param evalLossCp  Non-negative centipawn loss from mover's perspective
 */
export function tierFromEvalLoss(evalLossCp: number): GradingTier {
  if (evalLossCp === 0) return "exact";
  if (evalLossCp < EVAL_LOSS_BANDS.acceptable) return "acceptable";
  if (evalLossCp < EVAL_LOSS_BANDS.inaccuracy) return "inaccuracy";
  if (evalLossCp < EVAL_LOSS_BANDS.mistake) return "mistake";
  return "blunder";
}
