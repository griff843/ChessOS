/**
 * Format critical positions as a human-readable Markdown report.
 */

import type { CriticalPositionsResult } from "./types";

/**
 * Generate a Markdown summary of the most critical positions in a game.
 */
export function formatCriticalPositionsMd(
  result: CriticalPositionsResult
): string {
  const fmtPct = (v: number) => (v * 100).toFixed(1) + "%";
  const fmtScore = (v: number) => v.toFixed(3);

  let md = `# Critical Positions — ${result.gameId}\n\n`;
  md += `| Field | Value |\n`;
  md += `|-------|-------|\n`;
  md += `| Game | ${result.gameId} |\n`;
  md += `| Total positions | ${result.totalPositions} |\n`;
  md += `| Top N | ${result.topN} |\n`;
  md += `| Scored at | ${result.scoredAt} |\n\n`;

  md += `## Top ${result.positions.length} Critical Positions\n\n`;
  md += `| Rank | Ply | Move | Mover | Phase | Eval (cp) | Risk | Criticality | Label |\n`;
  md += `|------|-----|------|-------|-------|-----------|------|-------------|-------|\n`;

  for (const pos of result.positions) {
    md += `| ${pos.rank} | ${pos.ply} | ${pos.moveSan} | ${pos.mover} | ${pos.phase} | ${pos.evalCp} | ${fmtPct(pos.predictedRisk)} | ${fmtScore(pos.criticalityScore)} | ${pos.actualLabel} |\n`;
  }

  md += `\n## Position Details\n`;

  for (const pos of result.positions) {
    md += `\n### #${pos.rank} — Ply ${pos.ply}: ${pos.moveSan} (${pos.mover})\n\n`;
    md += `| Field | Value |\n`;
    md += `|-------|-------|\n`;
    md += `| FEN | \`${pos.fen}\` |\n`;
    md += `| Eval | ${pos.evalCp} cp |\n`;
    md += `| Phase | ${pos.phase} |\n`;
    md += `| Predicted risk | ${fmtPct(pos.predictedRisk)} |\n`;
    md += `| Predicted class | ${pos.predictedClass === 1 ? "mistake_or_worse" : "not_mistake"} |\n`;
    md += `| Actual label | ${pos.actualLabel} |\n`;
    md += `| Criticality score | ${fmtScore(pos.criticalityScore)} |\n\n`;

    md += `Factor breakdown:\n\n`;
    md += `| Factor | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Risk (×0.50) | ${fmtScore(pos.factors.riskComponent)} |\n`;
    md += `| Tension (×0.20) | ${fmtScore(pos.factors.tensionComponent)} |\n`;
    md += `| Phase (×0.15) | ${fmtScore(pos.factors.phaseComponent)} |\n`;
    md += `| Swing (×0.15) | ${fmtScore(pos.factors.swingComponent)} |\n`;
  }

  return md;
}
