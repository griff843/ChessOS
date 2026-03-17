/**
 * Format the trend report as a markdown artifact.
 *
 * Pure function: no I/O.
 */

import type { TrendReport } from "./types.js";

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

function fmtPctOrNa(n: number | null): string {
  return n !== null ? fmtPct(n) : "—";
}

function trendArrow(direction: string): string {
  switch (direction) {
    case "improving":
      return "^ improving";
    case "worsening":
      return "v worsening";
    case "stable":
      return "= stable";
    default:
      return "? insufficient";
  }
}

function fmtCpOrNa(cp: number | null): string {
  if (cp === null) return "—";
  return `${Math.round(cp)}cp`;
}

/**
 * Format the trend report as markdown.
 */
export function formatTrendReportMd(report: TrendReport): string {
  const lines: string[] = [];

  lines.push("# Trend Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");

  // Overview
  lines.push("## Overview");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Overall accuracy | ${fmtPct(report.overallAccuracy)} |`);
  lines.push(`| Recent window size | ${report.recentWindowSize} attempts per bucket |`);
  lines.push("");

  // Category Trends
  if (report.categoryTrends.length > 0) {
    lines.push("## Category Trends");
    lines.push("");
    lines.push(
      "| Category | Lifetime | Recent | Trend | Seen | Recent | Weight | Due |"
    );
    lines.push(
      "|----------|----------|--------|-------|------|--------|--------|-----|"
    );
    for (const t of report.categoryTrends) {
      lines.push(
        `| ${t.key} | ${fmtPct(t.lifetimeAccuracy)} | ${fmtPctOrNa(t.recentAccuracy)} | ${trendArrow(t.trendDirection)} | ${t.lifetimeSeen} | ${t.recentSeen} | ${t.adaptiveWeight.toFixed(2)} | ${t.dueCount} |`
      );
    }
    lines.push("");
  }

  // Difficulty Trends
  if (report.difficultyTrends.length > 0) {
    lines.push("## Difficulty Trends");
    lines.push("");
    lines.push(
      "| Difficulty | Lifetime | Recent | Trend | Seen | Recent | Weight | Due |"
    );
    lines.push(
      "|------------|----------|--------|-------|------|--------|--------|-----|"
    );
    for (const t of report.difficultyTrends) {
      lines.push(
        `| ${t.key} | ${fmtPct(t.lifetimeAccuracy)} | ${fmtPctOrNa(t.recentAccuracy)} | ${trendArrow(t.trendDirection)} | ${t.lifetimeSeen} | ${t.recentSeen} | ${t.adaptiveWeight.toFixed(2)} | ${t.dueCount} |`
      );
    }
    lines.push("");
  }

  // Session Timeline
  if (report.sessionTimeline.length > 0) {
    lines.push("## Session Timeline");
    lines.push("");
    lines.push("| # | Session | Completed | Exercises | Correct | Accuracy |");
    lines.push("|---|---------|-----------|-----------|---------|----------|");
    for (let i = 0; i < report.sessionTimeline.length; i++) {
      const s = report.sessionTimeline[i];
      const date = s.completedAt.slice(0, 10);
      lines.push(
        `| ${i + 1} | ${s.sessionId} | ${date} | ${s.exerciseCount} | ${s.correctCount} | ${fmtPct(s.accuracy)} |`
      );
    }
    lines.push("");
  }

  // Eval Loss Trend
  if (report.evalLossTrend && report.evalLossTrend.length > 0) {
    lines.push("## Eval Loss Trend");
    lines.push("");
    lines.push("| # | Session | Completed | Avg Loss | Median Loss |");
    lines.push("|---|---------|-----------|----------|-------------|");
    for (let i = 0; i < report.evalLossTrend.length; i++) {
      const e = report.evalLossTrend[i];
      const date = e.completedAt.slice(0, 10);
      lines.push(
        `| ${i + 1} | ${e.sessionId} | ${date} | ${fmtCpOrNa(e.avgEvalLossCp)} | ${fmtCpOrNa(e.medianEvalLossCp)} |`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
