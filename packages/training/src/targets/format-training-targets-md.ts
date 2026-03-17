/**
 * Format training targets as a human-readable Markdown report.
 */

import type { TrainingTargetsResult } from "./types";

/**
 * Generate a Markdown summary of training targets for a game.
 */
export function formatTrainingTargetsMd(
  result: TrainingTargetsResult
): string {
  const fmtPct = (v: number) => (v * 100).toFixed(1) + "%";
  const fmtScore = (v: number) => v.toFixed(3);

  let md = `# Training Targets — ${result.gameId}\n\n`;
  md += `| Field | Value |\n`;
  md += `|-------|-------|\n`;
  md += `| Game | ${result.gameId} |\n`;
  md += `| Total positions | ${result.totalPositions} |\n`;
  md += `| Candidates | ${result.totalCandidates} |\n`;
  md += `| Top N | ${result.topN} |\n`;
  md += `| Selected | ${result.targets.length} |\n`;
  md += `| Production safe | ${result.scoringConfig.productionSafe ? "yes" : "no"} |\n`;
  md += `| Excluded features | ${result.scoringConfig.excludedFeatures.join(", ") || "none"} |\n`;
  md += `| Generated at | ${result.generatedAt} |\n\n`;

  if (result.targets.length === 0) {
    md += `_No training targets found for this game._\n`;
    return md;
  }

  // Summary table
  md += `## Target Summary\n\n`;
  md += `| Rank | Ply | Move | Mover | Phase | Type | Priority | Risk | Label |\n`;
  md += `|------|-----|------|-------|-------|------|----------|------|-------|\n`;

  for (const t of result.targets) {
    md += `| ${t.rank} | ${t.ply} | ${t.moveSan} | ${t.mover} | ${t.phase} | ${t.targetType} | ${fmtScore(t.targetPriority)} | ${fmtPct(t.predictedRisk)} | ${t.actualLabel} |\n`;
  }

  // Type breakdown
  const typeCounts = new Map<string, number>();
  for (const t of result.targets) {
    typeCounts.set(t.targetType, (typeCounts.get(t.targetType) ?? 0) + 1);
  }
  md += `\n## Type Breakdown\n\n`;
  md += `| Type | Count |\n`;
  md += `|------|-------|\n`;
  for (const [type, count] of typeCounts) {
    md += `| ${type} | ${count} |\n`;
  }

  // Position details
  md += `\n## Target Details\n`;

  for (const t of result.targets) {
    md += `\n### #${t.rank} — Ply ${t.ply}: ${t.moveSan} (${t.mover})\n\n`;
    md += `| Field | Value |\n`;
    md += `|-------|-------|\n`;
    md += `| FEN | \`${t.fen}\` |\n`;
    md += `| Eval | ${t.evalCp} cp |\n`;
    md += `| Phase | ${t.phase} |\n`;
    md += `| Target type | ${t.targetType} |\n`;
    md += `| Actual label | ${t.actualLabel} |\n`;
    md += `| Predicted risk | ${fmtPct(t.predictedRisk)} |\n`;
    md += `| Criticality score | ${fmtScore(t.criticalityScore)} |\n`;
    md += `| Target priority | ${fmtScore(t.targetPriority)} |\n\n`;

    md += `Priority breakdown:\n\n`;
    md += `| Factor | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Criticality (×0.40) | ${fmtScore(t.priorityFactors.criticalityComponent)} |\n`;
    md += `| Label severity (×0.35) | ${fmtScore(t.priorityFactors.labelSeverityComponent)} |\n`;
    md += `| Eval tension (×0.15) | ${fmtScore(t.priorityFactors.tensionComponent)} |\n`;
    md += `| Phase weight (×0.10) | ${fmtScore(t.priorityFactors.phaseComponent)} |\n`;
  }

  return md;
}
