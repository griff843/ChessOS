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
  { name: "Curriculum Plan", path: "curriculum/curriculum-plan.json", requiredKeys: ["sessions"] },
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
];

const jsonlArtifacts = [
  { name: "Aggregated Dataset", path: "datasets/all-games.jsonl", allowEmpty: false },
  { name: "Training Exercises", path: "datasets/training-exercises.jsonl", allowEmpty: false },
  { name: "Objective History", path: "objective/objective-history.jsonl", allowEmpty: false },
  { name: "Intervention History", path: "objective/intervention-history.jsonl", allowEmpty: true },
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
