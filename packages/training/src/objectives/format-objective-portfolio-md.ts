import type { ObjectivePortfolioState } from "./types";

function title(value: string): string {
  return value.replace(/_/g, " ");
}

export function formatObjectivePortfolioMd(portfolio: ObjectivePortfolioState): string {
  const lines = [
    "# Objective Portfolio",
    "",
    `- Generated At: ${portfolio.generatedAt}`,
    `- Active Objective: ${title(portfolio.activeObjective)}`,
    `- Summary: ${portfolio.portfolioSummary}`,
    "",
    "## Ranked Objectives",
    "",
    ...portfolio.rankedObjectives.map((entry, index) =>
      `- ${index + 1}. ${title(entry.objectiveKey)} | priority ${entry.portfolioPriority.toFixed(2)} | share ${entry.trainingShare.toFixed(2)} | status ${title(entry.portfolioStatus)}`
    ),
    "",
    "## Rotation Decisions",
    "",
    ...portfolio.rotationDecisions.map((decision) =>
      `- ${title(decision.objectiveKey)}: ${title(decision.action)} at share ${decision.trainingShare.toFixed(2)}. ${decision.reason}`
    ),
    "",
  ];

  return lines.join("\n");
}
