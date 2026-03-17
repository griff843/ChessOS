/**
 * Format training exercises as a human-readable Markdown report.
 */

import type { TrainingExercisesResult } from "./types";

export function formatExercisesMd(result: TrainingExercisesResult): string {
  const fmtPct = (v: number) => (v * 100).toFixed(1) + "%";
  const fmtScore = (v: number) => v.toFixed(3);
  const fmtCp = (v: number) => (v >= 0 ? "+" : "") + v + " cp";

  let md = `# Training Exercises — ${result.gameId}\n\n`;
  md += `| Field | Value |\n`;
  md += `|-------|-------|\n`;
  md += `| Game | ${result.gameId} |\n`;
  md += `| Total targets | ${result.totalTargets} |\n`;
  md += `| Exercises generated | ${result.exercises.length} |\n`;
  md += `| Generated at | ${result.generatedAt} |\n\n`;

  if (result.exercises.length === 0) {
    md += `_No exercises generated for this game._\n`;
    return md;
  }

  // Summary table
  md += `## Exercise Summary\n\n`;
  md += `| # | Ply | Side | Played | Best | Swing | Lesson | Difficulty |\n`;
  md += `|---|-----|------|--------|------|-------|--------|------------|\n`;

  for (const ex of result.exercises) {
    const best = ex.engineAnswer.bestMoveSan ?? ex.engineAnswer.bestMoveUci ?? "—";
    md += `| ${ex.rank} | ${ex.ply} | ${ex.sideToMove} | ${ex.playedMoveSan} | ${best} | ${ex.engineAnswer.evalSwing} cp | ${ex.explanation.lessonCategory} | ${ex.explanation.difficultyEstimate} |\n`;
  }

  // Category breakdown
  const categoryCounts = new Map<string, number>();
  const difficultyCounts = new Map<string, number>();
  for (const ex of result.exercises) {
    categoryCounts.set(
      ex.explanation.lessonCategory,
      (categoryCounts.get(ex.explanation.lessonCategory) ?? 0) + 1
    );
    difficultyCounts.set(
      ex.explanation.difficultyEstimate,
      (difficultyCounts.get(ex.explanation.difficultyEstimate) ?? 0) + 1
    );
  }

  md += `\n## Lesson Categories\n\n`;
  md += `| Category | Count |\n`;
  md += `|----------|-------|\n`;
  for (const [cat, count] of categoryCounts) {
    md += `| ${cat} | ${count} |\n`;
  }

  md += `\n## Difficulty Distribution\n\n`;
  md += `| Difficulty | Count |\n`;
  md += `|------------|-------|\n`;
  for (const [diff, count] of difficultyCounts) {
    md += `| ${diff} | ${count} |\n`;
  }

  // Detailed exercise cards
  md += `\n## Exercise Details\n`;

  for (const ex of result.exercises) {
    const best = ex.engineAnswer.bestMoveSan ?? ex.engineAnswer.bestMoveUci ?? "—";
    const pvStr = ex.engineAnswer.pv.length > 0 ? ex.engineAnswer.pv.join(" ") : "—";

    md += `\n### #${ex.rank} — Ply ${ex.ply}: ${ex.playedMoveSan} (${ex.sideToMove})\n\n`;

    md += `**Position**\n\n`;
    md += `| Field | Value |\n`;
    md += `|-------|-------|\n`;
    md += `| FEN | \`${ex.fen}\` |\n`;
    md += `| Side to move | ${ex.sideToMove} |\n`;
    md += `| Phase | ${ex.phase} |\n`;
    md += `| Played move | ${ex.playedMoveSan} |\n\n`;

    md += `**Engine Answer**\n\n`;
    md += `| Field | Value |\n`;
    md += `|-------|-------|\n`;
    md += `| Best move | ${best} |\n`;
    md += `| Best move (UCI) | ${ex.engineAnswer.bestMoveUci ?? "—"} |\n`;
    md += `| Eval before | ${fmtCp(ex.engineAnswer.evalBefore)} |\n`;
    md += `| Eval after | ${fmtCp(ex.engineAnswer.evalAfter)} |\n`;
    md += `| Eval swing | ${ex.engineAnswer.evalSwing} cp |\n`;
    md += `| PV | \`${pvStr}\` |\n\n`;

    md += `**Explanation**\n\n`;
    md += `| Field | Value |\n`;
    md += `|-------|-------|\n`;
    md += `| Lesson category | ${ex.explanation.lessonCategory} |\n`;
    md += `| Difficulty | ${ex.explanation.difficultyEstimate} (${fmtScore(ex.explanation.difficultyScore)}) |\n`;
    md += `| Reason codes | ${ex.explanation.reasonCodes.length > 0 ? ex.explanation.reasonCodes.join(", ") : "—"} |\n\n`;

    md += `**Training Metadata**\n\n`;
    md += `| Field | Value |\n`;
    md += `|-------|-------|\n`;
    md += `| Target type | ${ex.targetType} |\n`;
    md += `| Actual label | ${ex.actualLabel} |\n`;
    md += `| Predicted risk | ${fmtPct(ex.predictedRisk)} |\n`;
    md += `| Criticality score | ${fmtScore(ex.criticalityScore)} |\n`;
    md += `| Target priority | ${fmtScore(ex.targetPriority)} |\n`;
  }

  return md;
}
