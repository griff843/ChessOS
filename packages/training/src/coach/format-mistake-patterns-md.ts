/**
 * Format mistake patterns as a markdown artifact.
 *
 * Pure function: no I/O.
 */

import type { MistakePatterns } from "./types.js";

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

function fmtPctOrNa(n: number | null): string {
  return n !== null ? fmtPct(n) : "—";
}

function fmtCpOrNa(cp: number | null): string {
  return cp !== null ? `${cp}cp` : "—";
}

function severityBadge(s: string): string {
  switch (s) {
    case "critical":
      return "**CRITICAL**";
    case "moderate":
      return "MODERATE";
    default:
      return "minor";
  }
}

/**
 * Format mistake patterns as markdown.
 */
export function formatMistakePatternsMd(patterns: MistakePatterns): string {
  const lines: string[] = [];

  lines.push("# Mistake Patterns");
  lines.push("");
  lines.push(`Generated: ${patterns.generatedAt}`);
  lines.push("");

  // Category Patterns
  if (patterns.categoryPatterns.length > 0) {
    lines.push("## Category Patterns");
    lines.push("");
    lines.push(
      "| Severity | Category | Miss Rate | Recent | Trend | Avg Loss | Exercises | Incorrect | Overdue |"
    );
    lines.push(
      "|----------|----------|-----------|--------|-------|----------|-----------|-----------|---------|"
    );
    for (const p of patterns.categoryPatterns) {
      lines.push(
        `| ${severityBadge(p.severity)} | ${p.category} | ${fmtPct(p.lifetimeMissRate)} | ${fmtPctOrNa(p.recentMissRate)} | ${p.trendDirection} | ${fmtCpOrNa(p.avgEvalLossCp)} | ${p.exerciseCount} | ${p.incorrectCount} | ${p.overdueCount} |`
      );
    }
    lines.push("");

    // Descriptions
    lines.push("### Details");
    lines.push("");
    for (const p of patterns.categoryPatterns) {
      if (p.severity !== "minor") {
        lines.push(`- ${p.description}`);
      }
    }
    lines.push("");
  }

  // Difficulty Patterns
  if (patterns.difficultyPatterns.length > 0) {
    lines.push("## Difficulty Patterns");
    lines.push("");
    lines.push(
      "| Difficulty | Miss Rate | Recent | Trend | Exercises | Incorrect |"
    );
    lines.push(
      "|------------|-----------|--------|-------|-----------|-----------|"
    );
    for (const d of patterns.difficultyPatterns) {
      lines.push(
        `| ${d.difficulty} | ${fmtPct(d.lifetimeMissRate)} | ${fmtPctOrNa(d.recentMissRate)} | ${d.trendDirection} | ${d.exerciseCount} | ${d.incorrectCount} |`
      );
    }
    lines.push("");
  }

  // Blunder Profile
  const bp = patterns.blunderProfile;
  if (bp.totalBlunders > 0 || bp.totalMistakes > 0) {
    lines.push("## Blunder Profile");
    lines.push("");
    lines.push("| Metric | Value |");
    lines.push("|--------|-------|");
    lines.push(`| Blunders | ${bp.totalBlunders} |`);
    lines.push(`| Mistakes | ${bp.totalMistakes} |`);
    lines.push(`| Avg eval loss | ${fmtCpOrNa(bp.avgEvalLossCp)} |`);
    if (bp.worstCategories.length > 0) {
      lines.push(
        `| Worst categories | ${bp.worstCategories.join(", ")} |`
      );
    }
    lines.push("");
  }

  // Recurring Weaknesses
  if (patterns.recurringWeaknesses.length > 0) {
    lines.push("## Recurring Weaknesses");
    lines.push("");
    lines.push(
      "Categories with both high miss rate and worsening trend:"
    );
    lines.push("");
    for (const cat of patterns.recurringWeaknesses) {
      lines.push(`- **${cat}**`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
