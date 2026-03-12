import { test, expect } from "../fixtures";

test.describe("Objective escalation", () => {
  test("refreshInsights derives escalation artifacts with repeatable evidence", async ({ api, artifacts }) => {
    const refreshed = (await api.call("refreshInsights")) as { success: boolean };
    expect(refreshed.success).toBe(true);

    const escalation = await artifacts.readJson<{
      currentObjective: string;
      currentPhase: string;
      escalationVerdict: string;
      escalationReason: string;
      escalationStrength: string;
      memorySupportSignals: Array<{ key: string; support: string }>;
      repeatedFailureSignals: string[];
      repeatedSuccessSignals: string[];
      oscillationPenalty: number;
      recommendedObjectiveAction: string;
      explanation: string;
    }>("objective/objective-escalation.json");

    expect(escalation.currentObjective).toBeTruthy();
    expect(escalation.currentPhase).toBeTruthy();
    expect(escalation.escalationVerdict).toBeTruthy();
    expect(escalation.escalationReason).toBeTruthy();
    expect(escalation.escalationStrength).toBeTruthy();
    expect(Array.isArray(escalation.memorySupportSignals)).toBe(true);
    expect(escalation.memorySupportSignals.length).toBeGreaterThan(0);
    expect(Array.isArray(escalation.repeatedFailureSignals)).toBe(true);
    expect(Array.isArray(escalation.repeatedSuccessSignals)).toBe(true);
    expect(typeof escalation.oscillationPenalty).toBe("number");
    expect(escalation.recommendedObjectiveAction).toBeTruthy();
    expect(escalation.explanation).toBeTruthy();
  });

  test("generated sessions carry escalation-informed metadata", async ({ api, artifacts }) => {
    const generated = (await api.call("generateNewSession")) as {
      success: boolean;
      sessionId: string;
    };
    expect(generated.success).toBe(true);

    const session = await artifacts.readJson<{
      metadata: {
        objectiveEscalationVerdict?: string;
        objectiveEscalationReason?: string;
        objectiveEscalationStrength?: string;
        objectiveRecommendedAction?: string;
        objectiveEscalationSummary?: string;
      };
    }>(`sessions/${generated.sessionId}/study-session.json`);

    expect(session.metadata.objectiveEscalationVerdict).toBeTruthy();
    expect(session.metadata.objectiveEscalationReason).toBeTruthy();
    expect(session.metadata.objectiveEscalationStrength).toBeTruthy();
    expect(session.metadata.objectiveRecommendedAction).toBeTruthy();
    expect(session.metadata.objectiveEscalationSummary).toBeTruthy();
  });
});
