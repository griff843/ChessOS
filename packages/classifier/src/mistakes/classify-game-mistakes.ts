import type { EvaluatedPosition } from "@chess-os/engine";
import type { FeatureVector } from "../features/types";
import type { MistakeClassification } from "./types";
import { classifySingleMove } from "./classify-mistake";

/**
 * Classify all moves in a game from consecutive evaluated positions.
 *
 * Produces N-1 classifications from N positions.
 * Ply 1 is skipped (no pre-move eval). The last position's move
 * is the final classification — there is no "missing next position" gap.
 */
export function classifyGameMistakes(
  evaluated: EvaluatedPosition[],
  features: FeatureVector[]
): MistakeClassification[] {
  const classifications: MistakeClassification[] = [];

  for (let i = 0; i < evaluated.length - 1; i++) {
    classifications.push(
      classifySingleMove(evaluated[i], evaluated[i + 1], features[i].phase)
    );
  }

  return classifications;
}
