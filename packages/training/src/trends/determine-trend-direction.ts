/**
 * Determine trend direction for each bucket in a trend profile.
 *
 * Rules:
 *   improving:         recentAccuracy >= lifetimeAccuracy + 0.10
 *   worsening:         recentAccuracy <= lifetimeAccuracy - 0.10
 *   stable:            otherwise
 *   insufficient_data: fewer than MIN_TREND_ATTEMPTS recent attempts
 *
 * Mutates the profile in place.
 */

import type { TrendProfile, TrendBucket, TrendDirection } from "./types";
import { MIN_TREND_ATTEMPTS } from "./types";

/** Threshold for detecting improving/worsening trends. */
const TREND_THRESHOLD = 0.10;

/**
 * Determine trend direction for a single bucket.
 */
function determineBucketTrend(bucket: TrendBucket): TrendDirection {
  if (bucket.recentSeen < MIN_TREND_ATTEMPTS) {
    return "insufficient_data";
  }

  if (bucket.recentAccuracy >= bucket.lifetimeAccuracy + TREND_THRESHOLD) {
    return "improving";
  }

  if (bucket.recentAccuracy <= bucket.lifetimeAccuracy - TREND_THRESHOLD) {
    return "worsening";
  }

  return "stable";
}

/**
 * Compute trend directions for all buckets in the profile.
 *
 * Mutates the profile in place.
 *
 * @param profile  Trend profile with lifetime and recent stats populated
 * @returns The same profile reference with trendDirection set
 */
export function determineTrendDirections(
  profile: TrendProfile
): TrendProfile {
  for (const bucket of Object.values(profile.byCategory)) {
    bucket.trendDirection = determineBucketTrend(bucket);
  }
  for (const bucket of Object.values(profile.byDifficulty)) {
    bucket.trendDirection = determineBucketTrend(bucket);
  }
  return profile;
}
