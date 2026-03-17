/**
 * Build a rationale explaining the exercise type mix in a session.
 */

import type {
  ExerciseType,
  ExerciseTypeMix,
  CognitiveSessionExercise,
  MixRationale,
} from "./types";

/**
 * Build a MixRationale explaining the exercise type composition.
 *
 * @param requested         The requested mix
 * @param actual            The actual cognitive exercises produced
 * @param degradationNotes  Notes about any degradation that occurred
 * @returns MixRationale transparency artifact
 */
export function buildMixRationale(
  requested: ExerciseTypeMix,
  actual: CognitiveSessionExercise[],
  degradationNotes: string[]
): MixRationale {
  // Count actual mix
  const actualMix: Record<ExerciseType, number> = {
    tactical: 0,
    recall: 0,
    visualization: 0,
    reconstruction: 0,
  };

  for (const ex of actual) {
    actualMix[ex.exerciseType]++;
  }

  // Build explanations
  const typeExplanations: MixRationale["typeExplanations"] = [];
  const types: ExerciseType[] = ["tactical", "recall", "visualization", "reconstruction"];

  for (const t of types) {
    const requestedCount = requested[t];
    const actualCount = actualMix[t];

    let reason: string;
    if (actualCount === requestedCount) {
      reason = `${requestedCount} requested, ${actualCount} filled`;
    } else if (actualCount > requestedCount) {
      reason = `${requestedCount} requested, ${actualCount} filled (degradation fill from other types)`;
    } else {
      reason = `${requestedCount} requested, ${actualCount} filled (insufficient candidates)`;
    }

    typeExplanations.push({ exerciseType: t, count: actualCount, reason });
  }

  return {
    requestedMix: requested,
    actualMix,
    degradationNotes,
    typeExplanations,
  };
}
