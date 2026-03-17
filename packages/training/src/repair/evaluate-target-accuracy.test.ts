/**
 * Unit tests for evaluateTargetAccuracy and pickMostInformativeAccuracy.
 *
 * Covers: strong / mixed / weak / insufficient_data / absent scenarios.
 *
 * Run: npx tsx packages/training/src/repair/evaluate-target-accuracy.test.ts
 */

import { strict as assert } from "assert";
import { evaluateTargetAccuracy, pickMostInformativeAccuracy } from "./evaluate-target-accuracy.js";
import type { ExerciseOutcome } from "./evaluate-target-accuracy.js";
import type { RepairTarget } from "./types.js";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(`    ${err instanceof Error ? err.message : err}`);
    failed++;
  }
}

const SESSION_ID = "session-abc";
const TARGET: RepairTarget = "tactical_pattern_recognition";
// tactical_pattern_recognition maps to ["tactical_miss", "material_loss"]

function makeOutcome(lessonCategory: string, result: "correct" | "incorrect"): ExerciseOutcome {
  return { lessonCategory: lessonCategory as ExerciseOutcome["lessonCategory"], result };
}

// ── evaluateTargetAccuracy ───────────────────────────────────────────

console.log("evaluateTargetAccuracy tests:");

test("strong accuracy: ≥70% correct on ≥2 matched exercises", () => {
  const outcomes: ExerciseOutcome[] = [
    makeOutcome("tactical_miss", "correct"),
    makeOutcome("tactical_miss", "correct"),
    makeOutcome("material_loss", "correct"),
    makeOutcome("opening_inaccuracy", "incorrect"), // unrelated category
  ];
  const result = evaluateTargetAccuracy(TARGET, SESSION_ID, outcomes);
  assert.equal(result.performanceBand, "strong");
  assert.equal(result.matchedExerciseCount, 3);
  assert.equal(result.totalExerciseCount, 4);
  assert.equal(result.correctCount, 3);
  assert.equal(result.accuracyRate, 1.0);
  assert.equal(result.sessionId, SESSION_ID);
  assert.equal(result.target, TARGET);
  assert.ok(!result.explanation.includes("enough"), "explanation should not say insufficient");
});

test("weak accuracy: <40% correct on ≥2 matched exercises", () => {
  const outcomes: ExerciseOutcome[] = [
    makeOutcome("tactical_miss", "incorrect"),
    makeOutcome("tactical_miss", "incorrect"),
    makeOutcome("material_loss", "correct"),
    makeOutcome("material_loss", "incorrect"),
  ];
  const result = evaluateTargetAccuracy(TARGET, SESSION_ID, outcomes);
  assert.equal(result.performanceBand, "weak");
  assert.equal(result.matchedExerciseCount, 4);
  assert.equal(result.correctCount, 1);
  assert.ok(result.accuracyRate !== null && result.accuracyRate < 0.4);
});

test("mixed accuracy: 40–69% correct on ≥2 matched exercises", () => {
  const outcomes: ExerciseOutcome[] = [
    makeOutcome("tactical_miss", "correct"),
    makeOutcome("tactical_miss", "incorrect"),
    makeOutcome("material_loss", "correct"),
    makeOutcome("material_loss", "incorrect"),
    makeOutcome("material_loss", "incorrect"),
  ];
  const result = evaluateTargetAccuracy(TARGET, SESSION_ID, outcomes);
  // 2 correct out of 5 = 0.4 → exactly at threshold → "mixed"
  assert.equal(result.performanceBand, "mixed");
  assert.equal(result.matchedExerciseCount, 5);
  assert.equal(result.correctCount, 2);
});

test("insufficient_data: only 1 matched exercise", () => {
  const outcomes: ExerciseOutcome[] = [
    makeOutcome("tactical_miss", "correct"),
    makeOutcome("opening_inaccuracy", "incorrect"),
    makeOutcome("positional_error", "correct"),
  ];
  const result = evaluateTargetAccuracy(TARGET, SESSION_ID, outcomes);
  assert.equal(result.performanceBand, "insufficient_data");
  assert.equal(result.matchedExerciseCount, 1);
  assert.equal(result.accuracyRate, null);
  assert.equal(result.correctCount, 0); // not counted when insufficient
});

test("insufficient_data: zero matched exercises", () => {
  const outcomes: ExerciseOutcome[] = [
    makeOutcome("opening_inaccuracy", "correct"),
    makeOutcome("positional_error", "incorrect"),
    makeOutcome("endgame_technique", "correct"),
  ];
  const result = evaluateTargetAccuracy(TARGET, SESSION_ID, outcomes);
  assert.equal(result.performanceBand, "insufficient_data");
  assert.equal(result.matchedExerciseCount, 0);
  assert.equal(result.accuracyRate, null);
});

test("insufficient_data: empty outcomes array", () => {
  const result = evaluateTargetAccuracy(TARGET, SESSION_ID, []);
  assert.equal(result.performanceBand, "insufficient_data");
  assert.equal(result.matchedExerciseCount, 0);
  assert.equal(result.totalExerciseCount, 0);
});

test("all correct with exactly 2 matched → strong", () => {
  const outcomes: ExerciseOutcome[] = [
    makeOutcome("tactical_miss", "correct"),
    makeOutcome("material_loss", "correct"),
  ];
  const result = evaluateTargetAccuracy(TARGET, SESSION_ID, outcomes);
  assert.equal(result.performanceBand, "strong");
  assert.equal(result.accuracyRate, 1.0);
});

test("all incorrect with exactly 2 matched → weak", () => {
  const outcomes: ExerciseOutcome[] = [
    makeOutcome("tactical_miss", "incorrect"),
    makeOutcome("material_loss", "incorrect"),
  ];
  const result = evaluateTargetAccuracy(TARGET, SESSION_ID, outcomes);
  assert.equal(result.performanceBand, "weak");
  assert.equal(result.accuracyRate, 0);
});

test("different target uses correct lesson categories", () => {
  const target: RepairTarget = "endgame_technique";
  // endgame_technique maps to ["endgame_technique"]
  const outcomes: ExerciseOutcome[] = [
    makeOutcome("endgame_technique", "correct"),
    makeOutcome("endgame_technique", "correct"),
    makeOutcome("tactical_miss", "incorrect"), // not relevant to endgame_technique
  ];
  const result = evaluateTargetAccuracy(target, SESSION_ID, outcomes);
  assert.equal(result.matchedExerciseCount, 2);
  assert.equal(result.performanceBand, "strong");
});

test("explanation text is human-readable for strong", () => {
  const outcomes: ExerciseOutcome[] = [
    makeOutcome("tactical_miss", "correct"),
    makeOutcome("tactical_miss", "correct"),
    makeOutcome("tactical_miss", "correct"),
  ];
  const result = evaluateTargetAccuracy(TARGET, SESSION_ID, outcomes);
  assert.ok(result.explanation.includes("3 of 3"), `Expected '3 of 3' in: ${result.explanation}`);
  assert.ok(result.explanation.includes("100%"), `Expected '100%' in: ${result.explanation}`);
});

test("explanation text for insufficient_data (zero matched)", () => {
  const result = evaluateTargetAccuracy(TARGET, SESSION_ID, []);
  assert.ok(result.explanation.toLowerCase().includes("no exercises"), `Expected 'no exercises' in: ${result.explanation}`);
});

// ── pickMostInformativeAccuracy ──────────────────────────────────────

console.log("\npickMostInformativeAccuracy tests:");

function makeSummary(
  band: "strong" | "mixed" | "weak" | "insufficient_data",
  matchedCount: number,
  sessionId = "s1"
) {
  return {
    sessionId,
    target: TARGET,
    matchedExerciseCount: matchedCount,
    totalExerciseCount: matchedCount + 2,
    correctCount: band === "strong" ? matchedCount : 0,
    accuracyRate: band === "insufficient_data" ? null : (band === "strong" ? 1.0 : 0.2),
    performanceBand: band as "strong" | "mixed" | "weak" | "insufficient_data",
    explanation: "test",
  };
}

test("returns null for empty list", () => {
  assert.equal(pickMostInformativeAccuracy([]), null);
});

test("returns null when all are insufficient_data", () => {
  const summaries = [
    makeSummary("insufficient_data", 0, "s1"),
    makeSummary("insufficient_data", 1, "s2"),
  ];
  assert.equal(pickMostInformativeAccuracy(summaries), null);
});

test("returns the informative summary when mixed with insufficient", () => {
  const strong = makeSummary("strong", 4, "s2");
  const summaries = [
    makeSummary("insufficient_data", 0, "s1"),
    strong,
  ];
  const result = pickMostInformativeAccuracy(summaries);
  assert.equal(result?.sessionId, "s2");
  assert.equal(result?.performanceBand, "strong");
});

test("picks the one with most matched exercises when multiple informative", () => {
  const summaries = [
    makeSummary("weak", 2, "s1"),
    makeSummary("strong", 5, "s2"),  // more matched → picks this
    makeSummary("mixed", 3, "s3"),
  ];
  const result = pickMostInformativeAccuracy(summaries);
  assert.equal(result?.sessionId, "s2");
});

test("with equal matched counts, returns the last one (most recent)", () => {
  const summaries = [
    makeSummary("weak", 3, "s1"),
    makeSummary("strong", 3, "s2"),
  ];
  const result = pickMostInformativeAccuracy(summaries);
  assert.equal(result?.sessionId, "s2");
});

// ── Integration: accuracy affects coaching memory ────────────────────

console.log("\nevaluateCoachingMemory + sessionAccuracies integration:");

import { evaluateCoachingMemory } from "./evaluate-coaching-memory.js";
import type { RepairEvidence, TargetedSessionSummary, DiagnosisHistoryEntry, TargetAccuracySummary } from "./types.js";

function makeEvidence(overrides: Partial<RepairEvidence> = {}): RepairEvidence {
  return {
    currentTarget: TARGET,
    status: "recurring",
    totalOccurrences: 3,
    recentOccurrences: 3,
    olderOccurrences: 0,
    totalGamesAnalyzed: 5,
    explanation: "Test evidence",
    ...overrides,
  };
}

function makeSession(overrides: Partial<TargetedSessionSummary> = {}): TargetedSessionSummary {
  return {
    sessionId: "session-1",
    createdAt: "2025-06-15T00:00:00Z",
    primaryTarget: TARGET,
    boostStrength: "strong",
    ...overrides,
  };
}

function makeHistory(
  entries: Array<{ gameId: string; target?: RepairTarget; date: string }>
): DiagnosisHistoryEntry[] {
  return entries.map((e) => ({
    gameId: e.gameId,
    primaryTarget: e.target ?? TARGET,
    diagnosedAt: e.date,
  }));
}

function makeAccuracy(
  band: "strong" | "mixed" | "weak" | "insufficient_data",
  sessionId = "session-1"
): TargetAccuracySummary {
  return {
    sessionId,
    target: TARGET,
    matchedExerciseCount: band === "insufficient_data" ? 1 : 4,
    totalExerciseCount: 6,
    correctCount: band === "strong" ? 4 : band === "mixed" ? 2 : 0,
    accuracyRate: band === "insufficient_data" ? null : (band === "strong" ? 1.0 : band === "mixed" ? 0.5 : 0.0),
    performanceBand: band,
    explanation: `Test accuracy: ${band}`,
  };
}

test("recurring_limited_data + strong accuracy → sessionPerformanceBand=strong, note in explanation", () => {
  const evidence = makeEvidence({ totalOccurrences: 3 });
  const session = makeSession({ createdAt: "2025-06-15T00:00:00Z" });
  // Only 1 post-training game → recurring_limited_data
  const history = makeHistory([
    { gameId: "g1", date: "2025-06-10T00:00:00Z" },
    { gameId: "g2", date: "2025-06-20T00:00:00Z", target: "endgame_technique" },
  ]);
  const accuracies = [makeAccuracy("strong")];
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [session], history, accuracies);
  assert.equal(result.persistenceState, "recurring_limited_data");
  assert.equal(result.sessionPerformanceBand, "strong");
  assert.ok(result.sessionPerformanceNote !== undefined, "should have a performance note");
  assert.ok(result.explanation.includes("strong"), `Expected 'strong' in explanation: ${result.explanation}`);
});

test("recurring_limited_data + weak accuracy → sessionPerformanceBand=weak, note mentions weak", () => {
  const evidence = makeEvidence({ totalOccurrences: 3 });
  const session = makeSession({ createdAt: "2025-06-15T00:00:00Z" });
  const history = makeHistory([
    { gameId: "g1", date: "2025-06-10T00:00:00Z" },
    { gameId: "g2", date: "2025-06-20T00:00:00Z", target: "endgame_technique" },
  ]);
  const accuracies = [makeAccuracy("weak")];
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [session], history, accuracies);
  assert.equal(result.persistenceState, "recurring_limited_data");
  assert.equal(result.sessionPerformanceBand, "weak");
  assert.ok(result.explanation.toLowerCase().includes("weak"), `Expected 'weak' in explanation: ${result.explanation}`);
});

test("recurring_limited_data + insufficient_data accuracy → no sessionPerformanceBand", () => {
  const evidence = makeEvidence({ totalOccurrences: 3 });
  const session = makeSession({ createdAt: "2025-06-15T00:00:00Z" });
  const history = makeHistory([
    { gameId: "g1", date: "2025-06-10T00:00:00Z" },
    { gameId: "g2", date: "2025-06-20T00:00:00Z", target: "endgame_technique" },
  ]);
  const accuracies = [makeAccuracy("insufficient_data")];
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [session], history, accuracies);
  assert.equal(result.persistenceState, "recurring_limited_data");
  assert.equal(result.sessionPerformanceBand, undefined);
  assert.equal(result.sessionPerformanceNote, undefined);
});

test("no sessionAccuracies → no sessionPerformanceBand (backward compatible)", () => {
  const evidence = makeEvidence({ totalOccurrences: 3 });
  const session = makeSession({ createdAt: "2025-06-15T00:00:00Z" });
  const history = makeHistory([
    { gameId: "g1", date: "2025-06-10T00:00:00Z" },
    { gameId: "g2", date: "2025-06-20T00:00:00Z", target: "endgame_technique" },
  ]);
  // No 6th parameter → uses default empty array
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [session], history);
  assert.equal(result.sessionPerformanceBand, undefined);
  assert.equal(result.sessionPerformanceNote, undefined);
  // Core logic unchanged
  assert.equal(result.persistenceState, "recurring_limited_data");
  assert.equal(result.recommendedEmphasis, "maintain");
});

test("persistent_despite_training + strong accuracy → note mentions transfer", () => {
  const evidence = makeEvidence({ totalOccurrences: 5 });
  const session = makeSession({ createdAt: "2025-06-15T00:00:00Z" });
  // 2 recurrences in 3 post-training games = 0.67 ≥ 0.3 → persistent
  const history = makeHistory([
    { gameId: "g1", date: "2025-06-10T00:00:00Z" },
    { gameId: "g2", date: "2025-06-20T00:00:00Z" },
    { gameId: "g3", date: "2025-06-22T00:00:00Z", target: "endgame_technique" },
    { gameId: "g4", date: "2025-06-24T00:00:00Z" },
  ]);
  const accuracies = [makeAccuracy("strong")];
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [session], history, accuracies);
  assert.equal(result.persistenceState, "persistent_despite_training");
  assert.equal(result.sessionPerformanceBand, "strong");
  assert.ok(result.explanation.includes("transfer"), `Expected 'transfer' in explanation: ${result.explanation}`);
});

test("persistent_despite_training + weak accuracy → note mentions adjusting approach", () => {
  const evidence = makeEvidence({ totalOccurrences: 5 });
  const session = makeSession({ createdAt: "2025-06-15T00:00:00Z" });
  const history = makeHistory([
    { gameId: "g1", date: "2025-06-10T00:00:00Z" },
    { gameId: "g2", date: "2025-06-20T00:00:00Z" },
    { gameId: "g3", date: "2025-06-22T00:00:00Z", target: "endgame_technique" },
    { gameId: "g4", date: "2025-06-24T00:00:00Z" },
  ]);
  const accuracies = [makeAccuracy("weak")];
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [session], history, accuracies);
  assert.equal(result.persistenceState, "persistent_despite_training");
  assert.equal(result.sessionPerformanceBand, "weak");
  assert.ok(result.explanation.includes("adjusting"), `Expected 'adjusting' in explanation: ${result.explanation}`);
});

test("improving_after_training + strong accuracy → note further supports improvement", () => {
  const evidence = makeEvidence({ totalOccurrences: 3 });
  const session = makeSession({ createdAt: "2025-06-15T00:00:00Z" });
  // 0 recurrences in 3 post-training games = 0 < 0.3 → improving
  const history = makeHistory([
    { gameId: "g1", date: "2025-06-10T00:00:00Z" },
    { gameId: "g2", date: "2025-06-20T00:00:00Z", target: "endgame_technique" },
    { gameId: "g3", date: "2025-06-22T00:00:00Z", target: "endgame_technique" },
    { gameId: "g4", date: "2025-06-24T00:00:00Z", target: "strategic_planning" },
  ]);
  const accuracies = [makeAccuracy("strong")];
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [session], history, accuracies);
  assert.equal(result.persistenceState, "improving_after_training");
  assert.equal(result.sessionPerformanceBand, "strong");
  assert.ok(
    result.explanation.includes("further supporting"),
    `Expected 'further supporting' in explanation: ${result.explanation}`
  );
});

test("first_occurrence → sessionPerformanceBand always undefined (no sessions)", () => {
  const evidence = makeEvidence({ totalOccurrences: 0, status: "isolated" });
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [], [], []);
  assert.equal(result.persistenceState, "first_occurrence");
  assert.equal(result.sessionPerformanceBand, undefined);
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
