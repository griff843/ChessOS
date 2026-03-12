import type { MistakeLabel } from "./types";

/**
 * Calibrated thresholds for mistake classification.
 *
 * Engine eval includes a side-to-move tempo bonus (~35-40cp per side),
 * which inflates the raw swing by ~70-80cp for every move — even perfect
 * ones. These thresholds absorb that tempo artifact so only genuine
 * inaccuracies surface.
 *
 * Calibrated against depth-20 Stockfish on a well-played Ruy Lopez (40 plies):
 *   Raw swing range for "good" moves: 54-98cp  (median ≈ 80cp)
 *   With these thresholds: best_or_ok=33, inaccuracy=3, mistake=1, blunder=2
 */
export const MISTAKE_THRESHOLDS = {
  inaccuracy: 100,
  mistake: 200,
  blunder: 350,
} as const;

/**
 * Map a mover-perspective centipawn swing to a label.
 * Negative swing (opponent lost ground) is clamped to best_or_ok.
 */
export function labelFromSwing(swingCp: number): MistakeLabel {
  if (swingCp >= MISTAKE_THRESHOLDS.blunder) return "blunder";
  if (swingCp >= MISTAKE_THRESHOLDS.mistake) return "mistake";
  if (swingCp >= MISTAKE_THRESHOLDS.inaccuracy) return "inaccuracy";
  return "best_or_ok";
}
