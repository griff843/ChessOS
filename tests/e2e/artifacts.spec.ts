import { test, expect, OUT } from "../fixtures";
import { readFile } from "fs/promises";
import { join } from "path";

const jsonArtifacts = [
  { name: "Learner Overview", path: "dashboard/learner-overview.json", requiredKeys: ["totalExercises", "totalSeen", "lifetimeAccuracy"] },
  { name: "Trend Report", path: "dashboard/trend-report.json", requiredKeys: ["sessionTimeline", "categoryTrends"] },
  { name: "Review Report", path: "dashboard/review-report.json", requiredKeys: ["totalOverdue", "categoryUrgency"] },
  { name: "Coaching Summary", path: "coach/coaching-summary.json", requiredKeys: ["headline", "insights"] },
  { name: "Study Plan", path: "coach/study-plan.json", requiredKeys: ["primaryFocus", "rationale"] },
  { name: "Mistake Patterns", path: "coach/mistake-patterns.json", requiredKeys: ["categoryPatterns", "blunderProfile"] },
  { name: "Review Queue", path: "progress/review-queue.json", requiredKeys: ["entries"] },
  { name: "Exercise Progress", path: "progress/exercise-progress.json", requiredKeys: ["totalExercises", "exercises"] },
  { name: "Trend Profile", path: "progress/trend-profile.json", requiredKeys: ["byCategory", "byDifficulty"] },
  { name: "Difficulty Policy", path: "progress/difficulty-policy.json", requiredKeys: ["adjusted"] },
  { name: "Curriculum Plan", path: "curriculum/curriculum-plan.json", requiredKeys: ["sessions", "conceptSequence"] },
  { name: "Concept Graph", path: "concepts/concept-graph.json", requiredKeys: ["concepts", "conceptIndex", "categorySummaries"] },
  { name: "Concept State", path: "concepts/concept-state.json", requiredKeys: ["entries", "recommendedFocuses", "strongestConcepts"] },
  { name: "Opening Report", path: "openings/opening-report.json", requiredKeys: ["classifications", "familySummaries", "recurringMistakes", "recommendedTrainingThemes"] },
  { name: "Opening Mistakes", path: "openings/opening-mistakes.json", requiredKeys: [] },
  { name: "Repertoire Map", path: "repertoire/repertoire-map.json", requiredKeys: ["repertoires", "lineIndex"] },
  { name: "Repertoire Review", path: "repertoire/repertoire-review.json", requiredKeys: ["comparisons", "currentRepertoireHealth", "topLinesToReview"] },
  { name: "Repertoire Transfer", path: "repertoire/repertoire-transfer.json", requiredKeys: ["summary", "repertoireBuckets", "weakestBuckets"] },
  { name: "Repertoire Drill Memory", path: "repertoire/repertoire-drill-memory.json", requiredKeys: ["entries", "fragileLines", "strongestLines", "atRiskLines", "summary"] },
  { name: "Repertoire Drill Queue", path: "repertoire/repertoire-drill-queue.json", requiredKeys: ["entries", "strongestLines", "nextLinesToReview", "summary"] },
  { name: "Repertoire Drill Sessions", path: "repertoire/repertoire-drill-sessions.json", requiredKeys: [] },
  { name: "Repertoire Transfer Coaching", path: "repertoire/repertoire-transfer-coaching.json", requiredKeys: ["entries", "fragileLines", "topActions", "drillVsGameGaps", "summary"] },
  { name: "Repertoire Repair", path: "repertoire/repertoire-repair.json", requiredKeys: ["urgentGames", "repairByType", "scheduledDrills", "summary"] },
  { name: "Repertoire Repair Queue", path: "repertoire/repertoire-repair-queue.json", requiredKeys: ["entries", "topRepairLines", "urgentGames", "summary"] },
  { name: "Repertoire Repair Outcomes", path: "repertoire/repertoire-repair-outcomes.json", requiredKeys: ["entries", "repairsThatWorked", "repairsStillFragile", "nextActions", "summary"] },
  { name: "Training Objective", path: "objective/training-objective.json", requiredKeys: ["currentObjective", "objectiveReason", "successSignals"] },
  { name: "Objective Progress", path: "objective/objective-progress.json", requiredKeys: ["currentObjective", "objectiveStatus", "progressVerdict", "lifecycleDecision"] },
  { name: "Objective Coaching", path: "objective/objective-coaching.json", requiredKeys: ["currentObjective", "interventionType", "compareWindows", "nextSessionAdjustmentSummary"] },
  { name: "Objective Escalation", path: "objective/objective-escalation.json", requiredKeys: ["currentObjective", "escalationVerdict", "escalationReason", "memorySupportSignals"] },
  { name: "Objective Portfolio", path: "objective/objective-portfolio.json", requiredKeys: ["activeObjective", "rankedObjectives", "rotationDecisions", "portfolioSummary"] },
  { name: "Intervention Effectiveness", path: "objective/intervention-effectiveness.json", requiredKeys: ["interventionId", "interventionOutcome", "recommendedAction", "narrativeSummaryData"] },
  { name: "Intervention Memory", path: "objective/intervention-memory.json", requiredKeys: ["currentObjective", "episodes", "recentEpisodes", "nextActionRecommendation"] },
  { name: "Tree Model", path: "models/tree-model.json", requiredKeys: ["type", "root", "featureNames"] },
  { name: "Feature Ablation", path: "models/feature-ablation.json", requiredKeys: ["configs"] },
  { name: "Difficulty Calibration", path: "models/difficulty-calibration.json", requiredKeys: ["totalExercises", "distribution", "easyUpperBound"] },
];

const textArtifacts = [
  { name: "Objective Coaching Markdown", path: "objective/objective-coaching.md", contains: "# Objective Coaching" },
  { name: "Objective Escalation Markdown", path: "objective/objective-escalation.md", contains: "# Objective Escalation" },
  { name: "Objective Portfolio Markdown", path: "objective/objective-portfolio.md", contains: "# Objective Portfolio" },
  { name: "Intervention Effectiveness Markdown", path: "objective/intervention-effectiveness.md", contains: "# Intervention Effectiveness" },
  { name: "Concept Graph Markdown", path: "concepts/concept-graph.md", contains: "# Concept Graph" },
  { name: "Concept State Markdown", path: "concepts/concept-state.md", contains: "# Concept State" },
  { name: "Opening Report Markdown", path: "openings/opening-report.md", contains: "# Opening Report" },
  { name: "Opening Mistakes Markdown", path: "openings/opening-mistakes.md", contains: "# Opening Mistakes" },
  { name: "Repertoire Map Markdown", path: "repertoire/repertoire-map.md", contains: "# Repertoire Map" },
  { name: "Repertoire Review Markdown", path: "repertoire/repertoire-review.md", contains: "# Repertoire Review" },
  { name: "Repertoire Transfer Markdown", path: "repertoire/repertoire-transfer.md", contains: "# Repertoire Transfer" },
  { name: "Repertoire Drill Memory Markdown", path: "repertoire/repertoire-drill-memory.md", contains: "# Repertoire Drill Memory" },
  { name: "Repertoire Drill Queue Markdown", path: "repertoire/repertoire-drill-queue.md", contains: "# Repertoire Drill Queue" },
  { name: "Repertoire Transfer Coaching Markdown", path: "repertoire/repertoire-transfer-coaching.md", contains: "# Repertoire Transfer Coaching" },
  { name: "Repertoire Repair Markdown", path: "repertoire/repertoire-repair.md", contains: "# Repertoire Repair" },
  { name: "Repertoire Repair Queue Markdown", path: "repertoire/repertoire-repair-queue.md", contains: "# Repertoire Repair Queue" },
  { name: "Repertoire Repair Outcomes Markdown", path: "repertoire/repertoire-repair-outcomes.md", contains: "# Repertoire Repair Outcomes" },
];

const jsonlArtifacts = [
  { name: "Aggregated Dataset", path: "datasets/all-games.jsonl", allowEmpty: false },
  { name: "Training Exercises", path: "datasets/training-exercises.jsonl", allowEmpty: false },
  { name: "Objective History", path: "objective/objective-history.jsonl", allowEmpty: false },
  { name: "Intervention History", path: "objective/intervention-history.jsonl", allowEmpty: true },
  { name: "Repertoire Drill Events", path: "repertoire/repertoire-drill-events.jsonl", allowEmpty: true },
  { name: "Repertoire Repair History", path: "repertoire/repertoire-repair-history.jsonl", allowEmpty: true },
];

test.describe("Artifact integrity", () => {
  for (const { name, path, requiredKeys } of jsonArtifacts) {
    test(`${name} exists and parses with required keys`, async ({ artifacts }) => {
      const exists = await artifacts.exists(path);
      expect(exists, `${name} should exist at out/${path}`).toBe(true);

      const data = await artifacts.readJson<Record<string, unknown>>(path);
      for (const key of requiredKeys) {
        expect(data, `${name} missing key "${key}"`).toHaveProperty(key);
      }
    });
  }

  test("Opening Mistakes entries are shaped correctly when present", async ({ artifacts }) => {
    const data = await artifacts.readJson<unknown[]>("openings/opening-mistakes.json");
    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      expect(data[0]).toMatchObject({
        sourceGameId: expect.any(String),
        openingFamily: expect.any(String),
        openingKey: expect.any(String),
        openingName: expect.any(String),
        detectedLine: expect.any(String),
        positionId: expect.any(String),
        ply: expect.any(Number),
        theme: expect.any(String),
        severity: expect.stringMatching(/^(low|medium|high)$/),
        explanation: expect.any(String),
        conceptMappings: expect.any(Array),
      });
    }
  });

  test("Repertoire Transfer Coaching entries are shaped correctly when present", async ({ artifacts }) => {
    const data = await artifacts.readJson<{
      entries: unknown[];
      fragileLines: unknown[];
      topActions: unknown[];
      drillVsGameGaps: unknown[];
      summary: unknown;
    }>("repertoire/repertoire-transfer-coaching.json");

    expect(Array.isArray(data.entries)).toBe(true);
    expect(Array.isArray(data.fragileLines)).toBe(true);
    expect(Array.isArray(data.topActions)).toBe(true);
    expect(Array.isArray(data.drillVsGameGaps)).toBe(true);
    expect(data.summary).toBeTruthy();

    if (data.entries.length > 0) {
      expect(data.entries[0]).toMatchObject({
        repertoireKey: expect.any(String),
        repertoireName: expect.any(String),
        lineId: expect.any(String),
        lineName: expect.any(String),
        firstBadMomentReason: expect.any(String),
        transferFailureType: expect.any(String),
        drillVsGameGap: expect.any(String),
        recommendedReviewLine: expect.any(String),
        coachingSummary: expect.any(String),
        urgency: expect.any(Number),
        sourceGameIds: expect.any(Array),
      });
    }
  });

  test("Repertoire Drill Memory entries are shaped correctly when present", async ({ artifacts }) => {
    const data = await artifacts.readJson<{
      entries: unknown[];
      fragileLines: unknown[];
      strongestLines: unknown[];
      atRiskLines: unknown[];
      summary: unknown;
    }>("repertoire/repertoire-drill-memory.json");

    expect(Array.isArray(data.entries)).toBe(true);
    expect(Array.isArray(data.fragileLines)).toBe(true);
    expect(Array.isArray(data.strongestLines)).toBe(true);
    expect(Array.isArray(data.atRiskLines)).toBe(true);
    expect(data.summary).toBeTruthy();

    if (data.entries.length > 0) {
      expect(data.entries[0]).toMatchObject({
        repertoireKey: expect.any(String),
        lineId: expect.any(String),
        lineKey: expect.any(String),
        lineName: expect.any(String),
        reviewCount: expect.any(Number),
        recallConfidence: expect.any(Number),
        forgettingRisk: expect.any(Number),
        stabilityScore: expect.any(Number),
        spacedReviewBucket: expect.any(String),
        drillVsGameComparison: expect.any(String),
      });
    }
  });

  test("Repertoire Drill Queue entries are shaped correctly when present", async ({ artifacts }) => {
    const data = await artifacts.readJson<{
      entries: unknown[];
      strongestLines: unknown[];
      nextLinesToReview: unknown[];
      summary: unknown;
    }>("repertoire/repertoire-drill-queue.json");

    expect(Array.isArray(data.entries)).toBe(true);
    expect(Array.isArray(data.strongestLines)).toBe(true);
    expect(Array.isArray(data.nextLinesToReview)).toBe(true);
    expect(data.summary).toBeTruthy();

    if (data.entries.length > 0) {
      expect(data.entries[0]).toMatchObject({
        lineId: expect.any(String),
        lineName: expect.any(String),
        urgency: expect.any(Number),
        recallConfidence: expect.any(Number),
        forgettingRisk: expect.any(Number),
        drillVsGameComparison: expect.any(String),
        recommendedAction: expect.any(String),
      });
    }
  });

  test("Repertoire Drill Sessions entries are shaped correctly when present", async ({ artifacts }) => {
    const data = await artifacts.readJson<unknown[]>("repertoire/repertoire-drill-sessions.json");
    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      expect(data[0]).toMatchObject({
        drillSessionId: expect.any(String),
        generatedAt: expect.any(String),
        sessionSize: expect.any(Number),
        completedCount: expect.any(Number),
        exactCount: expect.any(Number),
        failedCount: expect.any(Number),
      });
    }
  });

  test("Repertoire Repair entries are shaped correctly when present", async ({ artifacts }) => {
    const data = await artifacts.readJson<{
      urgentGames: unknown[];
      repairByType: unknown[];
      scheduledDrills: unknown[];
      summary: unknown;
    }>("repertoire/repertoire-repair.json");

    expect(Array.isArray(data.urgentGames)).toBe(true);
    expect(Array.isArray(data.repairByType)).toBe(true);
    expect(Array.isArray(data.scheduledDrills)).toBe(true);
    expect(data.summary).toBeTruthy();

    if (data.urgentGames.length > 0) {
      expect(data.urgentGames[0]).toMatchObject({
        sourceGameId: expect.any(String),
        lineId: expect.any(String),
        lineName: expect.any(String),
        repairType: expect.any(String),
        repairUrgency: expect.any(String),
        urgencyScore: expect.any(Number),
        scheduledDrillReason: expect.any(String),
      });
    }
  });

  test("Repertoire Repair Queue entries are shaped correctly when present", async ({ artifacts }) => {
    const data = await artifacts.readJson<{
      entries: unknown[];
      topRepairLines: unknown[];
      urgentGames: unknown[];
      summary: unknown;
    }>("repertoire/repertoire-repair-queue.json");

    expect(Array.isArray(data.entries)).toBe(true);
    expect(Array.isArray(data.topRepairLines)).toBe(true);
    expect(Array.isArray(data.urgentGames)).toBe(true);
    expect(data.summary).toBeTruthy();

    if (data.entries.length > 0) {
      expect(data.entries[0]).toMatchObject({
        sourceGameId: expect.any(String),
        lineId: expect.any(String),
        lineName: expect.any(String),
        repairType: expect.any(String),
        urgencyScore: expect.any(Number),
        scheduledDrillReason: expect.any(String),
      });
    }
  });

  test("Repertoire Repair Outcomes entries are shaped correctly when present", async ({ artifacts }) => {
    const data = await artifacts.readJson<{
      entries: unknown[];
      repairsThatWorked: unknown[];
      repairsStillFragile: unknown[];
      nextActions: unknown[];
      summary: unknown;
    }>("repertoire/repertoire-repair-outcomes.json");

    expect(Array.isArray(data.entries)).toBe(true);
    expect(Array.isArray(data.repairsThatWorked)).toBe(true);
    expect(Array.isArray(data.repairsStillFragile)).toBe(true);
    expect(Array.isArray(data.nextActions)).toBe(true);
    expect(data.summary).toBeTruthy();

    if (data.entries.length > 0) {
      expect(data.entries[0]).toMatchObject({
        sourceGameId: expect.any(String),
        lineId: expect.any(String),
        lineName: expect.any(String),
        repairId: expect.any(String),
        drillOutcome: expect.any(String),
        nextGameOutcome: expect.any(String),
        transferImproved: expect.any(Boolean),
        transferStillFragile: expect.any(Boolean),
        outcomeVerdict: expect.any(String),
        outcomeReason: expect.any(String),
        outcomeStrength: expect.any(String),
        nextAction: expect.any(String),
        urgency: expect.any(Number),
      });
    }
  });

  for (const { name, path, contains } of textArtifacts) {
    test(`${name} exists and contains a heading`, async () => {
      const raw = await readFile(join(OUT, path), "utf-8");
      expect(raw).toContain(contains);
    });
  }

  for (const { name, path, allowEmpty } of jsonlArtifacts) {
    test(`${name} exists and has valid JSONL lines`, async () => {
      const raw = await readFile(join(OUT, path), "utf-8");
      const lines = raw.trim().split("\n").filter(Boolean);

      if (!allowEmpty) {
        expect(lines.length, `${name} should have at least one line`).toBeGreaterThan(0);
      }

      if (lines.length > 0) {
        const first = JSON.parse(lines[0]);
        expect(first).toBeTruthy();
        expect(typeof first).toBe("object");
      }
    });
  }
});
