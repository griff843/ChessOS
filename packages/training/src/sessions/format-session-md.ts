/**
 * Format a study session as a human-readable Markdown report.
 */

import type { StudySession } from "./types";

export function formatSessionMd(session: StudySession): string {
  const fmtPct = (v: number) => (v * 100).toFixed(1) + "%";
  const fmtScore = (v: number) => v.toFixed(3);

  let md = `# Study Session — ${session.sessionId}\n\n`;
  md += `| Field | Value |\n`;
  md += `|-------|-------|\n`;
  md += `| Session ID | ${session.sessionId} |\n`;
  md += `| Exercises | ${session.exerciseCount} |\n`;
  md += `| Source games | ${session.metadata.sourceGames.length} |\n`;
  md += `| Created at | ${session.createdAt} |\n\n`;

  // Difficulty distribution
  md += `## Difficulty Distribution\n\n`;
  md += `| Difficulty | Count |\n`;
  md += `|------------|-------|\n`;
  for (const [diff, count] of Object.entries(
    session.metadata.difficultyDistribution
  )) {
    md += `| ${diff} | ${count} |\n`;
  }

  // Category distribution
  md += `\n## Category Distribution\n\n`;
  md += `| Category | Count |\n`;
  md += `|----------|-------|\n`;
  for (const [cat, count] of Object.entries(
    session.metadata.categoryDistribution
  )) {
    md += `| ${cat} | ${count} |\n`;
  }

  // Exercise list
  md += `\n## Exercises\n`;

  for (let i = 0; i < session.exercises.length; i++) {
    const ex = session.exercises[i];
    const best = ex.bestMoveSan ?? "—";

    md += `\n### #${i + 1} — ${ex.gameId} ply ${ex.ply}\n\n`;
    md += `| Field | Value |\n`;
    md += `|-------|-------|\n`;
    md += `| FEN | \`${ex.fen}\` |\n`;
    md += `| Side to move | ${ex.sideToMove} |\n`;
    md += `| Phase | ${ex.phase} |\n`;
    md += `| Played move | ${ex.playedMoveSan} |\n`;
    md += `| Best move | ${best} |\n`;
    md += `| Category | ${ex.lessonCategory} |\n`;
    md += `| Difficulty | ${ex.difficultyEstimate} (${fmtScore(ex.difficultyScore)}) |\n`;
    md += `| Predicted risk | ${fmtPct(ex.predictedRisk)} |\n`;
    md += `| Target priority | ${fmtScore(ex.targetPriority)} |\n`;
  }

  return md;
}
