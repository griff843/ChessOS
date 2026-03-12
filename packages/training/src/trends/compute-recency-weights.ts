/**
 * Compute recency-weighted adaptive weights from a trend profile.
 *
 * Formula:
 *   weightedMissRate = recentMissRate × 0.7 + lifetimeMissRate × 0.3
 *   adaptiveWeight   = 1.0 + min(weightedMissRate × 1.5, 1.5)
 *
 * Bounded: adaptiveWeight ∈ [1.0, 2.5]
 *
 * When no recent data exists, falls back to lifetime miss rate only:
 *   adaptiveWeight = 1.0 + min(lifetimeMissRate × 1.5, 1.5)
 *
 * Mutates the profile in place.
 */

import type { TrendProfile, TrendBucket } from "./types";
import type { AdaptiveWeights } from "../adaptive/types";

/** Weight given to recent performance vs lifetime. */
const RECENT_WEIGHT = 0.7;
const LIFETIME_WEIGHT = 0.3;

/** Multiplier applied to weightedMissRate before adding to base. */
const MISS_RATE_MULTIPLIER = 1.5;

/** Maximum additional weight above the 1.0 base. */
const MAX_ADDITIONAL_WEIGHT = 1.5;

/**
 * Compute recency-weighted miss rate and adaptive weight for one bucket.
 *
 * Mutates the bucket in place.
 */
function computeBucketRecencyWeight(bucket: TrendBucket): void {
  if (bucket.recentSeen > 0) {
    bucket.recencyWeightedMissRate =
      bucket.recentMissRate * RECENT_WEIGHT +
      bucket.lifetimeMissRate * LIFETIME_WEIGHT;
  } else {
    // No recent data: fall back to lifetime only
    bucket.recencyWeightedMissRate = bucket.lifetimeMissRate;
  }

  bucket.adaptiveWeight =
    1.0 +
    Math.min(bucket.recencyWeightedMissRate * MISS_RATE_MULTIPLIER, MAX_ADDITIONAL_WEIGHT);
}

/**
 * Compute recency-weighted adaptive weights for all buckets.
 *
 * Mutates the profile in place.
 *
 * @param profile  Trend profile with lifetime and recent stats populated
 * @returns The same profile reference with weights computed
 */
export function computeRecencyWeights(profile: TrendProfile): TrendProfile {
  for (const bucket of Object.values(profile.byCategory)) {
    computeBucketRecencyWeight(bucket);
  }
  for (const bucket of Object.values(profile.byDifficulty)) {
    computeBucketRecencyWeight(bucket);
  }
  return profile;
}

/**
 * Extract adaptive weights from a trend profile for use with
 * rankAdaptiveCandidates().
 *
 * @param profile  Trend profile with weights computed
 * @returns AdaptiveWeights compatible with the existing ranking system
 */
export function extractTrendWeights(profile: TrendProfile): AdaptiveWeights {
  const categoryWeights: Record<string, number> = {};
  for (const [key, bucket] of Object.entries(profile.byCategory)) {
    categoryWeights[key] = bucket.adaptiveWeight;
  }

  const difficultyWeights: Record<string, number> = {};
  for (const [key, bucket] of Object.entries(profile.byDifficulty)) {
    difficultyWeights[key] = bucket.adaptiveWeight;
  }

  return { categoryWeights, difficultyWeights, phaseWeights: {} };
}
