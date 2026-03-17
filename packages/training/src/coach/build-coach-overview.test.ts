/**
 * Unit tests for buildCoachOverview.
 *
 * Run: tsx packages/training/src/coach/build-coach-overview.test.ts
 */

import { strict as assert } from "assert";
import { buildCoachOverview } from "./build-coach-overview.js";
import type { CoachingMemorySummary, CoachingMemoryEntry } from "../repair/types.js";

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

// ── Helpers ───────────────────────────────────────────────────────────

function makeEntry(
  target: string,
  persistenceState: string,
  totalOccurrences = 3
): CoachingMemoryEntry {
  return {
    target: target as CoachingMemoryEntry["target"],
    persistenceState: persistenceState as CoachingMemoryEntry["persistenceState"],
    confidence: "high",
    recommendedEmphasis: "increase",
    totalOccurrences,
    targetedSessionCount: 2,
    explanation: "test explanation",
    priorityScore: 0.8,
  };
}

function makeMemorySummary(overrides: Partial<CoachingMemorySummary> = {}): CoachingMemorySummary {
  return {
    generatedAt: new Date().toISOString(),
    readiness: "ready",
    totalGamesAnalyzed: 10,
    totalTargetsTracked: 2,
    persistent: [],
    improving: [],
    recurringNoTraining: [],
    limitedData: [],
    emerging: [],
    persistentCount: 0,
    improvingCount: 0,
    recurringNoTrainingCount: 0,
    limitedDataCount: 0,
    emergingCount: 0,
    topPriorities: [],
    summaryMessage: "test",
    ...overrides,
  };
}

function makeRepairQueue(urgency = "line_deviation") {
  return {
    entries: [
      { lineId: "scotch_main", lineName: "Scotch Game Mainline", repairUrgency: urgency },
    ],
  };
}

function makeCoachingSummary(nextStep = "Focus on opening recall.") {
  return { nextStepStatement: nextStep };
}

// ── Tests ─────────────────────────────────────────────────────────────

console.log("buildCoachOverview:");

test("1. persistent entry → repair readiness + start_session next action", () => {
  const persistentEntry = makeEntry("opening_line_recall", "persistent_despite_training");
  const summary = makeMemorySummary({
    persistent: [persistentEntry],
    persistentCount: 1,
    topPriorities: [persistentEntry],
  });
  const overview = buildCoachOverview(summary, null, null);
  assert.equal(overview.readiness, "repair");
  assert.equal(overview.nextAction.type, "start_session");
  assert.equal(overview.nextAction.href, "/study");
});

test("2. immediate opening repair + persistent → drill_opening takes priority", () => {
  const persistentEntry = makeEntry("opening_line_recall", "persistent_despite_training");
  const summary = makeMemorySummary({
    persistent: [persistentEntry],
    persistentCount: 1,
    topPriorities: [persistentEntry],
  });
  const overview = buildCoachOverview(summary, makeRepairQueue("immediate_repair"), null);
  assert.equal(overview.nextAction.type, "drill_opening");
  assert.ok(overview.nextAction.href.includes("preferredLineId=scotch_main"));
});

test("3. only improving entries → consolidate readiness", () => {
  const improvingEntry = makeEntry("tactical_pattern_recognition", "improving_after_training");
  const summary = makeMemorySummary({
    improving: [improvingEntry],
    improvingCount: 1,
    topPriorities: [],  // improving excluded from topPriorities
  });
  const overview = buildCoachOverview(summary, null, null);
  assert.equal(overview.readiness, "consolidate");
});

test("4. null inputs → insufficient_data + monitor action", () => {
  const overview = buildCoachOverview(null, null, null);
  assert.equal(overview.readiness, "insufficient_data");
  assert.equal(overview.nextAction.type, "monitor");
  assert.equal(overview.primaryFocus, null);
  assert.equal(overview.openingPriority, null);
  assert.deepEqual(overview.improvingAreas, []);
  assert.equal(overview.summary, null);
});

test("5. improving areas capped at 2", () => {
  const entries = [
    makeEntry("opening_line_recall", "improving_after_training"),
    makeEntry("tactical_pattern_recognition", "improving_after_training"),
    makeEntry("calculation_discipline", "improving_after_training"),
    makeEntry("endgame_technique", "improving_after_training"),
  ];
  const summary = makeMemorySummary({
    improving: entries,
    improvingCount: 4,
    topPriorities: [],
  });
  const overview = buildCoachOverview(summary, null, null);
  assert.equal(overview.improvingAreas.length, 2);
});

test("6. summary forwarded from coachingSummary.nextStepStatement", () => {
  const overview = buildCoachOverview(
    null,
    null,
    makeCoachingSummary("Work on your opening repertoire.")
  );
  assert.equal(overview.summary, "Work on your opening repertoire.");
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
