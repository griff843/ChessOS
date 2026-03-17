/**
 * Build the trend report dashboard artifact.
 *
 * Pure function: transforms TrendProfile into a structured report
 * with category/difficulty trends, session timeline, and eval loss trends.
 */

import type { TrendProfile } from "../trends/types.js";
import type { SessionAnalytics } from "../analytics/build-session-analytics.js";
import type {
  TrendReport,
  TrendEntry,
  EvalLossTrendEntry,
  SessionTimelineEntry,
  SessionSnapshot,
} from "./types.js";

const DIFFICULTY_ORDER = ["easy", "medium", "hard"];

/**
 * Build the trend report from trend profile, session snapshots,
 * and optionally session analytics for eval loss trends.
 */
export function buildTrendReport(
  trendProfile: TrendProfile,
  sessionSnapshots: SessionSnapshot[],
  sessionAnalyticsMap: Record<string, SessionAnalytics> | null
): TrendReport {
  const now = new Date().toISOString();

  // Category trends, sorted by adaptive weight descending
  const categoryTrends: TrendEntry[] = Object.entries(trendProfile.byCategory)
    .map(([key, b]) => ({
      key,
      lifetimeAccuracy: b.lifetimeAccuracy,
      recentAccuracy: b.recentSeen > 0 ? b.recentAccuracy : null,
      trendDirection: b.trendDirection,
      lifetimeSeen: b.lifetimeSeen,
      recentSeen: b.recentSeen,
      adaptiveWeight: b.adaptiveWeight,
      dueCount: b.dueCount,
    }))
    .sort((a, b) => b.adaptiveWeight - a.adaptiveWeight);

  // Difficulty trends in fixed order
  const difficultyTrends: TrendEntry[] = DIFFICULTY_ORDER
    .filter((key) => trendProfile.byDifficulty[key] !== undefined)
    .map((key) => {
      const b = trendProfile.byDifficulty[key];
      return {
        key,
        lifetimeAccuracy: b.lifetimeAccuracy,
        recentAccuracy: b.recentSeen > 0 ? b.recentAccuracy : null,
        trendDirection: b.trendDirection,
        lifetimeSeen: b.lifetimeSeen,
        recentSeen: b.recentSeen,
        adaptiveWeight: b.adaptiveWeight,
        dueCount: b.dueCount,
      };
    });

  // Session timeline from snapshots (already chronological)
  const sessionTimeline: SessionTimelineEntry[] = sessionSnapshots.map((ss) => ({
    sessionId: ss.sessionId,
    completedAt: ss.completedAt,
    accuracy: ss.accuracy,
    exerciseCount: ss.exerciseCount,
    correctCount: ss.correctCount,
  }));

  // Eval loss trend from session analytics (optional)
  let evalLossTrend: EvalLossTrendEntry[] | null = null;
  if (sessionAnalyticsMap && Object.keys(sessionAnalyticsMap).length > 0) {
    // Match analytics to completed sessions in chronological order
    const entries: EvalLossTrendEntry[] = [];
    for (const ss of sessionSnapshots) {
      const analytics = sessionAnalyticsMap[ss.sessionId];
      if (analytics && analytics.evalLossStats.count > 0) {
        entries.push({
          sessionId: ss.sessionId,
          completedAt: ss.completedAt,
          avgEvalLossCp: analytics.evalLossStats.average,
          medianEvalLossCp: analytics.evalLossStats.median,
        });
      }
    }
    if (entries.length > 0) {
      evalLossTrend = entries;
    }
  }

  return {
    generatedAt: now,
    recentWindowSize: trendProfile.recentWindowSize,
    overallAccuracy: trendProfile.overallAccuracy,
    categoryTrends,
    difficultyTrends,
    evalLossTrend,
    sessionTimeline,
  };
}
