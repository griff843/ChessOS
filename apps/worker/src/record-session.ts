/**
 * Record session results CLI entry point.
 *
 * Reads a session result input file and updates exercise progress.
 *
 * Usage:
 *   RESULTS_FILE=path/to/results.json pnpm --filter worker run record-session
 *
 * Input format (results.json):
 *   {
 *     "sessionId": "session-33cecce1",
 *     "results": [
 *       { "exerciseId": "game11:33", "result": "correct" },
 *       { "exerciseId": "game14:31", "result": "incorrect" }
 *     ]
 *   }
 */

import { resolve, dirname } from "path";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  appendFileSync,
} from "fs";
import {
  recordExerciseResults,
  refreshDueStatus,
  getProgressSummary,
  serializeProgressStore,
  createCompletionRecord,
} from "@chess-os/training";
import type { ProgressStore, SessionResultInput } from "@chess-os/training";
import { getProgressDir } from "@chess-os/db";

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

function main(): void {
  console.log("[record] chess-os session result recorder (M6B)");

  const progressDir = getProgressDir();
  const progressPath = resolve(progressDir, "exercise-progress.json");

  // 1. Load progress store
  if (!existsSync(progressPath)) {
    console.error(`[record] progress store not found: ${progressPath}`);
    console.error(
      "[record] run generate-session first: pnpm --filter worker run generate-session"
    );
    process.exit(1);
  }

  const store: ProgressStore = JSON.parse(
    readFileSync(progressPath, "utf-8")
  );
  console.log(
    `[record] loaded progress store (${Object.keys(store.exercises).length} exercises)`
  );

  // 2. Load results input
  const resultsFile = process.env.RESULTS_FILE;
  if (!resultsFile) {
    console.error("[record] RESULTS_FILE env var required");
    console.error(
      '[record] example: RESULTS_FILE=results.json pnpm --filter worker run record-session'
    );
    process.exit(1);
  }

  const resultsPath = resolve(process.cwd(), resultsFile);
  if (!existsSync(resultsPath)) {
    console.error(`[record] results file not found: ${resultsPath}`);
    process.exit(1);
  }

  const input: SessionResultInput = JSON.parse(
    readFileSync(resultsPath, "utf-8")
  );

  console.log(
    `[record] recording results for session ${input.sessionId} (${input.results.length} results)`
  );

  // 3. Show before state
  const beforeSummary = getProgressSummary(store);
  console.log(
    `[record] before: unseen=${beforeSummary.unseen} seen=${beforeSummary.seen} correct=${beforeSummary.correct} incorrect=${beforeSummary.incorrect} due=${beforeSummary.due_for_review}`
  );

  // 4. Record results
  const timestamp = input.completedAt ?? new Date().toISOString();
  recordExerciseResults(store, input.results, timestamp);

  // 5. Refresh due status
  refreshDueStatus(store, timestamp);

  // 6. Print individual results
  let correctCount = 0;
  let incorrectCount = 0;
  for (const { exerciseId, result } of input.results) {
    const entry = store.exercises[exerciseId];
    if (!entry) {
      console.warn(`[record]   ${exerciseId}: not found in store`);
      continue;
    }

    const nextReview = entry.nextReviewAt
      ? new Date(entry.nextReviewAt).toISOString().split("T")[0]
      : "—";

    console.log(
      `[record]   ${exerciseId}: ${result} → interval=${entry.intervalDays}d next=${nextReview} ` +
        `(correct=${entry.timesCorrect} incorrect=${entry.timesIncorrect})`
    );

    if (result === "correct") correctCount++;
    else incorrectCount++;
  }

  // 7. Append completion record to session history
  const historyPath = resolve(progressDir, "session-history.jsonl");
  const completionRecord = createCompletionRecord(
    input.sessionId,
    timestamp,
    input.results.map((r) => r.exerciseId),
    input.results
  );
  appendFileSync(
    historyPath,
    JSON.stringify(completionRecord) + "\n",
    "utf-8"
  );

  // 8. Save progress store
  writeFileSync(progressPath, serializeProgressStore(store), "utf-8");

  // 9. Summary
  const afterSummary = getProgressSummary(store);
  console.log("\n[record] ══ recording complete ══");
  console.log(
    `[record]   session: ${input.sessionId}`
  );
  console.log(
    `[record]   results: ${correctCount} correct, ${incorrectCount} incorrect`
  );
  console.log(
    `[record]   after: unseen=${afterSummary.unseen} seen=${afterSummary.seen} correct=${afterSummary.correct} incorrect=${afterSummary.incorrect} due=${afterSummary.due_for_review}`
  );
  console.log(`[record]   progress store: ${progressPath}`);
  console.log(`[record]   session history: ${historyPath}`);
}

main();
