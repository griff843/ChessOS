/**
 * Generate a compact learner summary from the weakness profile.
 *
 * Produces both a structured LearnerSummary object and a formatted
 * markdown string for the learner-summary.md artifact.
 */

import type { WeaknessProfile, PerformanceBucket, LearnerSummary } from "./types";

/**
 * Build a learner summary from the weakness profile.
 */
export function buildLearnerSummary(
  profile: WeaknessProfile
): LearnerSummary {
  // Find strongest/weakest categories (by accuracy, among those with attempts)
  const catEntries = Object.entries(profile.byCategory)
    .filter(([, b]) => b.correctCount + b.incorrectCount > 0)
    .sort(([, a], [, b]) => b.accuracy - a.accuracy);

  const strongestCategories = catEntries
    .filter(([, b]) => b.accuracy >= 0.7)
    .map(([k]) => k);
  const weakestCategories = catEntries
    .filter(([, b]) => b.accuracy < 0.5)
    .map(([k]) => k);

  // If no clear weak categories, take the bottom entries
  if (weakestCategories.length === 0 && catEntries.length > 0) {
    const worst = catEntries[catEntries.length - 1];
    if (worst) weakestCategories.push(worst[0]);
  }

  // Find strongest/weakest difficulty band
  const diffEntries = Object.entries(profile.byDifficulty)
    .filter(([, b]) => b.correctCount + b.incorrectCount > 0)
    .sort(([, a], [, b]) => b.accuracy - a.accuracy);

  const strongestDifficulty = diffEntries.length > 0 ? diffEntries[0][0] : null;
  const weakestDifficulty =
    diffEntries.length > 0 ? diffEntries[diffEntries.length - 1][0] : null;

  // Count overdue
  let overdueCount = 0;
  for (const bucket of Object.values(profile.byCategory)) {
    overdueCount += bucket.dueCount;
  }

  return {
    generatedAt: profile.generatedAt,
    totalExercises: profile.totalExercises,
    totalSeen: profile.totalSeen,
    totalCorrect: profile.totalCorrect,
    totalIncorrect: profile.totalIncorrect,
    overallAccuracy: profile.overallAccuracy,
    overdueCount,
    strongestCategories,
    weakestCategories,
    strongestDifficulty,
    weakestDifficulty,
  };
}

/**
 * Format a performance bucket as a compact string.
 */
function formatBucket(key: string, b: PerformanceBucket): string {
  const acc = (b.accuracy * 100).toFixed(1);
  const miss = (b.missRate * 100).toFixed(1);
  return `| ${key} | ${b.seenCount} | ${b.correctCount} | ${b.incorrectCount} | ${acc}% | ${miss}% | ${b.dueCount} | ${b.adaptiveWeight.toFixed(2)} |`;
}

/**
 * Format the learner summary as markdown.
 */
export function formatLearnerSummaryMd(
  profile: WeaknessProfile,
  summary: LearnerSummary
): string {
  const lines: string[] = [];

  lines.push("# Learner Summary");
  lines.push("");
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push("");

  // Overview
  lines.push("## Overview");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total exercises | ${summary.totalExercises} |`);
  lines.push(`| Seen | ${summary.totalSeen} |`);
  lines.push(`| Correct | ${summary.totalCorrect} |`);
  lines.push(`| Incorrect | ${summary.totalIncorrect} |`);
  lines.push(
    `| Overall accuracy | ${(summary.overallAccuracy * 100).toFixed(1)}% |`
  );
  lines.push(`| Overdue for review | ${summary.overdueCount} |`);
  lines.push("");

  // Strengths and weaknesses
  lines.push("## Strengths");
  lines.push("");
  if (summary.strongestCategories.length > 0) {
    lines.push(
      `- **Strongest categories:** ${summary.strongestCategories.join(", ")}`
    );
  } else {
    lines.push("- No strong categories yet (need more data)");
  }
  if (summary.strongestDifficulty) {
    lines.push(`- **Strongest difficulty:** ${summary.strongestDifficulty}`);
  }
  lines.push("");

  lines.push("## Weaknesses");
  lines.push("");
  if (summary.weakestCategories.length > 0) {
    lines.push(
      `- **Weakest categories:** ${summary.weakestCategories.join(", ")}`
    );
  } else {
    lines.push("- No weak categories identified yet");
  }
  if (summary.weakestDifficulty) {
    lines.push(`- **Weakest difficulty:** ${summary.weakestDifficulty}`);
  }
  lines.push("");

  // Category breakdown
  lines.push("## Performance by Category");
  lines.push("");
  lines.push(
    "| Category | Seen | Correct | Incorrect | Accuracy | Miss Rate | Due | Weight |"
  );
  lines.push(
    "|----------|------|---------|-----------|----------|-----------|-----|--------|"
  );
  for (const [key, bucket] of Object.entries(profile.byCategory).sort(
    ([, a], [, b]) => b.adaptiveWeight - a.adaptiveWeight
  )) {
    lines.push(formatBucket(key, bucket));
  }
  lines.push("");

  // Difficulty breakdown
  lines.push("## Performance by Difficulty");
  lines.push("");
  lines.push(
    "| Difficulty | Seen | Correct | Incorrect | Accuracy | Miss Rate | Due | Weight |"
  );
  lines.push(
    "|------------|------|---------|-----------|----------|-----------|-----|--------|"
  );
  for (const key of ["easy", "medium", "hard"]) {
    const bucket = profile.byDifficulty[key];
    if (bucket) lines.push(formatBucket(key, bucket));
  }
  lines.push("");

  // Phase breakdown
  if (Object.keys(profile.byPhase).length > 0) {
    lines.push("## Performance by Phase");
    lines.push("");
    lines.push(
      "| Phase | Seen | Correct | Incorrect | Accuracy | Miss Rate | Due | Weight |"
    );
    lines.push(
      "|-------|------|---------|-----------|----------|-----------|-----|--------|"
    );
    for (const key of ["opening", "middlegame", "endgame"]) {
      const bucket = profile.byPhase[key];
      if (bucket) lines.push(formatBucket(key, bucket));
    }
    lines.push("");
  }

  return lines.join("\n");
}
