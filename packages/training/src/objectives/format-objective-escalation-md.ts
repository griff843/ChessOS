import type { ObjectiveEscalationState } from "./types";

function title(value: string): string {
  return value.replace(/_/g, " ");
}

export function formatObjectiveEscalationMd(escalation: ObjectiveEscalationState): string {
  const lines = [
    "# Objective Escalation",
    "",
    `- Generated At: ${escalation.generatedAt}`,
    `- Current Objective: ${title(escalation.currentObjective)}`,
    `- Current Phase: ${title(escalation.currentPhase)}`,
    `- Escalation Verdict: ${title(escalation.escalationVerdict)}`,
    `- Escalation Strength: ${title(escalation.escalationStrength)}`,
    `- Recommended Action: ${title(escalation.recommendedObjectiveAction)}`,
    `- Recommended Next Objective: ${escalation.recommendedNextObjective ? title(escalation.recommendedNextObjective) : "none"}`,
    `- Oscillation Penalty: ${escalation.oscillationPenalty}`,
    "",
    "## Reason",
    "",
    escalation.escalationReason,
    "",
    "## Supporting Signals",
    "",
    ...escalation.memorySupportSignals.map((signal) => `- ${signal.label}: ${signal.summary}`),
    "",
    "## Repeated Failure Evidence",
    "",
    ...(escalation.repeatedFailureSignals.length > 0 ? escalation.repeatedFailureSignals.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Repeated Success Evidence",
    "",
    ...(escalation.repeatedSuccessSignals.length > 0 ? escalation.repeatedSuccessSignals.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Phase Change",
    "",
    escalation.recommendedObjectivePhaseChange
      ? `- ${title(escalation.recommendedObjectivePhaseChange.fromPhase)} -> ${title(escalation.recommendedObjectivePhaseChange.toPhase ?? "none")}: ${escalation.recommendedObjectivePhaseChange.reason}`
      : "- none",
    "",
    "## Explanation",
    "",
    escalation.explanation,
    "",
  ];

  return lines.join("\n");
}
