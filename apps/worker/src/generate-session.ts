import { resolve, dirname } from "path";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  appendFileSync,
} from "fs";
import {
  buildStudySession,
  computeDifficultyCalibration,
  formatSessionMd,
  DEFAULT_SESSION_CONFIG,
  initProgressStore,
  mergeProgressStore,
  serializeProgressStore,
  markExercisesSeen,
  refreshDueStatus,
  getProgressSummary,
  createSessionHistoryRecord,
  prioritizeByProgress,
  rankAdaptiveCandidates,
  buildTrendProfile,
  computeRecencyWeights,
  extractTrendWeights,
  determineTrendDirections,
  computeDifficultyPolicy,
  formatTrendSummaryMd,
} from "@chess-os/training";
import type {
  TrainingExercise,
  SessionConfig,
  ProgressStore,
  DifficultyCalibration,
  TrendProfile,
  DifficultyPolicy,
  SessionHistoryRecord,
} from "@chess-os/training";
import {
  getModelsOutputDir,
  getSessionOutputDir,
  getProgressDir,
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
  const adaptiveEnabled =
    (process.env.ADAPTIVE ?? "true").toLowerCase() !== "false";
  const tag = adaptiveEnabled ? "M6D-adaptive" : "M6D";
  console.log(`[session] chess-os study session generator (${tag})`);

  const projectRoot = findProjectRoot();

  // 1. Load exercise corpus from aggregated JSONL
  const exercisesPath = resolve(
    projectRoot,
    "out",
    "datasets",
    "training-exercises.jsonl"
  );
  if (!existsSync(exercisesPath)) {
    console.error(`[session] exercise corpus not found: ${exercisesPath}`);
    console.error(
      "[session] run exercises first: pnpm --filter worker run generate-exercises"
    );
    process.exit(1);
  }

  const lines = readFileSync(exercisesPath, "utf-8")
    .trim()
    .split("\n")
    .filter((l) => l.length > 0);

  const exercises: TrainingExercise[] = lines.map((l) => JSON.parse(l));
  console.log(`[session] loaded ${exercises.length} exercises`);

  // 2. Compute difficulty calibration
  const scores = exercises.map((ex) => ex.explanation.difficultyScore);
  const calibration: DifficultyCalibration =
    computeDifficultyCalibration(scores);

  console.log(
    `[session] difficulty calibration: easy<=${calibration.easyUpperBound.toFixed(4)} hard>${calibration.hardLowerBound.toFixed(4)}`
  );
  console.log(
    `[session]   rebalanced: easy=${calibration.distribution.easy} medium=${calibration.distribution.medium} hard=${calibration.distribution.hard}`
  );

  // 3. Write calibration artifact
  const modelsDir = getModelsOutputDir();
  mkdirSync(modelsDir, { recursive: true });
  const calibrationPath = resolve(modelsDir, "difficulty-calibration.json");
  writeFileSync(
    calibrationPath,
    JSON.stringify(calibration, null, 2),
    "utf-8"
  );

  // 4. Load or initialize progress store
  const progressDir = getProgressDir();
  mkdirSync(progressDir, { recursive: true });
  const progressPath = resolve(progressDir, "exercise-progress.json");

  let store: ProgressStore;
  if (existsSync(progressPath)) {
    const existing: ProgressStore = JSON.parse(
      readFileSync(progressPath, "utf-8")
    );
    store = mergeProgressStore(existing, exercises, calibration);
    console.log(
      `[session] loaded progress store (${Object.keys(store.exercises).length} exercises)`
    );
  } else {
    store = initProgressStore(exercises, calibration);
    console.log(
      `[session] initialized progress store (${store.totalExercises} exercises)`
    );
  }

  // 5. Refresh due status
  const now = new Date().toISOString();
  refreshDueStatus(store, now);

  const summary = getProgressSummary(store);
  console.log(
    `[session] progress: unseen=${summary.unseen} seen=${summary.seen} correct=${summary.correct} incorrect=${summary.incorrect} due=${summary.due_for_review}`
  );

  // 6. Build trend profile, compute weights and policy
  const historyPath = resolve(progressDir, "session-history.jsonl");
  let trendProfile: TrendProfile | null = null;
  let policy: DifficultyPolicy | null = null;

  // Parse config from env early (needed for policy)
  const sessionSize = parseInt(process.env.SESSION_SIZE ?? "10", 10);
  const sessionCount = parseInt(process.env.SESSION_COUNT ?? "1", 10);

  if (adaptiveEnabled) {
    const history = loadSessionHistory(historyPath);
    trendProfile = buildTrendProfile(store, history);
    determineTrendDirections(trendProfile);
    computeRecencyWeights(trendProfile);

    // Compute difficulty policy
    policy = computeDifficultyPolicy(trendProfile, sessionSize);

    // Print trend profile summary
    console.log("[session] ── adaptive mode (M6D trend-aware) ──");

    const catEntries = Object.entries(trendProfile.byCategory)
      .filter(([, b]) => b.lifetimeSeen > 0)
      .sort(([, a], [, b]) => b.adaptiveWeight - a.adaptiveWeight);

    if (catEntries.length > 0) {
      console.log("[session]   category trends:");
      for (const [cat, bucket] of catEntries) {
        const recentAcc =
          bucket.recentSeen > 0
            ? `${(bucket.recentAccuracy * 100).toFixed(0)}%`
            : "—";
        const trend =
          bucket.trendDirection === "insufficient_data"
            ? "—"
            : bucket.trendDirection;
        console.log(
          `[session]     ${cat}: lifetime=${(bucket.lifetimeAccuracy * 100).toFixed(0)}% recent=${recentAcc} trend=${trend} weight=${bucket.adaptiveWeight.toFixed(2)}`
        );
      }
    }

    const diffEntries = Object.entries(trendProfile.byDifficulty)
      .filter(([, b]) => b.lifetimeSeen > 0)
      .sort(([, a], [, b]) => b.adaptiveWeight - a.adaptiveWeight);

    if (diffEntries.length > 0) {
      console.log("[session]   difficulty trends:");
      for (const [diff, bucket] of diffEntries) {
        const recentAcc =
          bucket.recentSeen > 0
            ? `${(bucket.recentAccuracy * 100).toFixed(0)}%`
            : "—";
        const trend =
          bucket.trendDirection === "insufficient_data"
            ? "—"
            : bucket.trendDirection;
        console.log(
          `[session]     ${diff}: lifetime=${(bucket.lifetimeAccuracy * 100).toFixed(0)}% recent=${recentAcc} trend=${trend} weight=${bucket.adaptiveWeight.toFixed(2)}`
        );
      }
    }

    // Print difficulty policy
    console.log(
      `[session]   difficulty policy: ${policy.adjusted.easy}/${policy.adjusted.medium}/${policy.adjusted.hard} (${policy.reason})`
    );

    // Write trend profile artifact
    const trendPath = resolve(progressDir, "trend-profile.json");
    writeFileSync(trendPath, JSON.stringify(trendProfile, null, 2), "utf-8");
    console.log(`[session]   trend profile: ${trendPath}`);

    // Write difficulty policy artifact
    const policyPath = resolve(progressDir, "difficulty-policy.json");
    writeFileSync(policyPath, JSON.stringify(policy, null, 2), "utf-8");

    // Write learner summary (trend-aware)
    const summaryMd = formatTrendSummaryMd(trendProfile, policy);
    const summaryPath = resolve(progressDir, "learner-summary.md");
    writeFileSync(summaryPath, summaryMd, "utf-8");
    console.log(`[session]   learner summary: ${summaryPath}`);
  } else {
    console.log("[session] adaptive mode: disabled (ADAPTIVE=false)");
  }

  // 7. Build session config (with policy-adjusted difficulty distribution)
  const config: SessionConfig = {
    ...DEFAULT_SESSION_CONFIG,
    sessionSize,
    ...(policy ? { difficultyDistribution: policy.adjusted } : {}),
  };

  console.log(
    `[session] generating ${sessionCount} session(s) of ${sessionSize} exercises`
  );

  // 8. Prioritize exercises (trend-aware adaptive or basic)
  let prioritized: TrainingExercise[];
  if (adaptiveEnabled && trendProfile) {
    const weights = extractTrendWeights(trendProfile);
    prioritized = rankAdaptiveCandidates(exercises, store, weights);
    console.log("[session] ranking: trend-aware adaptive (recency-weighted)");
  } else {
    prioritized = prioritizeByProgress(exercises, store);
    console.log("[session] ranking: basic (progress-only)");
  }

  // 9. Generate sessions
  const usedPositionIds = new Set<string>();

  for (let i = 0; i < sessionCount; i++) {
    const available = prioritized.filter(
      (ex) => !usedPositionIds.has(ex.positionId)
    );

    if (available.length < config.sessionSize) {
      console.warn(
        `[session] not enough remaining exercises for session ${i + 1} (${available.length} available)`
      );
      if (available.length === 0) break;
    }

    const { session } = buildStudySession(available, calibration, config);

    for (const ex of session.exercises) {
      usedPositionIds.add(ex.exerciseId);
    }

    markExercisesSeen(
      store,
      session.exercises.map((ex) => ex.exerciseId),
      session.createdAt
    );

    // Write per-session artifacts
    const sessionDir = getSessionOutputDir(session.sessionId);
    mkdirSync(sessionDir, { recursive: true });

    writeFileSync(
      resolve(sessionDir, "study-session.json"),
      JSON.stringify(session, null, 2),
      "utf-8"
    );
    writeFileSync(
      resolve(sessionDir, "study-session.md"),
      formatSessionMd(session),
      "utf-8"
    );

    // Append session history
    const historyRecord = createSessionHistoryRecord(session);
    appendFileSync(
      historyPath,
      JSON.stringify(historyRecord) + "\n",
      "utf-8"
    );

    // Append to aggregated sessions JSONL
    const aggregatedDir = resolve(projectRoot, "out", "datasets");
    mkdirSync(aggregatedDir, { recursive: true });
    appendFileSync(
      resolve(aggregatedDir, "study-sessions.jsonl"),
      JSON.stringify(session) + "\n",
      "utf-8"
    );

    // Print session summary
    console.log(
      `\n[session] ── ${session.sessionId} (${session.exerciseCount} exercises) ──`
    );
    console.log(
      `[session]   difficulty: easy=${session.metadata.difficultyDistribution.easy} ` +
        `medium=${session.metadata.difficultyDistribution.medium} ` +
        `hard=${session.metadata.difficultyDistribution.hard}`
    );
    console.log(
      `[session]   categories: ${Object.entries(session.metadata.categoryDistribution)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ")}`
    );

    for (let j = 0; j < session.exercises.length; j++) {
      const ex = session.exercises[j];
      const best = ex.bestMoveSan ?? "—";
      const progress = store.exercises[ex.exerciseId];
      const status = progress?.status ?? "unknown";
      console.log(
        `[session]   #${j + 1} ${ex.exerciseId} (ply ${ex.ply}) played=${ex.playedMoveSan} best=${best} ` +
          `cat=${ex.lessonCategory} diff=${ex.difficultyEstimate} status=${status}`
      );
    }
  }

  // 10. Save progress store
  writeFileSync(progressPath, serializeProgressStore(store), "utf-8");

  // 11. Summary
  const finalSummary = getProgressSummary(store);
  console.log("\n[session] ══ generation complete ══");
  console.log(`[session]   sessions generated: ${sessionCount}`);
  console.log(`[session]   exercises used: ${usedPositionIds.size}`);
  console.log(
    `[session]   progress: unseen=${finalSummary.unseen} seen=${finalSummary.seen} correct=${finalSummary.correct} incorrect=${finalSummary.incorrect} due=${finalSummary.due_for_review}`
  );
  console.log(`[session]   progress store: ${progressPath}`);
  console.log(`[session]   session history: ${historyPath}`);
  if (adaptiveEnabled) {
    console.log("[session]   mode: M6D trend-aware adaptive");
  }
}

main();
