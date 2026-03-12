/**
 * Format progression gates as a markdown artifact.
 *
 * Pure function: no I/O.
 */

import type { ProgressionGates } from "./types.js";

function fmtValue(value: number, gateType: string): string {
  switch (gateType) {
    case "accuracy":
    case "mastery":
      return (value * 100).toFixed(1) + "%";
    case "eval_loss":
      return value.toFixed(0) + "cp";
    default:
      return String(value);
  }
}

function fmtThreshold(threshold: number, gateType: string): string {
  switch (gateType) {
    case "accuracy":
    case "mastery":
      return ">= " + (threshold * 100).toFixed(0) + "%";
    case "review_load":
      return "< " + threshold;
    case "trend":
      return "= " + threshold;
    case "eval_loss":
      return "< " + threshold + "cp";
    default:
      return String(threshold);
  }
}

/**
 * Format progression gates as markdown.
 */
export function formatProgressionGatesMd(gates: ProgressionGates): string {
  const lines: string[] = [];

  lines.push("# Progression Gates");
  lines.push("");
  lines.push(`Generated: ${gates.generatedAt}`);
  lines.push("");

  // Readiness Summary
  lines.push("## Readiness Summary");
  lines.push("");
  const badge = gates.overallReadiness ? "READY" : "NOT READY";
  lines.push(`> **${badge}**: ${gates.readinessSummary}`);
  lines.push("");

  // Gates Table
  lines.push("## Gates");
  lines.push("");
  lines.push("| Gate | Type | Current | Threshold | Status |");
  lines.push("|------|------|---------|-----------|--------|");
  for (const gate of gates.gates) {
    const criterion = gate.criteria[0];
    if (!criterion) continue;
    const status = gate.allPassed ? "PASS" : "FAIL";
    lines.push(
      `| ${gate.gateName} | ${gate.gateType} | ${fmtValue(criterion.currentValue, gate.gateType)} | ${fmtThreshold(criterion.threshold, gate.gateType)} | ${status} |`
    );
  }
  lines.push("");

  // Recommendations
  lines.push("## Recommendations");
  lines.push("");
  for (const gate of gates.gates) {
    const prefix = gate.allPassed ? "[+]" : "[-]";
    lines.push(`- ${prefix} **${gate.gateName}**: ${gate.recommendation}`);
  }
  lines.push("");

  return lines.join("\n");
}
