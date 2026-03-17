/**
 * Unit tests for evaluateCoachingMemory.
 *
 * Run: npx tsx packages/training/src/repair/evaluate-coaching-memory.test.ts
 */

import { strict as assert } from "assert";
import { evaluateCoachingMemory } from "./evaluate-coaching-memory.js";
import type {
  RepairTarget,
  RepairEvidence,
  DiagnosisHistoryEntry,
  TargetedSessionSummary,
} from "./types.js";

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

const TARGET: RepairTarget = "tactical_pattern_recognition";

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

function makeHistory(
  entries: Array<{ gameId: string; target?: RepairTarget; date: string }>
): DiagnosisHistoryEntry[] {
  return entries.map((e) => ({
    gameId: e.gameId,
    primaryTarget: e.target ?? TARGET,
    diagnosedAt: e.date,
  }));
}

function makeSession(
  overrides: Partial<TargetedSessionSummary> = {}
): TargetedSessionSummary {
  return {
    sessionId: "session-1",
    createdAt: "2025-06-15T00:00:00Z",
    primaryTarget: TARGET,
    boostStrength: "strong",
    ...overrides,
  };
}

console.log("evaluateCoachingMemory tests:");

test("first occurrence → first_occurrence, monitor", () => {
  const evidence = makeEvidence({ totalOccurrences: 0, status: "isolated" });
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [], []);
  assert.equal(result.persistenceState, "first_occurrence");
  assert.equal(result.recommendedEmphasis, "monitor");
  assert.equal(result.targetedSessionCount, 0);
  assert.equal(result.confidence, "low");
});

test("emerging (1 occurrence, no training) → emerging, monitor", () => {
  const evidence = makeEvidence({ totalOccurrences: 1, status: "emerging" });
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [], []);
  assert.equal(result.persistenceState, "emerging");
  assert.equal(result.recommendedEmphasis, "monitor");
});

test("emerging (2 occurrences, no training) → emerging, monitor", () => {
  const evidence = makeEvidence({ totalOccurrences: 2, status: "emerging" });
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [], []);
  assert.equal(result.persistenceState, "emerging");
  assert.equal(result.recommendedEmphasis, "monitor");
  assert.equal(result.confidence, "moderate");
});

test("recurring (3+ occurrences, no sessions) → recurring_no_training, increase", () => {
  const evidence = makeEvidence({ totalOccurrences: 4, status: "recurring" });
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [], []);
  assert.equal(result.persistenceState, "recurring_no_training");
  assert.equal(result.recommendedEmphasis, "increase");
  assert.equal(result.confidence, "high");
});

test("targeted session exists, 0 recurrences after → improving_after_training, reduce", () => {
  const evidence = makeEvidence({ totalOccurrences: 3 });
  const session = makeSession({ createdAt: "2025-06-15T00:00:00Z" });
  const history = makeHistory([
    { gameId: "g1", date: "2025-06-10T00:00:00Z" },
    { gameId: "g2", date: "2025-06-12T00:00:00Z" },
    { gameId: "g3", date: "2025-06-20T00:00:00Z", target: "endgame_technique" },
    { gameId: "g4", date: "2025-06-22T00:00:00Z", target: "endgame_technique" },
    { gameId: "g5", date: "2025-06-25T00:00:00Z", target: "strategic_planning" },
  ]);
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [session], history);
  assert.equal(result.persistenceState, "improving_after_training");
  assert.equal(result.recommendedEmphasis, "reduce");
  assert.equal(result.gamesAfterTraining, 3);
  assert.equal(result.recurrencesAfterTraining, 0);
  assert.equal(result.confidence, "high");
});

test("targeted session exists, low rate after → improving_after_training", () => {
  const evidence = makeEvidence({ totalOccurrences: 4 });
  const session = makeSession({ createdAt: "2025-06-15T00:00:00Z" });
  // 1 recurrence in 4 post-training games = 0.25 < 0.3
  const history = makeHistory([
    { gameId: "g1", date: "2025-06-10T00:00:00Z" },
    { gameId: "g2", date: "2025-06-20T00:00:00Z", target: "endgame_technique" },
    { gameId: "g3", date: "2025-06-22T00:00:00Z" }, // recurrence
    { gameId: "g4", date: "2025-06-24T00:00:00Z", target: "strategic_planning" },
    { gameId: "g5", date: "2025-06-26T00:00:00Z", target: "endgame_technique" },
  ]);
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [session], history);
  assert.equal(result.persistenceState, "improving_after_training");
  assert.equal(result.recurrencesAfterTraining, 1);
  assert.equal(result.gamesAfterTraining, 4);
});

test("targeted session exists, high rate after → persistent_despite_training, increase", () => {
  const evidence = makeEvidence({ totalOccurrences: 5 });
  const session = makeSession({ createdAt: "2025-06-15T00:00:00Z" });
  // 2 recurrences in 3 post-training games = 0.67 >= 0.3
  const history = makeHistory([
    { gameId: "g1", date: "2025-06-10T00:00:00Z" },
    { gameId: "g2", date: "2025-06-20T00:00:00Z" }, // recurrence
    { gameId: "g3", date: "2025-06-22T00:00:00Z", target: "endgame_technique" },
    { gameId: "g4", date: "2025-06-24T00:00:00Z" }, // recurrence
  ]);
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [session], history);
  assert.equal(result.persistenceState, "persistent_despite_training");
  assert.equal(result.recommendedEmphasis, "increase");
  assert.equal(result.recurrencesAfterTraining, 2);
  assert.equal(result.gamesAfterTraining, 3);
});

test("targeted session exists, <2 post-training games → recurring_limited_data, maintain", () => {
  const evidence = makeEvidence({ totalOccurrences: 3 });
  const session = makeSession({ createdAt: "2025-06-15T00:00:00Z" });
  // Only 1 game after training
  const history = makeHistory([
    { gameId: "g1", date: "2025-06-10T00:00:00Z" },
    { gameId: "g2", date: "2025-06-20T00:00:00Z", target: "endgame_technique" },
  ]);
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [session], history);
  assert.equal(result.persistenceState, "recurring_limited_data");
  assert.equal(result.recommendedEmphasis, "maintain");
  assert.equal(result.confidence, "low");
});

test("multiple targeted sessions, uses most recent date", () => {
  const evidence = makeEvidence({ totalOccurrences: 4 });
  const sessions = [
    makeSession({ sessionId: "s1", createdAt: "2025-06-10T00:00:00Z" }),
    makeSession({ sessionId: "s2", createdAt: "2025-06-20T00:00:00Z" }),
  ];
  // Games after the MOST RECENT session (June 20)
  const history = makeHistory([
    { gameId: "g1", date: "2025-06-05T00:00:00Z" },
    { gameId: "g2", date: "2025-06-15T00:00:00Z" }, // after s1 but before s2
    { gameId: "g3", date: "2025-06-25T00:00:00Z", target: "endgame_technique" },
    { gameId: "g4", date: "2025-06-28T00:00:00Z", target: "endgame_technique" },
  ]);
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, sessions, history);
  assert.equal(result.targetedSessionCount, 2);
  assert.equal(result.mostRecentTargetedSessionAt, "2025-06-20T00:00:00Z");
  assert.equal(result.gamesAfterTraining, 2);
  assert.equal(result.recurrencesAfterTraining, 0);
  assert.equal(result.persistenceState, "improving_after_training");
});

test("confidence=high when gamesAfterTraining >= 3", () => {
  const evidence = makeEvidence({ totalOccurrences: 3 });
  const session = makeSession({ createdAt: "2025-06-15T00:00:00Z" });
  const history = makeHistory([
    { gameId: "g1", date: "2025-06-20T00:00:00Z", target: "endgame_technique" },
    { gameId: "g2", date: "2025-06-22T00:00:00Z", target: "endgame_technique" },
    { gameId: "g3", date: "2025-06-24T00:00:00Z", target: "endgame_technique" },
  ]);
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [session], history);
  assert.equal(result.confidence, "high");
});

test("confidence=moderate when gamesAfterTraining 1-2", () => {
  const evidence = makeEvidence({ totalOccurrences: 3 });
  const session = makeSession({ createdAt: "2025-06-15T00:00:00Z" });
  const history = makeHistory([
    { gameId: "g1", date: "2025-06-20T00:00:00Z", target: "endgame_technique" },
    { gameId: "g2", date: "2025-06-22T00:00:00Z", target: "endgame_technique" },
  ]);
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [session], history);
  assert.equal(result.confidence, "moderate");
});

test("explanation text contains expected fragments", () => {
  const evidence = makeEvidence({ totalOccurrences: 4 });
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [], []);
  assert.ok(result.explanation.includes("4 times"), `Expected '4 times' in: ${result.explanation}`);
  assert.ok(
    result.explanation.includes("No targeted training"),
    `Expected 'No targeted training' in: ${result.explanation}`
  );
});

test("sessions for different target are ignored", () => {
  const evidence = makeEvidence({ totalOccurrences: 3 });
  const session = makeSession({
    primaryTarget: "endgame_technique",
    createdAt: "2025-06-15T00:00:00Z",
  });
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [session], []);
  // Should behave as if no targeted sessions exist
  assert.equal(result.persistenceState, "recurring_no_training");
  assert.equal(result.targetedSessionCount, 0);
});

test("current game is excluded from post-training counts", () => {
  const evidence = makeEvidence({ totalOccurrences: 3 });
  const session = makeSession({ createdAt: "2025-06-15T00:00:00Z" });
  const history = makeHistory([
    { gameId: "g1", date: "2025-06-20T00:00:00Z", target: "endgame_technique" },
    { gameId: "g2", date: "2025-06-22T00:00:00Z", target: "endgame_technique" },
    { gameId: "game-current", date: "2025-06-24T00:00:00Z" }, // current game — should be excluded
  ]);
  const result = evaluateCoachingMemory(TARGET, "game-current", evidence, [session], history);
  assert.equal(result.gamesAfterTraining, 2);
  assert.equal(result.recurrencesAfterTraining, 0);
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
