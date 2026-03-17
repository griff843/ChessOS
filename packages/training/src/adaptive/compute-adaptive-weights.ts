/**
 * Compute adaptive weights from a raw weakness profile.
 *
 * Formula per bucket:
 *   missRate       = min(incorrectCount / max(seenCount, 1), 1.0)
 *   accuracy       = correctCount / max(correctCount + incorrectCount, 1)
 *   adaptiveWeight = 1.0 + missRate   // bounded [1.0, 2.0]
 *
 * The weight is intentionally simple and bounded to prevent any single
 * weakness from collapsing session diversity.
 */

import type { WeaknessProfile, PerformanceBucket, AdaptiveWeights } from "./types";

/**
 * Compute derived rates and adaptive weight for a single bucket.
 *
 * Mutates the bucket in place and returns it.
 */
function computeBucketWeight(bucket: PerformanceBucket): PerformanceBucket {
  const attempts = Math.max(bucket.correctCount + bucket.incorrectCount, 1);
  bucket.accuracy = bucket.correctCount / attempts;
  bucket.missRate = Math.min(
    bucket.incorrectCount / Math.max(bucket.seenCount, 1),
    1.0
  );
  bucket.adaptiveWeight = 1.0 + bucket.missRate;
  return bucket;
}

/**
 * Compute adaptive weights for all buckets in the profile.
 *
 * Mutates the profile in place: fills in accuracy, missRate, and
 * adaptiveWeight for every bucket.
 *
 * @param profile  Raw profile from buildWeaknessProfile
 * @returns The same profile reference, now with weights computed
 */
export function computeAdaptiveWeights(
  profile: WeaknessProfile
): WeaknessProfile {
  for (const bucket of Object.values(profile.byCategory)) {
    computeBucketWeight(bucket);
  }
  for (const bucket of Object.values(profile.byDifficulty)) {
    computeBucketWeight(bucket);
  }
  for (const bucket of Object.values(profile.byPhase)) {
    computeBucketWeight(bucket);
  }
  return profile;
}

/**
 * Extract adaptive weights from a computed profile for quick lookup.
 *
 * @param profile  Profile with weights already computed
 * @returns Flat weight maps per axis
 */
export function extractAdaptiveWeights(
  profile: WeaknessProfile
): AdaptiveWeights {
  const categoryWeights: Record<string, number> = {};
  for (const [key, bucket] of Object.entries(profile.byCategory)) {
    categoryWeights[key] = bucket.adaptiveWeight;
  }

  const difficultyWeights: Record<string, number> = {};
  for (const [key, bucket] of Object.entries(profile.byDifficulty)) {
    difficultyWeights[key] = bucket.adaptiveWeight;
  }

  const phaseWeights: Record<string, number> = {};
  for (const [key, bucket] of Object.entries(profile.byPhase)) {
    phaseWeights[key] = bucket.adaptiveWeight;
  }

  return { categoryWeights, difficultyWeights, phaseWeights };
}
