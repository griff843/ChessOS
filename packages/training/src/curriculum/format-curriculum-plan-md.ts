/**
 * Format the curriculum plan as a markdown artifact.
 *
 * Pure function: no I/O.
 */

import type { CurriculumPlan } from "./types.js";

function themeLabel(theme: string): string {
  return theme.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format the curriculum plan as markdown.
 */
export function formatCurriculumPlanMd(plan: CurriculumPlan): string {
  const lines: string[] = [];

  lines.push("# Curriculum Plan");
  lines.push("");
  lines.push(`Generated: ${plan.generatedAt}`);
  lines.push("");

  // Overview
  lines.push("## Overview");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Sessions | ${plan.sessionCount} |`);
  lines.push(
    `| Readiness | ${plan.progressionGates.overallReadiness ? "Ready" : "Not ready"} |`
  );
  lines.push("");

  // Theme Sequence
  lines.push("## Theme Sequence");
  lines.push("");
  lines.push("| Session | Theme | Trigger | Value | Reason |");
  lines.push("|---------|-------|---------|-------|--------|");
  for (const ta of plan.themeAssignments) {
    const value =
      typeof ta.triggerValue === "number" && ta.triggerValue < 1
        ? (ta.triggerValue * 100).toFixed(1) + "%"
        : String(ta.triggerValue);
    lines.push(
      `| ${ta.sessionIndex + 1} | ${themeLabel(ta.theme)} | ${ta.triggerMetric} | ${value} | ${ta.reason} |`
    );
  }
  lines.push("");

  // Session Summaries
  lines.push("## Session Summaries");
  lines.push("");
  for (const session of plan.sessions) {
    lines.push(`### Session ${session.sessionIndex + 1}: ${themeLabel(session.theme)}`);
    lines.push("");
    lines.push(`- **Primary focus:** ${session.focusCategory}`);
    if (session.secondaryCategory) {
      lines.push(`- **Secondary focus:** ${session.secondaryCategory}`);
    }
    lines.push(
      `- **Difficulty:** ${session.difficultyMix.easy}E / ${session.difficultyMix.medium}M / ${session.difficultyMix.hard}H`
    );
    lines.push(
      `- **Quota:** ${session.exerciseQuota.reviewSlots} review + ${session.exerciseQuota.freshSlots} fresh = ${session.exerciseQuota.total}`
    );
    lines.push("");
  }

  // Overall Rationale
  lines.push("## Rationale");
  lines.push("");
  lines.push(plan.overallRationale);
  lines.push("");

  return lines.join("\n");
}
