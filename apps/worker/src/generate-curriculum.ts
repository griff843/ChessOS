/**
 * Curriculum planner generator (M9B).
 *
 * Reads progress store and session history to produce JSON + markdown
 * curriculum artifacts. Read-only: does NOT mutate canonical progress state.
 *
 * Usage:
 *   pnpm --filter worker run generate-curriculum
 */

import { resolve, dirname } from "path";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
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
  buildCurriculumPlan,
  formatCurriculumPlanMd,
  formatSessionRoadmapMd,
  formatProgressionGatesMd,
} from "@chess-os/training";
import type {
  ProgressStore,
  SessionHistoryRecord,
} from "@chess-os/training";
import {
  getProgressDir,
  getCurriculumDir,
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

function main(): void {
  console.log("[curriculum] chess-os personalized curriculum planner (M9B)");

  const _projectRoot = findProjectRoot();

  // 1. Load progress store
  const progressDir = getProgressDir();
  const progressPath = resolve(progressDir, "exercise-progress.json");

  if (!existsSync(progressPath)) {
    console.error(`[curriculum] progress store not found: ${progressPath}`);
    console.error(
      "[curriculum] solve at least one session first: pnpm --filter worker run solve-session"
    );
    process.exit(1);
  }

  const rawStore: ProgressStore = JSON.parse(
    readFileSync(progressPath, "utf-8")
  );
  console.log(
    `[curriculum] loaded progress store: ${rawStore.totalExercises} exercises`
  );

  // 2. Deep-copy and refresh due status (no write-back)
  const store: ProgressStore = JSON.parse(JSON.stringify(rawStore));
  const now = new Date().toISOString();
  refreshDueStatus(store, now);

  // 3. Load session history
  const historyPath = resolve(progressDir, "session-history.jsonl");
  const history = loadSessionHistory(historyPath);
  console.log(`[curriculum] loaded session history: ${history.length} records`);

  // 4. Build profiles
  const trendProfile = buildTrendProfile(store, history);
  determineTrendDirections(trendProfile);
  computeRecencyWeights(trendProfile);

  const reviewQueue = buildReviewQueue(store, now);
  console.log(`[curriculum] review queue: ${reviewQueue.totalEntries} entries`);

  // 5. Build session snapshots
  const sessionSnapshots = buildSessionSnapshots(history);

  // 6. Build M8B intermediates
  const focusRecs = buildFocusRecommendations(store, trendProfile, reviewQueue);
  const overview = buildLearnerOverview(
    store,
    trendProfile,
    reviewQueue,
    sessionSnapshots,
    focusRecs
  );
  const reviewReport = buildReviewReport(reviewQueue, store);

  // 7. Build M9A intermediates
  const mistakePatterns = buildMistakePatterns(store, trendProfile, reviewQueue);

  // 8. Build M9B artifact
  const curriculumPlan = buildCurriculumPlan(
    overview,
    mistakePatterns,
    trendProfile,
    reviewQueue,
    store,
    focusRecs
  );
  console.log(
    `[curriculum] plan: ${curriculumPlan.sessionCount} sessions, ${curriculumPlan.themeAssignments.map((a) => a.theme.replace(/_/g, " ")).join(" → ")}`
  );
  console.log(
    `[curriculum] readiness: ${curriculumPlan.progressionGates.overallReadiness ? "READY" : "NOT READY"}`
  );

  // 9. Write artifacts
  const currDir = getCurriculumDir();
  mkdirSync(currDir, { recursive: true });

  // JSON
  const planJsonPath = resolve(currDir, "curriculum-plan.json");
  writeFileSync(
    planJsonPath,
    JSON.stringify(curriculumPlan, null, 2),
    "utf-8"
  );
  console.log(`[curriculum] curriculum-plan.json: ${planJsonPath}`);

  const roadmapJsonPath = resolve(currDir, "session-roadmaps.json");
  writeFileSync(
    roadmapJsonPath,
    JSON.stringify(curriculumPlan.sessions, null, 2),
    "utf-8"
  );
  console.log(`[curriculum] session-roadmaps.json: ${roadmapJsonPath}`);

  const gatesJsonPath = resolve(currDir, "progression-gates.json");
  writeFileSync(
    gatesJsonPath,
    JSON.stringify(curriculumPlan.progressionGates, null, 2),
    "utf-8"
  );
  console.log(`[curriculum] progression-gates.json: ${gatesJsonPath}`);

  // Markdown
  const planMdPath = resolve(currDir, "curriculum-plan.md");
  writeFileSync(planMdPath, formatCurriculumPlanMd(curriculumPlan), "utf-8");
  console.log(`[curriculum] curriculum-plan.md: ${planMdPath}`);

  const roadmapMdPath = resolve(currDir, "session-roadmaps.md");
  writeFileSync(
    roadmapMdPath,
    formatSessionRoadmapMd(curriculumPlan.sessions),
    "utf-8"
  );
  console.log(`[curriculum] session-roadmaps.md: ${roadmapMdPath}`);

  const gatesMdPath = resolve(currDir, "progression-gates.md");
  writeFileSync(
    gatesMdPath,
    formatProgressionGatesMd(curriculumPlan.progressionGates),
    "utf-8"
  );
  console.log(`[curriculum] progression-gates.md: ${gatesMdPath}`);

  // 10. Console summary
  console.log("");
  console.log(
    `[curriculum] gates: ${curriculumPlan.progressionGates.gates.filter((g) => g.allPassed).length}/${curriculumPlan.progressionGates.gates.length} passed`
  );
  console.log(`[curriculum] rationale: ${curriculumPlan.overallRationale}`);
  console.log(`[curriculum] artifacts: ${currDir}`);
  console.log("[curriculum] done");
}

main();
