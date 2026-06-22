/**
 * Unit tests for user-facing session label helpers.
 *
 * Run: npx tsx apps/web/src/lib/session-label.test.ts
 */

import { strict as assert } from "assert";
import type { StudySession } from "@chess-os/training";
import { deriveSessionDisplayName, deriveSessionLabel } from "./session-label.js";

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

function makeSession(
  metadata: Partial<StudySession["metadata"]> = {},
  createdAt = "2026-06-22T12:00:00.000Z"
): StudySession {
  return {
    sessionId: "session-test",
    createdAt,
    exerciseCount: 0,
    exercises: [],
    metadata: {
      difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
      categoryDistribution: {},
      sourceGames: [],
      ...metadata,
    },
  };
}

console.log("deriveSessionLabel:");

test("known training objective uses product label", () => {
  assert.equal(
    deriveSessionLabel(
      makeSession({ trainingObjective: "tactical_pattern_recognition" })
    ),
    "Tactical Patterns"
  );
});

test("unknown training objective falls back to formatted snake case", () => {
  assert.equal(
    deriveSessionLabel(
      makeSession({
        trainingObjective: "opening_memory_focus" as StudySession["metadata"]["trainingObjective"],
      })
    ),
    "Opening Memory Focus"
  );
});

test("mixed exercise type session takes priority over category label", () => {
  assert.equal(
    deriveSessionLabel(
      makeSession({
        exerciseTypeMix: { tactical: 8, visualization: 2 },
        categoryDistribution: { calculation_error: 5 },
      })
    ),
    "Mixed Training"
  );
});

test("all tactical exercise type mix does not force mixed label", () => {
  assert.equal(
    deriveSessionLabel(
      makeSession({
        exerciseTypeMix: { tactical: 10 },
        categoryDistribution: { calculation_error: 5 },
      })
    ),
    "Calculation Error"
  );
});

test("dominant category becomes formatted label", () => {
  assert.equal(
    deriveSessionLabel(
      makeSession({
        categoryDistribution: {
          tactical_miss: 2,
          endgame_technique: 4,
          calculation_error: 4,
        },
      })
    ),
    "Endgame Technique"
  );
});

test("empty metadata falls back to study session label", () => {
  assert.equal(deriveSessionLabel(makeSession()), "Study Session");
});

console.log("\nderiveSessionDisplayName:");

test("display name appends short created date", () => {
  assert.equal(
    deriveSessionDisplayName(
      makeSession(
        { trainingObjective: "candidate_move_generation" },
        "2026-01-05T08:30:00.000Z"
      )
    ),
    "Candidate Moves — Jan 5"
  );
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
