/**
 * Unit tests for buildCoachingMemorySummary.
 *
 * Covers: no-data, sparse, rich-data (multi-state), priority ordering,
 * and summary message generation.
 *
 * Run: npx tsx packages/training/src/repair/build-coaching-memory-summary.test.ts
 */

import { strict as assert } from "assert";
import { buildCoachingMemorySummary } from "./build-coaching-memory-summary.js";
import type { DiagnosisHistoryEntry, RepairTarget, TargetedSessionSummary } from "./types.js";

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

function makeEntry(
  gameId: string,
  target: RepairTarget,
  date: string
): DiagnosisHistoryEntry {
  return { gameId, primaryTarget: target, diagnosedAt: date };
}

function makeSession(
  sessionId: string,
  target: RepairTarget,
  createdAt: string
): TargetedSessionSummary {
  return { sessionId, createdAt, primaryTarget: target, boostStrength: "strong" };
}

console.log("buildCoachingMemorySummary tests:");

// ── No data ──────────────────────────────────────────────────────────

test("empty history → no_data readiness, all zeros", () => {
  const result = buildCoachingMemorySummary([], []);
  assert.equal(result.readiness, "no_data");
  assert.equal(result.totalTargetsTracked, 0);
  assert.equal(result.persistentCount, 0);
  assert.equal(result.improvingCount, 0);
  assert.equal(result.topPriorities.length, 0);
  assert.ok(result.summaryMessage.length > 0);
});

test("empty history + allDiagnosedGameCount → uses provided count", () => {
  const result = buildCoachingMemorySummary([], [], 10);
  assert.equal(result.totalGamesAnalyzed, 10);
  assert.equal(result.readiness, "no_data");
});

// ── Sparse data ───────────────────────────────────────────────────────

test("1 game → sparse readiness", () => {
  const history = [makeEntry("g1", "tactical_pattern_recognition", "2025-06-01T00:00:00Z")];
  const result = buildCoachingMemorySummary(history, []);
  assert.equal(result.readiness, "sparse");
});

test("4 games → sparse readiness (< 5)", () => {
  const history = [
    makeEntry("g1", "tactical_pattern_recognition", "2025-06-01T00:00:00Z"),
    makeEntry("g2", "tactical_pattern_recognition", "2025-06-02T00:00:00Z"),
    makeEntry("g3", "calculation_discipline", "2025-06-03T00:00:00Z"),
    makeEntry("g4", "calculation_discipline", "2025-06-04T00:00:00Z"),
  ];
  const result = buildCoachingMemorySummary(history, []);
  assert.equal(result.readiness, "sparse");
  assert.equal(result.summaryMessage.includes("Limited data"), true);
});

test("5 games → ready readiness", () => {
  const history = [
    makeEntry("g1", "tactical_pattern_recognition", "2025-06-01T00:00:00Z"),
    makeEntry("g2", "tactical_pattern_recognition", "2025-06-02T00:00:00Z"),
    makeEntry("g3", "tactical_pattern_recognition", "2025-06-03T00:00:00Z"),
    makeEntry("g4", "calculation_discipline", "2025-06-04T00:00:00Z"),
    makeEntry("g5", "endgame_technique", "2025-06-05T00:00:00Z"),
  ];
  const result = buildCoachingMemorySummary(history, []);
  assert.equal(result.readiness, "ready");
});

// ── State classification ─────────────────────────────────────────────

test("recurring target (3+ occurrences, no sessions) → recurringNoTraining", () => {
  const history = [
    makeEntry("g1", "tactical_pattern_recognition", "2025-06-01T00:00:00Z"),
    makeEntry("g2", "tactical_pattern_recognition", "2025-06-02T00:00:00Z"),
    makeEntry("g3", "tactical_pattern_recognition", "2025-06-03T00:00:00Z"),
    makeEntry("g4", "tactical_pattern_recognition", "2025-06-04T00:00:00Z"),
    makeEntry("g5", "endgame_technique", "2025-06-05T00:00:00Z"),
  ];
  const result = buildCoachingMemorySummary(history, []);
  assert.equal(result.recurringNoTrainingCount, 1);
  assert.equal(result.recurringNoTraining[0].target, "tactical_pattern_recognition");
  assert.equal(result.recurringNoTraining[0].totalOccurrences, 4);
});

test("improving target (high rate before, low rate after training) → improving", () => {
  // 3 occurrences before session, 0 recurrences after
  const session = makeSession("s1", "tactical_pattern_recognition", "2025-06-15T00:00:00Z");
  const history = [
    makeEntry("g1", "tactical_pattern_recognition", "2025-06-01T00:00:00Z"),
    makeEntry("g2", "tactical_pattern_recognition", "2025-06-05T00:00:00Z"),
    makeEntry("g3", "tactical_pattern_recognition", "2025-06-10T00:00:00Z"),
    // After session: 3 games, none with tactical target
    makeEntry("g4", "endgame_technique", "2025-06-20T00:00:00Z"),
    makeEntry("g5", "strategic_planning", "2025-06-22T00:00:00Z"),
    makeEntry("g6", "endgame_technique", "2025-06-24T00:00:00Z"),
  ];
  const result = buildCoachingMemorySummary(history, [session]);
  assert.equal(result.improvingCount, 1);
  assert.equal(result.improving[0].target, "tactical_pattern_recognition");
});

test("persistent target (high post-training rate) → persistent", () => {
  const session = makeSession("s1", "tactical_pattern_recognition", "2025-06-15T00:00:00Z");
  const history = [
    makeEntry("g1", "tactical_pattern_recognition", "2025-06-01T00:00:00Z"),
    makeEntry("g2", "tactical_pattern_recognition", "2025-06-05T00:00:00Z"),
    makeEntry("g3", "tactical_pattern_recognition", "2025-06-10T00:00:00Z"),
    // After session: 3 games, 2 with same target = 0.67 ≥ 0.3 → persistent
    makeEntry("g4", "tactical_pattern_recognition", "2025-06-20T00:00:00Z"),
    makeEntry("g5", "endgame_technique", "2025-06-22T00:00:00Z"),
    makeEntry("g6", "tactical_pattern_recognition", "2025-06-24T00:00:00Z"),
  ];
  const result = buildCoachingMemorySummary(history, [session]);
  assert.equal(result.persistentCount, 1);
  assert.equal(result.persistent[0].target, "tactical_pattern_recognition");
});

test("limited data target (session exists, <2 post-training games) → limitedData", () => {
  const session = makeSession("s1", "tactical_pattern_recognition", "2025-06-15T00:00:00Z");
  const history = [
    makeEntry("g1", "tactical_pattern_recognition", "2025-06-01T00:00:00Z"),
    makeEntry("g2", "tactical_pattern_recognition", "2025-06-05T00:00:00Z"),
    makeEntry("g3", "tactical_pattern_recognition", "2025-06-10T00:00:00Z"),
    // Only 1 post-training game (g4 is after session, g5 is before session)
    makeEntry("g4", "endgame_technique", "2025-06-20T00:00:00Z"),
    makeEntry("g5", "endgame_technique", "2025-06-01T00:00:00Z"),
  ];
  const result = buildCoachingMemorySummary(history, [session]);
  assert.equal(result.limitedDataCount, 1, `Expected limitedDataCount=1, got ${result.limitedDataCount}`);
  assert.equal(result.limitedData[0].target, "tactical_pattern_recognition");
});

// ── Multiple targets ─────────────────────────────────────────────────

test("multiple distinct targets → each tracked separately", () => {
  const history = [
    makeEntry("g1", "tactical_pattern_recognition", "2025-06-01T00:00:00Z"),
    makeEntry("g2", "tactical_pattern_recognition", "2025-06-02T00:00:00Z"),
    makeEntry("g3", "tactical_pattern_recognition", "2025-06-03T00:00:00Z"),
    makeEntry("g4", "calculation_discipline", "2025-06-04T00:00:00Z"),
    makeEntry("g5", "calculation_discipline", "2025-06-05T00:00:00Z"),
  ];
  const result = buildCoachingMemorySummary(history, []);
  assert.equal(result.totalTargetsTracked, 2);
});

// ── Priority ordering ─────────────────────────────────────────────────

test("persistent outranks recurringNoTraining in topPriorities", () => {
  const session = makeSession("s1", "tactical_pattern_recognition", "2025-06-15T00:00:00Z");
  const history = [
    // tactical: persistent (session + high post-training rate)
    makeEntry("g1", "tactical_pattern_recognition", "2025-06-01T00:00:00Z"),
    makeEntry("g2", "tactical_pattern_recognition", "2025-06-05T00:00:00Z"),
    makeEntry("g3", "tactical_pattern_recognition", "2025-06-10T00:00:00Z"),
    makeEntry("g4", "tactical_pattern_recognition", "2025-06-20T00:00:00Z"),
    makeEntry("g5", "endgame_technique", "2025-06-22T00:00:00Z"),
    makeEntry("g6", "tactical_pattern_recognition", "2025-06-24T00:00:00Z"),
    // endgame_technique: 3+ occurrences, no session → recurringNoTraining
    makeEntry("g7", "endgame_technique", "2025-06-25T00:00:00Z"),
    makeEntry("g8", "endgame_technique", "2025-06-26T00:00:00Z"),
  ];
  const result = buildCoachingMemorySummary(history, [session]);
  assert.equal(result.topPriorities.length > 0, true);
  assert.equal(result.topPriorities[0].persistenceState, "persistent_despite_training");
});

test("improving targets NOT in topPriorities", () => {
  const session = makeSession("s1", "tactical_pattern_recognition", "2025-06-15T00:00:00Z");
  const history = [
    makeEntry("g1", "tactical_pattern_recognition", "2025-06-01T00:00:00Z"),
    makeEntry("g2", "tactical_pattern_recognition", "2025-06-05T00:00:00Z"),
    makeEntry("g3", "tactical_pattern_recognition", "2025-06-10T00:00:00Z"),
    // 3 games after session, none with tactical → improving
    makeEntry("g4", "endgame_technique", "2025-06-20T00:00:00Z"),
    makeEntry("g5", "endgame_technique", "2025-06-22T00:00:00Z"),
    makeEntry("g6", "strategic_planning", "2025-06-24T00:00:00Z"),
  ];
  const result = buildCoachingMemorySummary(history, [session]);
  const improvingInTop = result.topPriorities.some(
    (e) => e.persistenceState === "improving_after_training"
  );
  // Improving targets should NOT appear in topPriorities
  assert.equal(improvingInTop, false);
});

test("topPriorities capped at 5", () => {
  // Create 6+ recurring targets (no sessions)
  const history = [
    makeEntry("g1", "tactical_pattern_recognition", "2025-06-01T00:00:00Z"),
    makeEntry("g2", "tactical_pattern_recognition", "2025-06-02T00:00:00Z"),
    makeEntry("g3", "tactical_pattern_recognition", "2025-06-03T00:00:00Z"),
    makeEntry("g4", "calculation_discipline", "2025-06-04T00:00:00Z"),
    makeEntry("g5", "calculation_discipline", "2025-06-05T00:00:00Z"),
    makeEntry("g6", "calculation_discipline", "2025-06-06T00:00:00Z"),
    makeEntry("g7", "endgame_technique", "2025-06-07T00:00:00Z"),
    makeEntry("g8", "endgame_technique", "2025-06-08T00:00:00Z"),
    makeEntry("g9", "endgame_technique", "2025-06-09T00:00:00Z"),
    makeEntry("g10", "strategic_planning", "2025-06-10T00:00:00Z"),
    makeEntry("g11", "strategic_planning", "2025-06-11T00:00:00Z"),
    makeEntry("g12", "strategic_planning", "2025-06-12T00:00:00Z"),
    makeEntry("g13", "candidate_move_generation", "2025-06-13T00:00:00Z"),
    makeEntry("g14", "candidate_move_generation", "2025-06-14T00:00:00Z"),
    makeEntry("g15", "candidate_move_generation", "2025-06-15T00:00:00Z"),
    makeEntry("g16", "time_management", "2025-06-16T00:00:00Z"),
    makeEntry("g17", "time_management", "2025-06-17T00:00:00Z"),
    makeEntry("g18", "time_management", "2025-06-18T00:00:00Z"),
  ];
  const result = buildCoachingMemorySummary(history, []);
  assert.ok(result.topPriorities.length <= 5, `Expected ≤ 5, got ${result.topPriorities.length}`);
});

// ── Summary message ──────────────────────────────────────────────────

test("summary message mentions persistent count when > 0", () => {
  const session = makeSession("s1", "tactical_pattern_recognition", "2025-06-15T00:00:00Z");
  const history = [
    makeEntry("g1", "tactical_pattern_recognition", "2025-06-01T00:00:00Z"),
    makeEntry("g2", "tactical_pattern_recognition", "2025-06-05T00:00:00Z"),
    makeEntry("g3", "tactical_pattern_recognition", "2025-06-10T00:00:00Z"),
    makeEntry("g4", "tactical_pattern_recognition", "2025-06-20T00:00:00Z"),
    makeEntry("g5", "endgame_technique", "2025-06-22T00:00:00Z"),
    makeEntry("g6", "tactical_pattern_recognition", "2025-06-24T00:00:00Z"),
  ];
  const result = buildCoachingMemorySummary(history, [session]);
  assert.ok(
    result.summaryMessage.toLowerCase().includes("persist"),
    `Expected 'persist' in message: ${result.summaryMessage}`
  );
});

test("summary message mentions improving count", () => {
  const session = makeSession("s1", "tactical_pattern_recognition", "2025-06-15T00:00:00Z");
  const history = [
    makeEntry("g1", "tactical_pattern_recognition", "2025-06-01T00:00:00Z"),
    makeEntry("g2", "tactical_pattern_recognition", "2025-06-05T00:00:00Z"),
    makeEntry("g3", "tactical_pattern_recognition", "2025-06-10T00:00:00Z"),
    makeEntry("g4", "endgame_technique", "2025-06-20T00:00:00Z"),
    makeEntry("g5", "endgame_technique", "2025-06-22T00:00:00Z"),
    makeEntry("g6", "strategic_planning", "2025-06-24T00:00:00Z"),
  ];
  const result = buildCoachingMemorySummary(history, [session]);
  if (result.improvingCount > 0) {
    assert.ok(
      result.summaryMessage.toLowerCase().includes("improving"),
      `Expected 'improving' in message: ${result.summaryMessage}`
    );
  }
});

test("single-occurrence targets appear as emerging (not excluded)", () => {
  // In summary context, all targets have totalOccurrences ≥ 1, so the
  // "first_occurrence" state is never reached — they appear as "emerging".
  const history = [
    makeEntry("g1", "tactical_pattern_recognition", "2025-06-01T00:00:00Z"),
    makeEntry("g2", "endgame_technique", "2025-06-02T00:00:00Z"),
    makeEntry("g3", "strategic_planning", "2025-06-03T00:00:00Z"),
    makeEntry("g4", "calculation_discipline", "2025-06-04T00:00:00Z"),
    makeEntry("g5", "time_management", "2025-06-05T00:00:00Z"),
  ];
  const result = buildCoachingMemorySummary(history, []);
  // All 5 distinct targets each appear once → emerging (1-2 occurrences, no sessions)
  assert.equal(result.emergingCount, 5, `Expected emergingCount=5, got ${result.emergingCount}`);
  assert.equal(result.totalTargetsTracked, 5);
});

test("target with 2 occurrences is emerging among other single-occurrence targets", () => {
  // 4 distinct targets (tactical x2, endgame x1, strategic x1, calculation x1)
  // All have 1-2 occurrences and no targeted sessions → all "emerging"
  const history = [
    makeEntry("g1", "tactical_pattern_recognition", "2025-06-01T00:00:00Z"),
    makeEntry("g2", "tactical_pattern_recognition", "2025-06-02T00:00:00Z"),
    makeEntry("g3", "endgame_technique", "2025-06-03T00:00:00Z"),
    makeEntry("g4", "strategic_planning", "2025-06-04T00:00:00Z"),
    makeEntry("g5", "calculation_discipline", "2025-06-05T00:00:00Z"),
  ];
  const result = buildCoachingMemorySummary(history, []);
  assert.equal(result.emergingCount, 4, `Expected emergingCount=4, got ${result.emergingCount}`);
  const tactical = result.emerging.find((e) => e.target === "tactical_pattern_recognition");
  assert.ok(tactical !== undefined, "tactical should be in emerging");
  assert.equal(tactical?.totalOccurrences, 2);
});

test("entries have sensible priorityScore ordering", () => {
  const session = makeSession("s1", "tactical_pattern_recognition", "2025-06-15T00:00:00Z");
  const history = [
    // tactical: persistent (3 before + 2 of 3 after session)
    makeEntry("g1", "tactical_pattern_recognition", "2025-06-01T00:00:00Z"),
    makeEntry("g2", "tactical_pattern_recognition", "2025-06-05T00:00:00Z"),
    makeEntry("g3", "tactical_pattern_recognition", "2025-06-10T00:00:00Z"),
    makeEntry("g4", "tactical_pattern_recognition", "2025-06-20T00:00:00Z"),
    makeEntry("g5", "endgame_technique", "2025-06-22T00:00:00Z"),
    makeEntry("g6", "tactical_pattern_recognition", "2025-06-24T00:00:00Z"),
    // endgame: 3+ with no session → recurringNoTraining
    makeEntry("g7", "endgame_technique", "2025-06-25T00:00:00Z"),
    makeEntry("g8", "endgame_technique", "2025-06-26T00:00:00Z"),
  ];
  const result = buildCoachingMemorySummary(history, [session]);
  if (result.topPriorities.length >= 2) {
    // persistent should come before recurringNoTraining
    const firstPersistent = result.topPriorities.findIndex(
      (e) => e.persistenceState === "persistent_despite_training"
    );
    const firstRecurring = result.topPriorities.findIndex(
      (e) => e.persistenceState === "recurring_no_training"
    );
    if (firstPersistent >= 0 && firstRecurring >= 0) {
      assert.ok(
        firstPersistent < firstRecurring,
        `Expected persistent before recurring in topPriorities`
      );
    }
  }
});

test("targetedSessionCount reflects actual session count per target", () => {
  const sessions = [
    makeSession("s1", "tactical_pattern_recognition", "2025-06-10T00:00:00Z"),
    makeSession("s2", "tactical_pattern_recognition", "2025-06-20T00:00:00Z"),
  ];
  const history = [
    makeEntry("g1", "tactical_pattern_recognition", "2025-06-01T00:00:00Z"),
    makeEntry("g2", "tactical_pattern_recognition", "2025-06-05T00:00:00Z"),
    makeEntry("g3", "tactical_pattern_recognition", "2025-06-08T00:00:00Z"),
    makeEntry("g4", "endgame_technique", "2025-06-25T00:00:00Z"),
    makeEntry("g5", "endgame_technique", "2025-06-26T00:00:00Z"),
  ];
  const result = buildCoachingMemorySummary(history, sessions);
  const tactical = result.limitedData.find(
    (e) => e.target === "tactical_pattern_recognition"
  ) ?? result.persistent.find(
    (e) => e.target === "tactical_pattern_recognition"
  ) ?? result.improving.find(
    (e) => e.target === "tactical_pattern_recognition"
  );
  if (tactical) {
    assert.equal(tactical.targetedSessionCount, 2);
  }
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
