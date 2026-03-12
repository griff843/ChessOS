import type { ObjectiveCoachingState } from "./types";

export function formatObjectiveCoachingMd(coaching: ObjectiveCoachingState): string {
  const failed = coaching.failedSignals.length > 0
    ? coaching.failedSignals.map((signal) => `- ${signal.label}: ${signal.explanation}`).join("\n")
    : "- None";
  const supporting = coaching.supportingSignals.length > 0
    ? coaching.supportingSignals.map((signal) => `- ${signal.label}: ${signal.explanation}`).join("\n")
    : "- None";
  const compareWindows = coaching.compareWindows.length > 0
    ? coaching.compareWindows.map((window) => `- ${window.summary}`).join("\n")
    : "- No compare-window evidence yet";

  return [
    `# Objective Coaching`,
    "",
    `- Objective: ${coaching.currentObjective}`,
    `- Phase: ${coaching.objectivePhase}`,
    `- Status: ${coaching.objectiveStatus}`,
    `- Verdict: ${coaching.progressVerdict}`,
    `- Lifecycle Decision: ${coaching.lifecycleDecision}`,
    `- Intervention: ${coaching.interventionType}`,
    `- Strength: ${coaching.recommendationStrength}`,
    `- Suggested Action: ${coaching.suggestedObjectiveAction}`,
    "",
    `## Headline`,
    coaching.headline,
    "",
    `## Explanation`,
    coaching.explanation,
    "",
    `## Failed Signals`,
    failed,
    "",
    `## Supporting Signals`,
    supporting,
    "",
    `## Compare Windows`,
    compareWindows,
    "",
    `## Next Session`,
    `- Mix: ${JSON.stringify(coaching.suggestedSessionMixAdjustment.recommendedMix)}`,
    `- Difficulty: ${JSON.stringify(coaching.suggestedDifficultyAdjustment.recommendedDistribution)}`,
    `- Review: ${coaching.suggestedReviewAdjustment.action} to ${(coaching.suggestedReviewAdjustment.targetReviewShare * 100).toFixed(0)}%`,
    `- Summary: ${coaching.nextSessionAdjustmentSummary}`,
    "",
  ].join("\n");
}
