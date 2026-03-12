/**
 * Rich end-of-session recap (M8A).
 *
 * Provides both CLI display and markdown artifact formatting.
 * All functions are pure — no I/O.
 */

import type { PuzzleResult } from "./types.js";
import type { SessionAnalytics } from "../analytics/build-session-analytics.js";
import type { ExerciseProgress } from "../progress/types.js";
import type { MasteryState } from "../mastery/derive-mastery-state.js";
import type { ReviewQueueEntry } from "../mastery/build-review-queue.js";

// ── Types ────────────────────────────────────────────────────────────

/** A before/after mastery snapshot for a single exercise. */
export interface MasteryChange {
  exerciseId: string;
  before: MasteryState;
  after: MasteryState;
  changed: boolean;
}

/** Input for the session recap formatter. */
export interface SessionRecapInput {
  result: PuzzleResult;
  analytics: SessionAnalytics;
  masteryChanges: MasteryChange[];
  topReviewItems: ReviewQueueEntry[];
}

// ── Helpers ──────────────────────────────────────────────────────────

const TIER_ORDER = [
  "exact",
  "acceptable",
  "inaccuracy",
  "mistake",
  "blunder",
] as const;

function formatDuration(startedAt: string, completedAt: string): string {
  const diffMs =
    new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const totalSec = Math.max(1, Math.round(diffMs / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

function renderBar(count: number, total: number, width: number): string {
  const filled = total > 0 ? Math.round((count / total) * width) : 0;
  return "\u2588".repeat(filled) + "\u2591".repeat(width - filled);
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

function fmtCp(cp: number | null): string {
  if (cp === null) return "--";
  return `${cp}cp`;
}

// ── Mastery Diffing ──────────────────────────────────────────────────

/**
 * Diff mastery states before and after recording results.
 *
 * @param beforeSnapshot  Map of exerciseId → MasteryState captured BEFORE recordGradedResults
 * @param afterStore      Progress store exercises AFTER recordGradedResults
 * @param exerciseIds     The exercise IDs from this session's attempts
 */
export function buildMasteryChanges(
  beforeSnapshot: Map<string, MasteryState>,
  afterStore: Record<string, ExerciseProgress>,
  exerciseIds: string[]
): MasteryChange[] {
  return exerciseIds.map((id) => {
    const before: MasteryState = beforeSnapshot.get(id) ?? "unseen";
    const after: MasteryState = afterStore[id]?.masteryState ?? "unseen";
    return { exerciseId: id, before, after, changed: before !== after };
  });
}

// ── CLI Recap ────────────────────────────────────────────────────────

/**
 * Format the rich end-of-session recap for CLI display.
 */
export function formatSessionRecap(input: SessionRecapInput): string {
  const { result, analytics, masteryChanges, topReviewItems } = input;
  const lines: string[] = [];

  // Header
  const boxW = 50;
  lines.push("");
  lines.push(`${"╔"}${"═".repeat(boxW - 2)}${"╗"}`);
  lines.push(
    `${"║"}${"SESSION COMPLETE".padStart(Math.floor((boxW - 2 + 16) / 2)).padEnd(boxW - 2)}${"║"}`
  );
  lines.push(`${"╚"}${"═".repeat(boxW - 2)}${"╝"}`);
  lines.push("");

  // Overview
  const duration = formatDuration(result.startedAt, result.completedAt);
  const pct = fmtPct(result.accuracy);
  lines.push(`  Session:    ${result.sessionId}`);
  lines.push(`  Duration:   ${duration}`);
  lines.push(`  Exercises:  ${result.totalExercises}`);
  lines.push(
    `  Accuracy:   ${pct}  (${result.correctCount}/${result.totalExercises})`
  );
  lines.push("");

  // Grade Distribution
  lines.push(`  ${"──"} Grade Distribution ${"─".repeat(27)}`);
  const barWidth = 20;
  for (const tier of TIER_ORDER) {
    const count = analytics.gradeDistribution[tier] ?? 0;
    if (count === 0) continue;
    const bar = renderBar(count, result.totalExercises, barWidth);
    const tierPad = tier.padEnd(12);
    const countStr = String(count).padStart(2);
    const tierPct = ((count / result.totalExercises) * 100).toFixed(0) + "%";
    lines.push(`    ${tierPad} ${countStr}  ${bar}  ${tierPct}`);
  }
  lines.push("");

  // Eval Loss
  const stats = analytics.evalLossStats;
  if (stats.count > 0) {
    lines.push(`  ${"──"} Eval Loss ${"─".repeat(35)}`);
    lines.push(`    Average:  ${fmtCp(stats.average)}`);
    lines.push(`    Median:   ${fmtCp(stats.median)}`);
    lines.push(`    Max:      ${fmtCp(stats.max)}`);
    lines.push("");
  }

  // Hardest Misses
  if (analytics.hardestMissed.length > 0) {
    lines.push(`  ${"──"} Hardest Misses ${"─".repeat(31)}`);
    const topN = analytics.hardestMissed.slice(0, 3);
    for (let i = 0; i < topN.length; i++) {
      const m = topN[i];
      const loss = m.evalLossCp !== null ? `-${m.evalLossCp}cp` : "??";
      lines.push(
        `    ${i + 1}. ${m.userMove} (should: ${m.engineMove})  ${loss}  ${m.lessonCategory}  ${m.difficultyEstimate}`
      );
    }
    lines.push("");
  }

  // Mastery Changes
  const changed = masteryChanges.filter((c) => c.changed);
  if (changed.length > 0) {
    lines.push(`  ${"──"} Mastery Changes ${"─".repeat(30)}`);
    // Group by transition
    const groups: Record<string, number> = {};
    for (const c of changed) {
      const key = `${c.before} \u2192 ${c.after}`;
      groups[key] = (groups[key] ?? 0) + 1;
    }
    for (const [transition, count] of Object.entries(groups)) {
      const label = count === 1 ? "exercise" : "exercises";
      lines.push(`    ${transition}:  ${count} ${label}`);
    }
    lines.push("");
  }

  // Review Attention
  if (topReviewItems.length > 0) {
    const reviewable = topReviewItems
      .filter((e) => e.reviewUrgency > 0)
      .slice(0, 3);
    if (reviewable.length > 0) {
      lines.push(`  ${"──"} Review Attention ${"─".repeat(29)}`);
      lines.push(
        `    ${reviewable.length} exercise${reviewable.length === 1 ? "" : "s"} need${reviewable.length === 1 ? "s" : ""} review (highest urgency first):`
      );
      for (let i = 0; i < reviewable.length; i++) {
        const e = reviewable[i];
        const urg = e.reviewUrgency.toFixed(2);
        const grade = e.lastGradingTier ?? "—";
        lines.push(
          `    ${i + 1}. ${e.exerciseId}  urgency=${urg}  ${e.masteryState}  (${grade})`
        );
      }
      lines.push("");
    }
  }

  // Weak Spots
  const catEntries = Object.entries(analytics.byCategoryMissRate);
  const diffEntries = Object.entries(analytics.byDifficultyMissRate);
  const worstCat = catEntries
    .filter(([, b]) => b.missRate > 0)
    .sort((a, b) => b[1].missRate - a[1].missRate)[0];
  const worstDiff = diffEntries
    .filter(([, b]) => b.missRate > 0)
    .sort((a, b) => b[1].missRate - a[1].missRate)[0];

  if (worstCat || worstDiff) {
    lines.push(`  ${"──"} Weak Spots ${"─".repeat(34)}`);
    if (worstCat) {
      lines.push(
        `    Weakest category:    ${worstCat[0]} (${fmtPct(worstCat[1].missRate)} miss rate)`
      );
    }
    if (worstDiff) {
      lines.push(
        `    Weakest difficulty:  ${worstDiff[0]} (${fmtPct(worstDiff[1].missRate)} miss rate)`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ── Markdown Recap ───────────────────────────────────────────────────

/**
 * Format the session recap as a markdown artifact.
 */
export function formatSessionRecapMd(input: SessionRecapInput): string {
  const { result, analytics, masteryChanges, topReviewItems } = input;
  const lines: string[] = [];

  const duration = formatDuration(result.startedAt, result.completedAt);

  lines.push(`# Session Recap — ${result.sessionId}`);
  lines.push("");
  lines.push(`Generated: ${result.completedAt}`);
  lines.push("");

  // Overview
  lines.push("## Overview");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Duration | ${duration} |`);
  lines.push(`| Exercises | ${result.totalExercises} |`);
  lines.push(
    `| Accuracy | ${fmtPct(result.accuracy)} (${result.correctCount}/${result.totalExercises}) |`
  );
  lines.push("");

  // Grade Distribution
  lines.push("## Grade Distribution");
  lines.push("");
  lines.push("| Grade | Count | % |");
  lines.push("|-------|------:|---:|");
  for (const tier of TIER_ORDER) {
    const count = analytics.gradeDistribution[tier] ?? 0;
    if (count === 0) continue;
    const tierPct = ((count / result.totalExercises) * 100).toFixed(1);
    lines.push(`| ${tier} | ${count} | ${tierPct}% |`);
  }
  lines.push("");

  // Eval Loss
  const stats = analytics.evalLossStats;
  if (stats.count > 0) {
    lines.push("## Eval Loss");
    lines.push("");
    lines.push("| Metric | Value |");
    lines.push("|--------|-------|");
    lines.push(`| Average | ${fmtCp(stats.average)} |`);
    lines.push(`| Median | ${fmtCp(stats.median)} |`);
    lines.push(`| Max | ${fmtCp(stats.max)} |`);
    lines.push(`| Known losses | ${stats.count} |`);
    lines.push("");
  }

  // Hardest Misses
  if (analytics.hardestMissed.length > 0) {
    lines.push("## Hardest Misses");
    lines.push("");
    lines.push(
      "| # | Played | Best | Eval Loss | Category | Difficulty |"
    );
    lines.push(
      "|---|--------|------|-----------|----------|------------|"
    );
    for (let i = 0; i < analytics.hardestMissed.length; i++) {
      const m = analytics.hardestMissed[i];
      const loss = m.evalLossCp !== null ? `${m.evalLossCp}cp` : "??";
      lines.push(
        `| ${i + 1} | ${m.userMove} | ${m.engineMove} | ${loss} | ${m.lessonCategory} | ${m.difficultyEstimate} |`
      );
    }
    lines.push("");
  }

  // Mastery Changes
  const changed = masteryChanges.filter((c) => c.changed);
  if (changed.length > 0) {
    lines.push("## Mastery Changes");
    lines.push("");
    const groups: Record<string, string[]> = {};
    for (const c of changed) {
      const key = `${c.before} \u2192 ${c.after}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c.exerciseId);
    }
    lines.push("| Transition | Count | Exercises |");
    lines.push("|------------|------:|-----------|");
    for (const [transition, ids] of Object.entries(groups)) {
      lines.push(`| ${transition} | ${ids.length} | ${ids.join(", ")} |`);
    }
    lines.push("");
  }

  // Review Attention
  if (topReviewItems.length > 0) {
    const reviewable = topReviewItems
      .filter((e) => e.reviewUrgency > 0)
      .slice(0, 5);
    if (reviewable.length > 0) {
      lines.push("## Review Attention");
      lines.push("");
      lines.push("| # | Exercise | Urgency | Mastery | Last Grade |");
      lines.push("|---|----------|---------|---------|------------|");
      for (let i = 0; i < reviewable.length; i++) {
        const e = reviewable[i];
        const urg = e.reviewUrgency.toFixed(2);
        const grade = e.lastGradingTier ?? "\u2014";
        lines.push(
          `| ${i + 1} | ${e.exerciseId} | ${urg} | ${e.masteryState} | ${grade} |`
        );
      }
      lines.push("");
    }
  }

  // Weak Spots
  const catEntries = Object.entries(analytics.byCategoryMissRate);
  const diffEntries = Object.entries(analytics.byDifficultyMissRate);
  const worstCat = catEntries
    .filter(([, b]) => b.missRate > 0)
    .sort((a, b) => b[1].missRate - a[1].missRate)[0];
  const worstDiff = diffEntries
    .filter(([, b]) => b.missRate > 0)
    .sort((a, b) => b[1].missRate - a[1].missRate)[0];

  if (worstCat || worstDiff) {
    lines.push("## Weak Spots");
    lines.push("");
    if (worstCat) {
      lines.push(
        `- **Weakest category:** ${worstCat[0]} (${fmtPct(worstCat[1].missRate)} miss rate)`
      );
    }
    if (worstDiff) {
      lines.push(
        `- **Weakest difficulty:** ${worstDiff[0]} (${fmtPct(worstDiff[1].missRate)} miss rate)`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
