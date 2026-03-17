/**
 * Format the study plan as a markdown artifact.
 *
 * Pure function: no I/O.
 */

import type { StudyPlan } from "./types.js";

/**
 * Format the study plan as markdown.
 */
export function formatStudyPlanMd(plan: StudyPlan): string {
  const lines: string[] = [];

  lines.push("# Study Plan");
  lines.push("");
  lines.push(`Generated: ${plan.generatedAt}`);
  lines.push("");

  // Overview
  lines.push("## Overview");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Session size | ${plan.suggestedSessionSize} exercises |`);
  lines.push(
    `| Difficulty mix | easy:${plan.targetDifficultyMix.easy} medium:${plan.targetDifficultyMix.medium} hard:${plan.targetDifficultyMix.hard} |`
  );
  lines.push("");

  // Primary Focus
  lines.push("## Primary Focus");
  lines.push("");
  lines.push(`- **Category:** ${plan.primaryFocus.category}`);
  if (plan.primaryFocus.difficulty) {
    lines.push(`- **Difficulty:** ${plan.primaryFocus.difficulty}`);
  }
  lines.push(`- **Exercises:** ${plan.primaryFocus.exerciseCount}`);
  lines.push(`- **Reason:** ${plan.primaryFocus.reason}`);
  lines.push("");

  // Secondary Focus
  if (plan.secondaryFocus) {
    lines.push("## Secondary Focus");
    lines.push("");
    lines.push(`- **Category:** ${plan.secondaryFocus.category}`);
    if (plan.secondaryFocus.difficulty) {
      lines.push(`- **Difficulty:** ${plan.secondaryFocus.difficulty}`);
    }
    lines.push(`- **Exercises:** ${plan.secondaryFocus.exerciseCount}`);
    lines.push(`- **Reason:** ${plan.secondaryFocus.reason}`);
    lines.push("");
  }

  // Review Focus
  if (plan.reviewFocus) {
    lines.push("## Review Focus");
    lines.push("");
    lines.push(`- **Urgent:** ${plan.reviewFocus.urgentCount} exercises`);
    if (plan.reviewFocus.topCategories.length > 0) {
      lines.push(
        `- **Top categories:** ${plan.reviewFocus.topCategories.join(", ")}`
      );
    }
    lines.push(`- **Reason:** ${plan.reviewFocus.reason}`);
    lines.push("");
  }

  // Exercise Composition
  if (plan.exerciseComposition.length > 0) {
    lines.push("## Exercise Composition");
    lines.push("");
    lines.push("| Source | Count | Description |");
    lines.push("|--------|------:|-------------|");
    for (const ec of plan.exerciseComposition) {
      lines.push(`| ${ec.source} | ${ec.count} | ${ec.description} |`);
    }
    lines.push("");
  }

  // Rationale
  lines.push("## Rationale");
  lines.push("");
  lines.push(plan.rationale);
  lines.push("");

  return lines.join("\n");
}
