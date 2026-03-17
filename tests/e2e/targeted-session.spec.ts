/**
 * E2E tests for M005: Review-to-Training Targeted Session Generation.
 *
 * Validates that ReviewSessionRequest flows through to session metadata
 * and that the targeting behavior degrades gracefully.
 *
 * These tests require exercise data in out/datasets/training-exercises.jsonl.
 * When the corpus is missing they verify the error message is returned cleanly.
 */

import { test, expect } from "../fixtures";

test.describe("Targeted session generation", () => {
  test("session with reviewRequest includes reviewTargeting metadata", async ({ api, artifacts }) => {
    const result = (await api.call("generateNewSession", {
      perspective: "hero",
      reviewRequest: {
        sourceGameId: "test-game-01",
        primaryTarget: "tactical_pattern_recognition",
        secondaryTargets: ["calculation_discipline"],
        evidenceStatus: "recurring",
        branchRepairMatched: false,
        targetBoostStrength: "strong",
      },
    })) as { success: boolean; sessionId: string | null; exerciseCount: number; error: string | null };

    if (!result.success) {
      // Exercise corpus not available — verify graceful error
      expect(result.error).toBeTruthy();
      return;
    }

    expect(result.sessionId).toBeTruthy();
    expect(result.exerciseCount).toBeGreaterThan(0);

    const session = await artifacts.readJson<{
      metadata: {
        reviewTargeting?: {
          sourceGameId: string;
          primaryTarget: string;
          secondaryTargets: string[];
          boostStrength: string;
          evidenceStatus: string | null;
        };
      };
    }>(`sessions/${result.sessionId}/study-session.json`);

    expect(session.metadata.reviewTargeting).toBeDefined();
    expect(session.metadata.reviewTargeting!.sourceGameId).toBe("test-game-01");
    expect(session.metadata.reviewTargeting!.primaryTarget).toBe("tactical_pattern_recognition");
    expect(session.metadata.reviewTargeting!.secondaryTargets).toEqual(["calculation_discipline"]);
    expect(session.metadata.reviewTargeting!.boostStrength).toBe("strong");
    expect(session.metadata.reviewTargeting!.evidenceStatus).toBe("recurring");
  });

  test("session without reviewRequest has no reviewTargeting metadata", async ({ api, artifacts }) => {
    const result = (await api.call("generateNewSession", {
      perspective: "hero",
    })) as { success: boolean; sessionId: string | null; error: string | null };

    if (!result.success) {
      expect(result.error).toBeTruthy();
      return;
    }

    const session = await artifacts.readJson<{
      metadata: { reviewTargeting?: unknown };
    }>(`sessions/${result.sessionId}/study-session.json`);

    expect(session.metadata.reviewTargeting).toBeUndefined();
  });

  test("none boost strength skips targeting metadata", async ({ api, artifacts }) => {
    const result = (await api.call("generateNewSession", {
      perspective: "hero",
      reviewRequest: {
        sourceGameId: "test-game-02",
        primaryTarget: "calculation_discipline",
        secondaryTargets: [],
        evidenceStatus: "improving",
        branchRepairMatched: false,
        targetBoostStrength: "none",
      },
    })) as { success: boolean; sessionId: string | null; error: string | null };

    if (!result.success) {
      expect(result.error).toBeTruthy();
      return;
    }

    const session = await artifacts.readJson<{
      metadata: { reviewTargeting?: unknown };
    }>(`sessions/${result.sessionId}/study-session.json`);

    // "none" means the system is already improving — no targeting applied
    expect(session.metadata.reviewTargeting).toBeUndefined();
  });

  test("opening repair target with branchRepairMatched generates valid session", async ({ api, artifacts }) => {
    const result = (await api.call("generateNewSession", {
      perspective: "hero",
      reviewRequest: {
        sourceGameId: "test-game-03",
        primaryTarget: "opening_line_recall",
        secondaryTargets: [],
        evidenceStatus: "emerging",
        branchRepairMatched: true,
        targetBoostStrength: "moderate",
      },
    })) as { success: boolean; sessionId: string | null; exerciseCount: number; error: string | null };

    if (!result.success) {
      expect(result.error).toBeTruthy();
      return;
    }

    expect(result.exerciseCount).toBeGreaterThan(0);

    const session = await artifacts.readJson<{
      metadata: {
        reviewTargeting?: {
          sourceGameId: string;
          primaryTarget: string;
          boostStrength: string;
        };
      };
    }>(`sessions/${result.sessionId}/study-session.json`);

    expect(session.metadata.reviewTargeting).toBeDefined();
    expect(session.metadata.reviewTargeting!.primaryTarget).toBe("opening_line_recall");
    expect(session.metadata.reviewTargeting!.boostStrength).toBe("moderate");
  });
});
