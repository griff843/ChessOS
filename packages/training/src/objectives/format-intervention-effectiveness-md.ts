import type { InterventionEffectivenessState } from "./types";

export function formatInterventionEffectivenessMd(effectiveness: InterventionEffectivenessState): string {
  const changed = effectiveness.changedSignals.length > 0
    ? effectiveness.changedSignals.map((signal) => `- ${signal.label}: ${signal.explanation}`).join("\n")
    : "- None";
  const unchanged = effectiveness.unchangedSignals.length > 0
    ? effectiveness.unchangedSignals.map((signal) => `- ${signal.label}: ${signal.explanation}`).join("\n")
    : "- None";
  const worsened = effectiveness.worsenedSignals.length > 0
    ? effectiveness.worsenedSignals.map((signal) => `- ${signal.label}: ${signal.explanation}`).join("\n")
    : "- None";
  const compare = effectiveness.compareWindows.length > 0
    ? effectiveness.compareWindows.map((window) => `- ${window.summary}`).join("\n")
    : "- No compare-window evidence yet";

  return [
    "# Intervention Effectiveness",
    "",
    `- Objective: ${effectiveness.currentObjective}`,
    `- Prior Intervention: ${effectiveness.priorInterventionType ?? "none"}`,
    `- Outcome: ${effectiveness.interventionOutcome}`,
    `- Strength: ${effectiveness.outcomeStrength}`,
    `- Recommended Action: ${effectiveness.recommendedAction}`,
    `- Recommended Next Intervention: ${effectiveness.recommendedNextIntervention ?? "none"}`,
    "",
    "## Headline",
    effectiveness.narrativeSummaryData.headline,
    "",
    "## Summary",
    effectiveness.narrativeSummaryData.summary,
    "",
    "## Improved",
    changed,
    "",
    "## Unchanged",
    unchanged,
    "",
    "## Worsened",
    worsened,
    "",
    "## Compare Windows",
    compare,
    "",
    "## Next Step",
    effectiveness.narrativeSummaryData.nextStep,
    "",
  ].join("\n");
}
