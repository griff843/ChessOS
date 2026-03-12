/**
 * Format session roadmaps as a markdown artifact.
 *
 * Pure function: no I/O.
 */

import type { SessionRoadmap } from "./types.js";

function themeLabel(theme: string): string {
  return theme.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format session roadmaps as markdown.
 */
export function formatSessionRoadmapMd(sessions: SessionRoadmap[]): string {
  const lines: string[] = [];

  lines.push("# Session Roadmaps");
  lines.push("");
  lines.push(`${sessions.length} session${sessions.length === 1 ? "" : "s"} planned`);
  lines.push("");

  for (const session of sessions) {
    lines.push(
      `## Session ${session.sessionIndex + 1}: ${themeLabel(session.theme)}`
    );
    lines.push("");

    // Focus
    lines.push("### Focus");
    lines.push("");
    lines.push(`- **Primary:** ${session.focusCategory}`);
    if (session.secondaryCategory) {
      lines.push(`- **Secondary:** ${session.secondaryCategory}`);
    }
    lines.push("");

    // Difficulty Mix
    lines.push("### Difficulty Mix");
    lines.push("");
    lines.push("| Difficulty | Count |");
    lines.push("|------------|------:|");
    lines.push(`| Easy | ${session.difficultyMix.easy} |`);
    lines.push(`| Medium | ${session.difficultyMix.medium} |`);
    lines.push(`| Hard | ${session.difficultyMix.hard} |`);
    lines.push("");

    // Exercise Quota
    lines.push("### Exercise Quota");
    lines.push("");
    lines.push("| Source | Count |");
    lines.push("|--------|------:|");
    lines.push(`| Review | ${session.exerciseQuota.reviewSlots} |`);
    lines.push(`| Fresh | ${session.exerciseQuota.freshSlots} |`);
    lines.push(`| **Total** | **${session.exerciseQuota.total}** |`);
    lines.push("");
    lines.push(`> ${session.exerciseQuota.reason}`);
    lines.push("");

    // Rationale
    lines.push("### Rationale");
    lines.push("");
    lines.push(session.rationale);
    lines.push("");
  }

  return lines.join("\n");
}
