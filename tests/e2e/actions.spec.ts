import { test, expect } from "../fixtures";

test.describe("Server action tests", () => {
  test("checkReadiness returns correct shape", async ({ api }) => {
    const result = (await api.call("checkReadiness")) as {
      pipelineReady: boolean;
      progressReady: boolean;
      insightsReady: boolean;
      canStudy: boolean;
      canRefreshInsights: boolean;
    };

    expect(result.pipelineReady).toBe(true);
    expect(typeof result.progressReady).toBe("boolean");
    expect(typeof result.insightsReady).toBe("boolean");
    expect(result.canStudy).toBe(result.pipelineReady);
    expect(result.canRefreshInsights).toBe(result.progressReady);
  });

  test("checkArtifactHealth returns 34 artifacts", async ({ api }) => {
    const result = (await api.call("checkArtifactHealth")) as Array<{
      name: string;
      exists: boolean;
    }>;

    expect(result).toHaveLength(34);
    for (const artifact of result) {
      expect(artifact.name).toBeTruthy();
      expect(typeof artifact.exists).toBe("boolean");
    }
  });

  test("generateNewSession succeeds with effectiveness-aware objective metadata", async ({ api, artifacts }) => {
    const result = (await api.call("generateNewSession")) as {
      success: boolean;
      sessionId: string | null;
      exerciseCount: number;
    };

    expect(result.success).toBe(true);
    expect(result.sessionId).toBeTruthy();
    expect(result.exerciseCount).toBe(10);

    const session = await artifacts.readJson<{
      metadata: {
        exerciseTypeMix?: Record<string, number>;
        trainingObjective?: string;
        objectiveReason?: string;
        objectivePhase?: string;
        successSignals?: unknown[];
        objectiveExerciseMixRationale?: string;
        objectiveStatus?: string;
        objectiveProgressVerdict?: string;
        objectiveDecisionReason?: string;
        objectiveEscalationVerdict?: string;
        objectiveEscalationReason?: string;
        objectiveEscalationStrength?: string;
        objectiveRecommendedAction?: string;
        objectiveRecommendedPhaseChange?: string | null;
        objectiveRecommendedObjective?: string | null;
        objectiveEscalationSummary?: string;
        objectivePortfolioStatus?: string;
        objectivePortfolioPriority?: number;
        objectivePortfolioRotationWeight?: number;
        objectiveTrainingShare?: number;
        objectivePortfolioRank?: number;
        objectiveInterventionType?: string;
        objectiveInterventionReason?: string;
        objectiveRecommendationStrength?: string;
        objectiveNextSessionAdjustmentSummary?: string;
        objectiveInterventionStartedAt?: string;
        priorInterventionOutcome?: string;
        interventionRecommendedAction?: string;
        interventionRecommendedType?: string;
        interventionRepeatedPatternFlag?: boolean;
        interventionCompareSummary?: string;
      };
    }>(`sessions/${result.sessionId!}/study-session.json`);

    expect(session.metadata.exerciseTypeMix).toBeTruthy();
    expect(session.metadata.trainingObjective).toBeTruthy();
    expect(session.metadata.objectiveReason).toBeTruthy();
    expect(session.metadata.objectivePhase).toBeTruthy();
    expect(Array.isArray(session.metadata.successSignals)).toBe(true);
    expect(session.metadata.objectiveExerciseMixRationale).toBeTruthy();
    expect(session.metadata.objectiveStatus).toBeTruthy();
    expect(session.metadata.objectiveProgressVerdict).toBeTruthy();
    expect(session.metadata.objectiveDecisionReason).toBeTruthy();
    expect(session.metadata.objectiveEscalationVerdict).toBeTruthy();
    expect(session.metadata.objectiveEscalationReason).toBeTruthy();
    expect(session.metadata.objectiveEscalationStrength).toBeTruthy();
    expect(session.metadata.objectiveRecommendedAction).toBeTruthy();
    expect(session.metadata.objectiveEscalationSummary).toBeTruthy();
    expect(session.metadata.objectivePortfolioStatus).toBeTruthy();
    expect(typeof session.metadata.objectivePortfolioPriority).toBe("number");
    expect(typeof session.metadata.objectivePortfolioRotationWeight).toBe("number");
    expect(typeof session.metadata.objectiveTrainingShare).toBe("number");
    expect(typeof session.metadata.objectivePortfolioRank).toBe("number");
    expect(session.metadata.objectiveInterventionType).toBeTruthy();
    expect(session.metadata.objectiveInterventionReason).toBeTruthy();
    expect(session.metadata.objectiveRecommendationStrength).toBeTruthy();
    expect(session.metadata.objectiveNextSessionAdjustmentSummary).toBeTruthy();
    expect(session.metadata.objectiveInterventionStartedAt).toBeTruthy();
    expect(session.metadata.priorInterventionOutcome).toBeTruthy();
    expect(session.metadata.interventionRecommendedAction).toBeTruthy();
    expect(session.metadata.interventionRecommendedType).toBeTruthy();
    expect(typeof session.metadata.interventionRepeatedPatternFlag).toBe("boolean");
    if (session.metadata.interventionCompareSummary !== undefined) {
      expect(session.metadata.interventionCompareSummary).toBeTruthy();
    }

    const sidecarExists = await artifacts.exists(`sessions/${result.sessionId!}/cognitive-exercises.json`);
    expect(sidecarExists).toBe(true);
  });

  test("generateNewSession fails when corpus missing", async ({ api, artifacts }) => {
    await artifacts.backupAndRemove("datasets/training-exercises.jsonl");

    const result = (await api.call("generateNewSession")) as {
      success: boolean;
      error: string | null;
    };

    expect(result.success).toBe(false);
    expect(result.error).toContain("Exercise corpus not found");
  });

  test("refreshInsights succeeds and writes intervention-effectiveness artifacts", async ({ api, artifacts }) => {
    const result = (await api.call("refreshInsights")) as {
      success: boolean;
      error: string | null;
    };

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();

    expect(await artifacts.exists("objective/training-objective.json")).toBe(true);
    expect(await artifacts.exists("objective/objective-progress.json")).toBe(true);
    expect(await artifacts.exists("objective/objective-coaching.json")).toBe(true);
    expect(await artifacts.exists("objective/objective-escalation.json")).toBe(true);
    expect(await artifacts.exists("objective/objective-escalation.md")).toBe(true);
    expect(await artifacts.exists("objective/objective-portfolio.json")).toBe(true);
    expect(await artifacts.exists("objective/objective-portfolio.md")).toBe(true);
    expect(await artifacts.exists("objective/objective-coaching.md")).toBe(true);
    expect(await artifacts.exists("objective/intervention-effectiveness.json")).toBe(true);
    expect(await artifacts.exists("objective/intervention-effectiveness.md")).toBe(true);
    expect(await artifacts.exists("objective/intervention-history.jsonl")).toBe(true);

    const objectiveProgress = await artifacts.readJson<{
      currentObjective: string;
      objectiveStatus: string;
      progressVerdict: string;
      lifecycleDecision: string;
    }>("objective/objective-progress.json");
    expect(objectiveProgress.currentObjective).toBeTruthy();
    expect(objectiveProgress.objectiveStatus).toBeTruthy();
    expect(objectiveProgress.progressVerdict).toBeTruthy();
    expect(objectiveProgress.lifecycleDecision).toBeTruthy();

    const objectiveEscalation = await artifacts.readJson<{
      currentObjective: string;
      escalationVerdict: string;
      escalationReason: string;
      escalationStrength: string;
      memorySupportSignals: unknown[];
      repeatedFailureSignals: string[];
      repeatedSuccessSignals: string[];
    }>("objective/objective-escalation.json");
    expect(objectiveEscalation.currentObjective).toBeTruthy();
    expect(objectiveEscalation.escalationVerdict).toBeTruthy();
    expect(objectiveEscalation.escalationReason).toBeTruthy();
    expect(objectiveEscalation.escalationStrength).toBeTruthy();
    expect(Array.isArray(objectiveEscalation.memorySupportSignals)).toBe(true);

    const objectivePortfolio = await artifacts.readJson<{
      activeObjective: string;
      rankedObjectives: Array<{ objectiveKey: string; trainingShare: number; portfolioPriority: number }>;
      rotationDecisions: Array<{ objectiveKey: string; action: string }>;
      portfolioSummary: string;
    }>("objective/objective-portfolio.json");
    expect(objectivePortfolio.activeObjective).toBeTruthy();
    expect(Array.isArray(objectivePortfolio.rankedObjectives)).toBe(true);
    expect(Array.isArray(objectivePortfolio.rotationDecisions)).toBe(true);
    expect(objectivePortfolio.portfolioSummary).toBeTruthy();

    const objectiveCoaching = await artifacts.readJson<{
      currentObjective: string;
      interventionType: string;
      recommendationStrength: string;
      compareWindows: unknown[];
      nextSessionAdjustmentSummary: string;
    }>("objective/objective-coaching.json");
    expect(objectiveCoaching.currentObjective).toBeTruthy();
    expect(objectiveCoaching.interventionType).toBeTruthy();
    expect(objectiveCoaching.recommendationStrength).toBeTruthy();
    expect(Array.isArray(objectiveCoaching.compareWindows)).toBe(true);
    expect(objectiveCoaching.nextSessionAdjustmentSummary).toBeTruthy();

    const interventionMemory = await artifacts.readJson<{
      currentObjective: string;
      episodes: Array<{ interventionEpisodeId: string; compareSnapshot: { summary: string } }>;
      recentEpisodes: Array<{ outcome: string }>;
      nextActionRecommendation: { action: string; reason: string };
    }>("objective/intervention-memory.json");
    expect(interventionMemory.currentObjective).toBeTruthy();
    expect(Array.isArray(interventionMemory.episodes)).toBe(true);
    expect(Array.isArray(interventionMemory.recentEpisodes)).toBe(true);
    expect(interventionMemory.nextActionRecommendation.action).toBeTruthy();
    expect(interventionMemory.nextActionRecommendation.reason).toBeTruthy();

    const interventionEffectiveness = await artifacts.readJson<{
      interventionId: string;
      interventionOutcome: string;
      outcomeStrength: string;
      changedSignals: unknown[];
      unchangedSignals: unknown[];
      worsenedSignals: unknown[];
      recommendedAction: string;
      narrativeSummaryData: { summary: string };
    }>("objective/intervention-effectiveness.json");
    expect(interventionEffectiveness.interventionId).toBeTruthy();
    expect(interventionEffectiveness.interventionOutcome).toBeTruthy();
    expect(interventionEffectiveness.outcomeStrength).toBeTruthy();
    expect(Array.isArray(interventionEffectiveness.changedSignals)).toBe(true);
    expect(Array.isArray(interventionEffectiveness.unchangedSignals)).toBe(true);
    expect(Array.isArray(interventionEffectiveness.worsenedSignals)).toBe(true);
    expect(interventionEffectiveness.recommendedAction).toBeTruthy();
    expect(interventionEffectiveness.narrativeSummaryData.summary).toBeTruthy();
  });

  test("refreshInsights is deterministic for objective selection, coaching, and intervention effectiveness", async ({ api, artifacts }) => {
    const first = (await api.call("refreshInsights")) as { success: boolean };
    expect(first.success).toBe(true);

    const objectiveA = await artifacts.readJson<{
      currentObjective: string;
      objectivePhase: string;
      candidateScores: Array<{ objective: string; score: number }>;
    }>("objective/training-objective.json");
    const progressA = await artifacts.readJson<{
      currentObjective: string;
      objectiveStatus: string;
      progressVerdict: string;
      lifecycleDecision: string;
    }>("objective/objective-progress.json");
    const coachingA = await artifacts.readJson<{
      currentObjective: string;
      interventionType: string;
      recommendationStrength: string;
      nextSessionAdjustmentSummary: string;
    }>("objective/objective-coaching.json");
    const memoryA = await artifacts.readJson<{ nextActionRecommendation: { action: string; reason: string } }>("objective/intervention-memory.json");
    const escalationA = await artifacts.readJson<{
      escalationVerdict: string;
      escalationReason: string;
      escalationStrength: string;
    }>("objective/objective-escalation.json");
    const effectivenessA = await artifacts.readJson<{
      interventionOutcome: string;
      recommendedAction: string;
      narrativeSummaryData: { summary: string };
    }>("objective/intervention-effectiveness.json");

    const second = (await api.call("refreshInsights")) as { success: boolean };
    expect(second.success).toBe(true);

    const objectiveB = await artifacts.readJson<{
      currentObjective: string;
      objectivePhase: string;
      candidateScores: Array<{ objective: string; score: number }>;
    }>("objective/training-objective.json");
    const progressB = await artifacts.readJson<{
      currentObjective: string;
      objectiveStatus: string;
      progressVerdict: string;
      lifecycleDecision: string;
    }>("objective/objective-progress.json");
    const coachingB = await artifacts.readJson<{
      currentObjective: string;
      interventionType: string;
      recommendationStrength: string;
      nextSessionAdjustmentSummary: string;
    }>("objective/objective-coaching.json");
    const memoryB = await artifacts.readJson<{ nextActionRecommendation: { action: string; reason: string } }>("objective/intervention-memory.json");
    const escalationB = await artifacts.readJson<{
      escalationVerdict: string;
      escalationReason: string;
      escalationStrength: string;
    }>("objective/objective-escalation.json");
    const effectivenessB = await artifacts.readJson<{
      interventionOutcome: string;
      recommendedAction: string;
      narrativeSummaryData: { summary: string };
    }>("objective/intervention-effectiveness.json");

    expect(objectiveB.currentObjective).toBe(objectiveA.currentObjective);
    expect(objectiveB.objectivePhase).toBe(objectiveA.objectivePhase);
    expect(objectiveB.candidateScores).toEqual(objectiveA.candidateScores);
    expect(progressB.currentObjective).toBe(progressA.currentObjective);
    expect(progressB.objectiveStatus).toBe(progressA.objectiveStatus);
    expect(progressB.progressVerdict).toBe(progressA.progressVerdict);
    expect(progressB.lifecycleDecision).toBe(progressA.lifecycleDecision);
    expect(coachingB.currentObjective).toBe(coachingA.currentObjective);
    expect(coachingB.interventionType).toBe(coachingA.interventionType);
    expect(coachingB.recommendationStrength).toBe(coachingA.recommendationStrength);
    expect(coachingB.nextSessionAdjustmentSummary).toBe(coachingA.nextSessionAdjustmentSummary);
    expect(memoryB.nextActionRecommendation.action).toBe(memoryA.nextActionRecommendation.action);
    expect(memoryB.nextActionRecommendation.reason).toBe(memoryA.nextActionRecommendation.reason);
    expect(effectivenessB.interventionOutcome).toBe(effectivenessA.interventionOutcome);
    expect(effectivenessB.recommendedAction).toBe(effectivenessA.recommendedAction);
    expect(effectivenessB.narrativeSummaryData.summary).toBe(effectivenessA.narrativeSummaryData.summary);
  });

  test("refreshInsights fails when progress missing", async ({ api, artifacts }) => {
    await artifacts.backupAndRemove("progress/exercise-progress.json");

    const result = (await api.call("refreshInsights")) as {
      success: boolean;
      error: string | null;
    };

    expect(result.success).toBe(false);
    expect(result.error).toContain("No progress data");
  });


  test("loadImportOverview reports PGN readiness", async ({ api }) => {
    const result = (await api.call("loadImportOverview")) as {
      sourceDirDisplay: string;
      readyFileCount: number;
      files: Array<{ name: string }>;
      acceptedFormats: string[];
      engineReady: boolean;
    };

    expect(result.sourceDirDisplay).toContain("data/pgn");
    expect(result.readyFileCount).toBeGreaterThan(0);
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files[0].name.endsWith(".pgn")).toBe(true);
    expect(result.acceptedFormats).toContain(".pgn");
    expect(typeof result.engineReady).toBe("boolean");
  });

  test("runImportAnalysis returns a successful workflow result", async ({ api }) => {
    const result = (await api.call("runImportAnalysis")) as {
      success: boolean;
      didRun: boolean;
      message: string;
      status: null | {
        status: string;
        steps: Array<{ key: string; status: string }>;
        summary: { gamesDetected: number; trainingExercises: number };
      };
    };

    expect(result.success).toBe(true);
    expect(typeof result.didRun).toBe("boolean");
    expect(result.message).toBeTruthy();
    expect(result.status).not.toBeNull();
    expect(["running", "complete"]).toContain(result.status!.status);
    expect(result.status!.steps.length).toBe(5);
    expect(result.status!.summary.gamesDetected).toBeGreaterThan(0);
    expect(result.status!.summary.trainingExercises).toBeGreaterThan(0);
  });
  test("loadSessionData returns exercises for existing session", async ({ api }) => {
    const result = (await api.call("loadSessionData", {
      sessionId: "session-175c3f4f",
    })) as {
      exercises: Array<{
        index: number;
        exerciseId: string;
        fen: string;
        sideToMove: string;
        bestMoveSan: string | undefined;
      }>;
      error: string | null;
    };

    expect(result.error).toBeNull();
    expect(result.exercises.length).toBeGreaterThan(0);

    const ex = result.exercises[0];
    expect(ex.exerciseId).toBeTruthy();
    expect(ex.fen).toBeTruthy();
    expect(ex.sideToMove).toMatch(/^(white|black)$/);
  });

  test("submitMove with correct answer grades exact", async ({ api }) => {
    const load = (await api.call("loadSessionData", {
      sessionId: "session-175c3f4f",
    })) as {
      exercises: Array<{ bestMoveSan: string | undefined }>;
    };

    const bestMove = load.exercises[0].bestMoveSan;

    const result = (await api.call("submitMove", {
      sessionId: "session-175c3f4f",
      exerciseIndex: 0,
      moveInput: bestMove,
    })) as {
      valid: boolean;
      attempt: { isCorrect: boolean; gradingTier: string } | null;
    };

    expect(result.valid).toBe(true);
    expect(result.attempt).not.toBeNull();
    expect(result.attempt!.isCorrect).toBe(true);
    expect(result.attempt!.gradingTier).toBe("exact");
  });

  test("submitMove with illegal move returns invalid", async ({ api }) => {
    await api.call("loadSessionData", {
      sessionId: "session-175c3f4f",
    });

    const result = (await api.call("submitMove", {
      sessionId: "session-175c3f4f",
      exerciseIndex: 0,
      moveInput: "z9z9",
    })) as {
      valid: boolean;
      attempt: null;
    };

    expect(result.valid).toBe(false);
    expect(result.attempt).toBeNull();
  });
});


