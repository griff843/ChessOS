/**
 * Learner analytics dashboard generator (M8B).
 *
 * Reads progress store, session history, and session analytics to
 * produce JSON + markdown dashboard artifacts. Read-only: does NOT
 * mutate canonical progress state.
 *
 * Usage:
 *   pnpm --filter worker run generate-dashboard
 */

import { resolve, dirname } from "path";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
} from "fs";
import {
  refreshDueStatus,
  buildTrendProfile,
  computeRecencyWeights,
  determineTrendDirections,
  buildReviewQueue,
  buildSessionSnapshots,
  buildFocusRecommendations,
  buildLearnerOverview,
  buildTrendReport,
  buildReviewReport,
  formatLearnerOverviewMd,
  formatTrendReportMd,
  formatReviewReportMd,
} from "@chess-os/training";
import type {
  ProgressStore,
  SessionHistoryRecord,
  SessionAnalytics,
} from "@chess-os/training";
import {
  getProgressDir,
  getDashboardDir,
} from "@chess-os/db";

function findProjectRoot(): string {
  let dir = process.cwd();
  while (true) {
    const ws = resolve(dir, "pnpm-workspace.yaml");
    try {
      if (existsSync(ws)) return dir;
    } catch {}
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

/**
 * Load session history from JSONL file.
 */
function loadSessionHistory(historyPath: string): SessionHistoryRecord[] {
  if (!existsSync(historyPath)) return [];
  const content = readFileSync(historyPath, "utf-8").trim();
  if (!content) return [];
  return content
    .split("\n")
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l));
}

/**
 * Scan out/results/<sessionId>/session-analytics.json files.
 * Returns a map of sessionId → SessionAnalytics, or null if none found.
 */
function loadSessionAnalyticsMap(
  projectRoot: string
): Record<string, SessionAnalytics> | null {
  const resultsDir = resolve(projectRoot, "out", "results");
  if (!existsSync(resultsDir)) return null;

  const map: Record<string, SessionAnalytics> = {};
  const entries = readdirSync(resultsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const analyticsPath = resolve(
      resultsDir,
      entry.name,
      "session-analytics.json"
    );
    if (!existsSync(analyticsPath)) continue;
    try {
      const analytics: SessionAnalytics = JSON.parse(
        readFileSync(analyticsPath, "utf-8")
      );
      map[analytics.sessionId] = analytics;
    } catch {
      // Skip malformed files
    }
  }

  return Object.keys(map).length > 0 ? map : null;
}

function main(): void {
  console.log("[dashboard] chess-os learner analytics dashboard (M8B)");

  const projectRoot = findProjectRoot();

  // 1. Load progress store
  const progressDir = getProgressDir();
  const progressPath = resolve(progressDir, "exercise-progress.json");

  if (!existsSync(progressPath)) {
    console.error(`[dashboard] progress store not found: ${progressPath}`);
    console.error(
      "[dashboard] solve at least one session first: pnpm --filter worker run solve-session"
    );
    process.exit(1);
  }

  const rawStore: ProgressStore = JSON.parse(
    readFileSync(progressPath, "utf-8")
  );
  console.log(
    `[dashboard] loaded progress store: ${rawStore.totalExercises} exercises`
  );

  // 2. Deep-copy and refresh due status (no write-back)
  const store: ProgressStore = JSON.parse(JSON.stringify(rawStore));
  const now = new Date().toISOString();
  refreshDueStatus(store, now);

  // 3. Load session history
  const historyPath = resolve(progressDir, "session-history.jsonl");
  const history = loadSessionHistory(historyPath);
  console.log(`[dashboard] loaded session history: ${history.length} records`);

  // 4. Build profiles
  const trendProfile = buildTrendProfile(store, history);
  determineTrendDirections(trendProfile);
  computeRecencyWeights(trendProfile);

  const reviewQueue = buildReviewQueue(store, now);
  console.log(`[dashboard] review queue: ${reviewQueue.totalEntries} entries`);

  // 5. Build session snapshots
  const sessionSnapshots = buildSessionSnapshots(history);
  console.log(
    `[dashboard] completed sessions: ${sessionSnapshots.length}`
  );

  // 6. Load session analytics (optional)
  const sessionAnalyticsMap = loadSessionAnalyticsMap(projectRoot);
  if (sessionAnalyticsMap) {
    console.log(
      `[dashboard] session analytics: ${Object.keys(sessionAnalyticsMap).length} files`
    );
  }

  // 7. Build focus recommendations
  const focusRecs = buildFocusRecommendations(store, trendProfile, reviewQueue);

  // 8. Build reports
  const overview = buildLearnerOverview(
    store,
    trendProfile,
    reviewQueue,
    sessionSnapshots,
    focusRecs
  );
  const trendReport = buildTrendReport(
    trendProfile,
    sessionSnapshots,
    sessionAnalyticsMap
  );
  const reviewReport = buildReviewReport(reviewQueue, store);

  // 9. Write artifacts
  const dashDir = getDashboardDir();
  mkdirSync(dashDir, { recursive: true });

  // JSON
  const overviewJsonPath = resolve(dashDir, "learner-overview.json");
  writeFileSync(overviewJsonPath, JSON.stringify(overview, null, 2), "utf-8");
  console.log(`[dashboard] learner-overview.json: ${overviewJsonPath}`);

  const trendJsonPath = resolve(dashDir, "trend-report.json");
  writeFileSync(trendJsonPath, JSON.stringify(trendReport, null, 2), "utf-8");
  console.log(`[dashboard] trend-report.json: ${trendJsonPath}`);

  const reviewJsonPath = resolve(dashDir, "review-report.json");
  writeFileSync(
    reviewJsonPath,
    JSON.stringify(reviewReport, null, 2),
    "utf-8"
  );
  console.log(`[dashboard] review-report.json: ${reviewJsonPath}`);

  // Markdown
  const overviewMdPath = resolve(dashDir, "learner-overview.md");
  writeFileSync(overviewMdPath, formatLearnerOverviewMd(overview), "utf-8");
  console.log(`[dashboard] learner-overview.md: ${overviewMdPath}`);

  const trendMdPath = resolve(dashDir, "trend-report.md");
  writeFileSync(trendMdPath, formatTrendReportMd(trendReport), "utf-8");
  console.log(`[dashboard] trend-report.md: ${trendMdPath}`);

  const reviewMdPath = resolve(dashDir, "review-report.md");
  writeFileSync(reviewMdPath, formatReviewReportMd(reviewReport), "utf-8");
  console.log(`[dashboard] review-report.md: ${reviewMdPath}`);

  // 10. Console summary
  console.log("");
  console.log(
    `[dashboard] overview: ${overview.totalExercises} exercises, ${overview.totalSeen} seen, accuracy=${(overview.lifetimeAccuracy * 100).toFixed(1)}%`
  );
  console.log(
    `[dashboard] mastery: unseen=${overview.masteryDistribution.unseen} learning=${overview.masteryDistribution.learning} unstable=${overview.masteryDistribution.unstable} improving=${overview.masteryDistribution.improving} mastered=${overview.masteryDistribution.mastered}`
  );
  console.log(
    `[dashboard] review load: ${overview.reviewLoad.totalReviewable} items (${overview.reviewLoad.overdueCount} overdue, ${overview.reviewLoad.dueSoonCount} due soon, ${overview.reviewLoad.unstableCount} unstable)`
  );
  console.log(
    `[dashboard] focus: ${overview.focusRecommendations.length} recommendations`
  );
  console.log(`[dashboard] artifacts: ${dashDir}`);
  console.log("[dashboard] done");
}

main();
