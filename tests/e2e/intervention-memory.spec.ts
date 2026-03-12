import { test, expect } from "../fixtures";

test.describe("Intervention memory", () => {
  test("refreshInsights persists intervention memory artifacts with graceful empty-history handling", async ({ api, artifacts }) => {
    const result = (await api.call("refreshInsights")) as { success: boolean };
    expect(result.success).toBe(true);

    const memory = await artifacts.readJson<{
      episodes: Array<{
        interventionEpisodeId: string;
        interventionType: string;
        compareSnapshot: { summary: string };
        repeatedPatternFlag: boolean;
      }>;
      nextActionRecommendation: { action: string; reason: string };
    }>("objective/intervention-memory.json");

    expect(Array.isArray(memory.episodes)).toBe(true);
    if (memory.episodes.length > 0) {
      expect(memory.episodes[0]?.interventionEpisodeId).toBeTruthy();
      expect(memory.episodes[0]?.interventionType).toBeTruthy();
      expect(memory.episodes[0]?.compareSnapshot.summary).toBeTruthy();
      expect(typeof memory.episodes[0]?.repeatedPatternFlag).toBe("boolean");
    }
    expect(memory.nextActionRecommendation.action).toBeTruthy();
    expect(memory.nextActionRecommendation.reason).toBeTruthy();
  });

  test("generated sessions carry memory-informed intervention metadata", async ({ api, artifacts }) => {
    const result = (await api.call("generateNewSession")) as {
      success: boolean;
      sessionId: string | null;
    };
    expect(result.success).toBe(true);

    const session = await artifacts.readJson<{
      metadata: {
        interventionEpisodeId?: string;
        interventionRecommendedAction?: string;
        interventionRecommendedType?: string | null;
        interventionRepeatedPatternFlag?: boolean;
        interventionCompareSummary?: string;
        objectiveSignalSnapshot?: { readinessState?: string };
      };
    }>(`sessions/${result.sessionId!}/study-session.json`);

    expect(session.metadata.interventionEpisodeId).toBeTruthy();
    expect(session.metadata.interventionRecommendedAction).toBeTruthy();
    expect(session.metadata.interventionRecommendedType).toBeTruthy();
    expect(typeof session.metadata.interventionRepeatedPatternFlag).toBe("boolean");
    if (session.metadata.interventionCompareSummary !== undefined) {
      expect(session.metadata.interventionCompareSummary).toBeTruthy();
    }
    expect(session.metadata.objectiveSignalSnapshot?.readinessState).toBeTruthy();
  });
});
