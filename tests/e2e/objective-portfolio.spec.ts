import { test, expect } from "../fixtures";

test.describe("Objective portfolio", () => {
  test("refreshInsights derives portfolio ranking and rotation artifacts", async ({ api, artifacts }) => {
    const refreshed = (await api.call("refreshInsights")) as { success: boolean };
    expect(refreshed.success).toBe(true);

    const portfolio = await artifacts.readJson<{
      activeObjective: string;
      rankedObjectives: Array<{
        objectiveKey: string;
        portfolioPriority: number;
        portfolioRotationWeight: number;
        trainingShare: number;
        portfolioStatus: string;
      }>;
      rotationDecisions: Array<{ objectiveKey: string; action: string; trainingShare: number }>;
      portfolioSummary: string;
    }>("objective/objective-portfolio.json");

    expect(portfolio.activeObjective).toBeTruthy();
    expect(portfolio.rankedObjectives.length).toBeGreaterThan(1);
    expect(portfolio.rotationDecisions.length).toBeGreaterThan(1);
    expect(portfolio.portfolioSummary).toBeTruthy();
    expect(portfolio.rankedObjectives[0].portfolioPriority).toBeGreaterThanOrEqual(portfolio.rankedObjectives[1].portfolioPriority);
  });

  test("generated sessions carry portfolio-informed objective metadata", async ({ api, artifacts }) => {
    const generated = (await api.call("generateNewSession")) as { success: boolean; sessionId: string };
    expect(generated.success).toBe(true);

    const session = await artifacts.readJson<{
      metadata: {
        objectivePortfolioStatus?: string;
        objectivePortfolioPriority?: number;
        objectivePortfolioRotationWeight?: number;
        objectiveTrainingShare?: number;
        objectivePortfolioRank?: number;
      };
    }>(`sessions/${generated.sessionId}/study-session.json`);

    expect(session.metadata.objectivePortfolioStatus).toBeTruthy();
    expect(typeof session.metadata.objectivePortfolioPriority).toBe("number");
    expect(typeof session.metadata.objectivePortfolioRotationWeight).toBe("number");
    expect(typeof session.metadata.objectiveTrainingShare).toBe("number");
    expect(typeof session.metadata.objectivePortfolioRank).toBe("number");
  });
});
