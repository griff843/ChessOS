/**
 * Output formatting for the interactive puzzle runner (M8A).
 *
 * All functions are pure — they return strings for the CLI
 * layer to print.
 */

import { Chess } from "chess.js";
import type { EnrichedExercise, PuzzleAttempt, PuzzleResult } from "./types";

/**
 * Render an ASCII board from a FEN string.
 * Uses chess.js's built-in ascii() renderer.
 */
export function renderBoard(fen: string): string {
  const chess = new Chess(fen);
  return chess.ascii();
}

/**
 * Format the exercise header shown before prompting the user.
 *
 * Includes: exercise number, board, FEN, side to move, category,
 * difficulty, phase, source game, and position eval.
 */
export function formatExercisePrompt(
  exercise: EnrichedExercise,
  index: number,
  total: number
): string {
  const lines: string[] = [];

  lines.push(`\n${"═".repeat(50)}`);
  lines.push(`  Exercise ${index + 1} / ${total}`);
  lines.push(`${"─".repeat(50)}`);
  lines.push("");
  lines.push(renderBoard(exercise.fen));
  lines.push("");
  lines.push(
    `  Side:       ${exercise.sideToMove === "white" ? "White" : "Black"} to move`
  );
  lines.push(`  Category:   ${exercise.lessonCategory}`);
  lines.push(`  Difficulty: ${exercise.difficultyEstimate}`);
  lines.push(`  Phase:      ${exercise.phase}`);
  lines.push(`  Source:     ${exercise.gameId} ply ${exercise.ply}`);

  const evalSign = exercise.evalBefore >= 0 ? "+" : "";
  lines.push(`  Eval:       ${evalSign}${exercise.evalBefore}cp`);

  lines.push(`${"═".repeat(50)}`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Format the result feedback shown after the user submits a move.
 *
 * Correct answers get a clean boxed banner.
 * Incorrect answers include detailed analysis context.
 */
export function formatAttemptResult(
  attempt: PuzzleAttempt,
  exercise: EnrichedExercise
): string {
  const lines: string[] = [];
  const tier = attempt.gradingTier;

  // Build the banner text
  const lossTag =
    attempt.evalLossCp !== null && attempt.evalLossCp > 0
      ? ` (-${attempt.evalLossCp}cp)`
      : attempt.evalLossCp === null && !attempt.isCorrect
        ? " (eval unknown)"
        : "";

  let bannerText: string;
  switch (tier) {
    case "exact":
      bannerText = "EXACT MATCH!";
      break;
    case "acceptable":
      bannerText = `ACCEPTABLE${lossTag}`;
      break;
    case "inaccuracy":
      bannerText = `INACCURACY${lossTag}`;
      break;
    case "mistake":
      bannerText = `MISTAKE${lossTag}`;
      break;
    case "blunder":
      bannerText = `BLUNDER${lossTag}`;
      break;
    default:
      bannerText = attempt.isCorrect ? "CORRECT" : `INCORRECT${lossTag}`;
  }

  // Boxed banner
  const boxWidth = 46;
  const padded = bannerText.padEnd(boxWidth - 4);
  lines.push(`  ${"╔"}${"═".repeat(boxWidth - 2)}${"╗"}`);
  lines.push(`  ${"║"} ${padded} ${"║"}`);
  lines.push(`  ${"╚"}${"═".repeat(boxWidth - 2)}${"╝"}`);
  lines.push("");

  // Move details
  lines.push(`  Your move:    ${attempt.userMove}`);

  if (tier === "exact") {
    // Clean feedback for correct answers
    lines.push(`  Category:     ${attempt.lessonCategory}`);
    lines.push("");
    return lines.join("\n");
  }

  // Detailed feedback for incorrect/suboptimal answers
  lines.push(
    `  Best move:    ${exercise.bestMoveSan ?? exercise.bestMoveUci} (${exercise.bestMoveUci})`
  );
  lines.push(`  Category:     ${attempt.lessonCategory}`);
  lines.push("");

  // Eval context
  const evalBeforeSign = exercise.evalBefore >= 0 ? "+" : "";
  const evalAfterSign = exercise.evalAfter >= 0 ? "+" : "";
  lines.push(`  Eval before:  ${evalBeforeSign}${exercise.evalBefore}cp`);
  lines.push(`  Eval after:   ${evalAfterSign}${exercise.evalAfter}cp`);

  const swingSign = exercise.evalSwing >= 0 ? "+" : "";
  lines.push(`  Eval swing:   ${swingSign}${exercise.evalSwing}cp`);
  lines.push("");

  if (exercise.pv.length > 0) {
    lines.push(`  PV:  ${exercise.pv.join(" ")}`);
  }

  if (exercise.reasonCodes.length > 0) {
    lines.push(`  Reason codes: ${exercise.reasonCodes.join(", ")}`);
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Format the session summary shown after all exercises are complete.
 *
 * Retained for backward compatibility. The CLI now uses formatSessionRecap
 * instead, but this function remains exported.
 */
export function formatSessionSummary(result: PuzzleResult): string {
  const lines: string[] = [];
  const pct = (result.accuracy * 100).toFixed(1);

  lines.push(`\n${"═".repeat(50)}`);
  lines.push(`  Session Complete: ${result.sessionId}`);
  lines.push(`${"═".repeat(50)}`);
  lines.push("");
  lines.push(`  Total:     ${result.totalExercises}`);
  lines.push(`  Correct:   ${result.correctCount}`);
  lines.push(`  Incorrect: ${result.incorrectCount}`);
  lines.push(`  Accuracy:  ${pct}%`);
  lines.push("");
  // Grade distribution
  const dist: Record<string, number> = {};
  for (const a of result.attempts) {
    const t = a.gradingTier ?? (a.isCorrect ? "exact" : "unknown");
    dist[t] = (dist[t] ?? 0) + 1;
  }
  const tierOrder = ["exact", "acceptable", "inaccuracy", "mistake", "blunder"];
  lines.push("  Grades:");
  for (const t of tierOrder) {
    if (dist[t]) lines.push(`    ${t}: ${dist[t]}`);
  }
  lines.push("");

  lines.push(`  Started:   ${result.startedAt}`);
  lines.push(`  Completed: ${result.completedAt}`);
  lines.push("");

  return lines.join("\n");
}
