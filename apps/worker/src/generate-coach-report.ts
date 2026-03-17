/**
 * Coach report generator (M9A).
 *
 * Reads progress store, session history, and session analytics to
 * produce JSON + markdown coaching artifacts. Read-only: does NOT
 * mutate canonical progress state.
 *
 * Usage:
 *   pnpm --filter worker run generate-coach-report
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
  buildReviewReport,
  buildMistakePatterns,
  buildStudyPlan,
  buildCoachingSummary,
  formatMistakePatternsMd,
  formatStudyPlanMd,
  formatCoachingSummaryMd,
} from "@chess-os/training";
import type {
  ProgressStore,
  SessionHistoryRecord,
  SessionAnalytics,
} from "@chess-os/training";
import {
  getProgressDir,
  getCoachDir,
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
  console.log("[coach] chess-os coach report generator (M9A)");

  const projectRoot = findProjectRoot();

  // 1. Load progress store
  const progressDir = getProgressDir();
  const progressPath = resolve(progressDir, "exercise-progress.json");

  if (!existsSync(progressPath)) {
    console.error(`[coach] progress store not found: ${progressPath}`);
    console.error(
      "[coach] solve at least one session first: pnpm --filter worker run solve-session"
    );
    process.exit(1);
  }

  const rawStore: ProgressStore = JSON.parse(
    readFileSync(progressPath, "utf-8")
  );
  console.log(
    `[coach] loaded progress store: ${rawStore.totalExercises} exercises`
  );

  // 2. Deep-copy and refresh due status (no write-back)
  const store: ProgressStore = JSON.parse(JSON.stringify(rawStore));
  const now = new Date().toISOString();
  refreshDueStatus(store, now);

  // 3. Load session history
  const historyPath = resolve(progressDir, "session-history.jsonl");
  const history = loadSessionHistory(historyPath);
  console.log(`[coach] loaded session history: ${history.length} records`);

  // 4. Build profiles
  const trendProfile = buildTrendProfile(store, history);
  determineTrendDirections(trendProfile);
  computeRecencyWeights(trendProfile);

  const reviewQueue = buildReviewQueue(store, now);
  console.log(`[coach] review queue: ${reviewQueue.totalEntries} entries`);

  // 5. Build session snapshots
  const sessionSnapshots = buildSessionSnapshots(history);

  // 6. Load session analytics (optional — used for dashboard, available for future coach use)
  const _sessionAnalyticsMap = loadSessionAnalyticsMap(projectRoot);

  // 7. Build M8B intermediates needed by coach
  const focusRecs = buildFocusRecommendations(store, trendProfile, reviewQueue);
  const overview = buildLearnerOverview(
    store,
    trendProfile,
    reviewQueue,
    sessionSnapshots,
    focusRecs
  );
  const reviewReport = buildReviewReport(reviewQueue, store);

  // 8. Build M9A artifacts
  const mistakePatterns = buildMistakePatterns(store, trendProfile, reviewQueue);
  console.log(
    `[coach] mistake patterns: ${mistakePatterns.categoryPatterns.length} categories, ${mistakePatterns.recurringWeaknesses.length} recurring weaknesses`
  );

  const studyPlan = buildStudyPlan(focusRecs, reviewReport, trendProfile, store);
  console.log(
    `[coach] study plan: session=${studyPlan.suggestedSessionSize}, primary=${studyPlan.primaryFocus.category}`
  );

  const coachingSummary = buildCoachingSummary(
    overview,
    mistakePatterns,
    studyPlan,
    trendProfile
  );
  console.log(`[coach] headline: ${coachingSummary.headline}`);

  // 9. Write artifacts
  const coachDir = getCoachDir();
  mkdirSync(coachDir, { recursive: true });

  // JSON
  const mistakeJsonPath = resolve(coachDir, "mistake-patterns.json");
  writeFileSync(
    mistakeJsonPath,
    JSON.stringify(mistakePatterns, null, 2),
    "utf-8"
  );
  console.log(`[coach] mistake-patterns.json: ${mistakeJsonPath}`);

  const planJsonPath = resolve(coachDir, "study-plan.json");
  writeFileSync(
    planJsonPath,
    JSON.stringify(studyPlan, null, 2),
    "utf-8"
  );
  console.log(`[coach] study-plan.json: ${planJsonPath}`);

  const summaryJsonPath = resolve(coachDir, "coaching-summary.json");
  writeFileSync(
    summaryJsonPath,
    JSON.stringify(coachingSummary, null, 2),
    "utf-8"
  );
  console.log(`[coach] coaching-summary.json: ${summaryJsonPath}`);

  // Markdown
  const mistakeMdPath = resolve(coachDir, "mistake-patterns.md");
  writeFileSync(
    mistakeMdPath,
    formatMistakePatternsMd(mistakePatterns),
    "utf-8"
  );
  console.log(`[coach] mistake-patterns.md: ${mistakeMdPath}`);

  const planMdPath = resolve(coachDir, "study-plan.md");
  writeFileSync(planMdPath, formatStudyPlanMd(studyPlan), "utf-8");
  console.log(`[coach] study-plan.md: ${planMdPath}`);

  const summaryMdPath = resolve(coachDir, "coaching-summary.md");
  writeFileSync(
    summaryMdPath,
    formatCoachingSummaryMd(coachingSummary),
    "utf-8"
  );
  console.log(`[coach] coaching-summary.md: ${summaryMdPath}`);

  // 10. Console summary
  console.log("");
  console.log(
    `[coach] insights: ${coachingSummary.insights.length} (${coachingSummary.insights.map((i) => i.type).join(", ")})`
  );
  console.log(`[coach] progress: ${coachingSummary.progressStatement}`);
  console.log(`[coach] next step: ${coachingSummary.nextStepStatement}`);
  console.log(`[coach] artifacts: ${coachDir}`);
  console.log("[coach] done");
}

main();
