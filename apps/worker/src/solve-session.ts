/**
 * Interactive puzzle runner CLI entry point (M8A).
 *
 * Loads a study session, steps through exercises, prompts the user
 * for moves, validates legality, compares to engine answer, records
 * results, and updates progress automatically.
 *
 * Usage:
 *   pnpm --filter worker run solve-session
 *   SESSION_ID=session-abc123 pnpm --filter worker run solve-session
 */

import { resolve, dirname } from "path";
import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
  appendFileSync,
} from "fs";
import { createInterface } from "readline";
import {
  enrichSessionExercises,
  buildPuzzleResult,
  buildSessionResultInput,
  gradeAttempt,
  formatExercisePrompt,
  formatAttemptResult,
  formatSessionProgress,
  formatSessionRecap,
  formatSessionRecapMd,
  buildMasteryChanges,
  refreshDueStatus,
  getProgressSummary,
  serializeProgressStore,
  createCompletionRecord,
  buildSessionAnalytics,
  formatSessionAnalyticsMd,
  recordGradedResults,
  buildReviewQueue,
  formatReviewQueueMd,
} from "@chess-os/training";
import type {
  TrainingExercise,
  StudySession,
  ProgressStore,
  EnrichedExercise,
  PuzzleAttempt,
  GradedExerciseResult,
  SessionRecapInput,
  MasteryState,
} from "@chess-os/training";
import {
  validateMove,
} from "@chess-os/chess-core";
import {
  getSessionOutputDir,
  getProgressDir,
  getResultsOutputDir,
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
 * Find the most recently created session directory.
 */
function findLatestSessionId(): string | undefined {
  const projectRoot = findProjectRoot();
  const sessionsDir = resolve(projectRoot, "out", "sessions");
  if (!existsSync(sessionsDir)) return undefined;

  const entries = readdirSync(sessionsDir, { withFileTypes: true });
  const sessionDirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith("session-"))
    .map((e) => {
      const jsonPath = resolve(sessionsDir, e.name, "study-session.json");
      if (!existsSync(jsonPath)) return null;
      const session: StudySession = JSON.parse(
        readFileSync(jsonPath, "utf-8")
      );
      return { id: e.name, createdAt: session.createdAt };
    })
    .filter((e): e is { id: string; createdAt: string } => e !== null);

  if (sessionDirs.length === 0) return undefined;

  sessionDirs.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return sessionDirs[0].id;
}

/**
 * Load the training exercise corpus from JSONL.
 */
function loadExerciseCorpus(projectRoot: string): TrainingExercise[] {
  const corpusPath = resolve(
    projectRoot,
    "out",
    "datasets",
    "training-exercises.jsonl"
  );
  if (!existsSync(corpusPath)) {
    console.error(`[runner] exercise corpus not found: ${corpusPath}`);
    console.error(
      "[runner] run exercises first: pnpm --filter worker run generate-exercises"
    );
    process.exit(1);
  }

  const lines = readFileSync(corpusPath, "utf-8")
    .trim()
    .split("\n")
    .filter((l) => l.length > 0);

  return lines.map((l) => JSON.parse(l));
}

/**
 * Prompt the user for input via readline.
 */
function prompt(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main(): Promise<void> {
  console.log("[runner] chess-os interactive puzzle runner (M8A)");

  const projectRoot = findProjectRoot();

  // 1. Determine session ID
  const sessionId = process.env.SESSION_ID ?? findLatestSessionId();
  if (!sessionId) {
    console.error("[runner] no sessions found");
    console.error(
      "[runner] generate a session first: pnpm --filter worker run generate-session"
    );
    process.exit(1);
  }

  // 2. Load study session
  const sessionDir = getSessionOutputDir(sessionId);
  const sessionPath = resolve(sessionDir, "study-session.json");
  if (!existsSync(sessionPath)) {
    console.error(`[runner] session not found: ${sessionPath}`);
    process.exit(1);
  }

  const session: StudySession = JSON.parse(
    readFileSync(sessionPath, "utf-8")
  );
  console.log(
    `[runner] loaded session: ${session.sessionId} (${session.exerciseCount} exercises)`
  );

  // 3. Load exercise corpus and enrich
  const corpus = loadExerciseCorpus(projectRoot);
  console.log(`[runner] loaded corpus: ${corpus.length} exercises`);

  const enriched: EnrichedExercise[] = enrichSessionExercises(session, corpus);
  if (enriched.length === 0) {
    console.error("[runner] no exercises could be enriched from corpus");
    process.exit(1);
  }
  if (enriched.length < session.exerciseCount) {
    console.warn(
      `[runner] warning: ${session.exerciseCount - enriched.length} exercise(s) not found in corpus`
    );
  }

  // 4. Interactive solving loop
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const startedAt = new Date().toISOString();
  const attempts: PuzzleAttempt[] = [];

  console.log(
    `\n[runner] Starting session ${session.sessionId} — ${enriched.length} exercises`
  );

  for (let i = 0; i < enriched.length; i++) {
    const exercise = enriched[i];

    // Display exercise
    process.stdout.write(
      formatExercisePrompt(exercise, i, enriched.length)
    );

    // Prompt until valid move
    let attempt: PuzzleAttempt | null = null;
    while (attempt === null) {
      const input = await prompt(rl, "  Your move (SAN or UCI): ");

      // Allow quit
      if (input.trim().toLowerCase() === "quit" || input.trim().toLowerCase() === "q") {
        console.log("\n[runner] Session aborted by user.");
        rl.close();
        process.exit(0);
      }

      const validation = validateMove(exercise.fen, input);
      if (!validation.valid) {
        console.log(`  ${validation.error} — try again.`);
        continue;
      }

      attempt = gradeAttempt(
        exercise,
        i,
        validation.san!,
        validation.uci!
      );
    }

    attempts.push(attempt);

    // Show result + running progress
    process.stdout.write(formatAttemptResult(attempt, exercise));
    process.stdout.write(formatSessionProgress(attempts, enriched.length));
  }

  rl.close();

  // 5. Build results
  const result = buildPuzzleResult(session.sessionId, attempts, startedAt);

  // 6. Write result artifacts
  const resultsDir = getResultsOutputDir(session.sessionId);
  mkdirSync(resultsDir, { recursive: true });

  const resultsPath = resolve(resultsDir, "results.json");
  writeFileSync(resultsPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`[runner] results: ${resultsPath}`);

  const sessionResultInput = buildSessionResultInput(session.sessionId, attempts);
  const sessionResultsPath = resolve(resultsDir, "session-results.json");
  writeFileSync(
    sessionResultsPath,
    JSON.stringify(sessionResultInput, null, 2),
    "utf-8"
  );
  console.log(`[runner] session-results: ${sessionResultsPath}`);

  // 8. Build and write session analytics
  const analytics = buildSessionAnalytics(session.sessionId, attempts);
  const analyticsPath = resolve(resultsDir, "session-analytics.json");
  writeFileSync(analyticsPath, JSON.stringify(analytics, null, 2), "utf-8");
  console.log(`[runner] analytics: ${analyticsPath}`);

  const analyticsMdPath = resolve(resultsDir, "session-analytics.md");
  writeFileSync(analyticsMdPath, formatSessionAnalyticsMd(analytics), "utf-8");
  console.log(`[runner] analytics report: ${analyticsMdPath}`);

  // 9. Auto-update progress store
  const progressDir = getProgressDir();
  const progressPath = resolve(progressDir, "exercise-progress.json");

  if (existsSync(progressPath)) {
    const store: ProgressStore = JSON.parse(
      readFileSync(progressPath, "utf-8")
    );

    const timestamp = result.completedAt;

    // Snapshot mastery states BEFORE recording results
    const beforeMastery = new Map<string, MasteryState>();
    for (const a of attempts) {
      const entry = store.exercises[a.exerciseId];
      beforeMastery.set(a.exerciseId, entry?.masteryState ?? "unseen");
    }

    // Build graded results from attempts
    const gradedResults: GradedExerciseResult[] = attempts.map((a) => ({
      exerciseId: a.exerciseId,
      result: a.isCorrect ? ("correct" as const) : ("incorrect" as const),
      gradingTier: a.gradingTier,
      evalLossCp: a.evalLossCp,
    }));

    recordGradedResults(store, gradedResults, timestamp);
    refreshDueStatus(store, timestamp);

    // Append completion record to session history
    const historyPath = resolve(progressDir, "session-history.jsonl");
    const completionRecord = createCompletionRecord(
      session.sessionId,
      timestamp,
      sessionResultInput.results.map((r) => r.exerciseId),
      sessionResultInput.results
    );
    appendFileSync(
      historyPath,
      JSON.stringify(completionRecord) + "\n",
      "utf-8"
    );

    writeFileSync(progressPath, serializeProgressStore(store), "utf-8");

    // Build and write review queue
    const reviewQueue = buildReviewQueue(store, timestamp);
    const reviewQueuePath = resolve(progressDir, "review-queue.json");
    writeFileSync(reviewQueuePath, JSON.stringify(reviewQueue, null, 2), "utf-8");
    console.log(`[runner] review queue: ${reviewQueuePath}`);

    const reviewQueueMdPath = resolve(progressDir, "review-queue.md");
    writeFileSync(reviewQueueMdPath, formatReviewQueueMd(reviewQueue), "utf-8");
    console.log(`[runner] review queue report: ${reviewQueueMdPath}`);

    const summary = getProgressSummary(store);
    console.log("\n[runner] progress updated:");
    console.log(
      `[runner]   unseen=${summary.unseen} seen=${summary.seen} correct=${summary.correct} incorrect=${summary.incorrect} due=${summary.due_for_review}`
    );

    // Build mastery changes and recap
    const masteryChanges = buildMasteryChanges(
      beforeMastery,
      store.exercises,
      attempts.map((a) => a.exerciseId)
    );

    const recapInput: SessionRecapInput = {
      result,
      analytics,
      masteryChanges,
      topReviewItems: reviewQueue.entries.slice(0, 5),
    };

    process.stdout.write(formatSessionRecap(recapInput));

    // Write recap artifact
    const recapMdPath = resolve(resultsDir, "session-recap.md");
    writeFileSync(recapMdPath, formatSessionRecapMd(recapInput), "utf-8");
    console.log(`[runner] session recap: ${recapMdPath}`);
  } else {
    console.warn(
      "[runner] progress store not found — skipping progress update"
    );

    // Show recap without mastery data
    const recapInput: SessionRecapInput = {
      result,
      analytics,
      masteryChanges: [],
      topReviewItems: [],
    };
    process.stdout.write(formatSessionRecap(recapInput));

    const recapMdPath = resolve(resultsDir, "session-recap.md");
    writeFileSync(recapMdPath, formatSessionRecapMd(recapInput), "utf-8");
    console.log(`[runner] session recap: ${recapMdPath}`);
  }

  console.log("[runner] done");
}

main().catch((err) => {
  console.error("[runner] fatal error:", err);
  process.exit(1);
});
