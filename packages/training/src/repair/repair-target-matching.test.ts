/**
 * Unit tests for computeRepairTargetBoost.
 *
 * Run: npx tsx packages/training/src/repair/repair-target-matching.test.ts
 */

import { strict as assert } from "assert";
import { computeRepairTargetBoost, deriveEmphasisAwareBoostStrength } from "./repair-target-matching.js";
import type { ReviewSessionRequest } from "./types.js";
import type { LessonCategory } from "../exercises/types.js";

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

function makeRequest(overrides: Partial<ReviewSessionRequest> = {}): ReviewSessionRequest {
  return {
    sourceGameId: "test-game",
    primaryTarget: "tactical_pattern_recognition",
    secondaryTargets: [],
    evidenceStatus: "recurring",
    branchRepairMatched: false,
    targetBoostStrength: "strong",
    ...overrides,
  };
}

function makeExercise(lessonCategory: LessonCategory, phase = "middlegame") {
  return { lessonCategory, phase };
}

console.log("computeRepairTargetBoost tests:");

test("returns 0 when request is null", () => {
  assert.equal(computeRepairTargetBoost(makeExercise("tactical_miss"), null), 0);
});

test("returns 0 when request is undefined", () => {
  assert.equal(computeRepairTargetBoost(makeExercise("tactical_miss"), undefined), 0);
});

test("returns 0 when targetBoostStrength is none", () => {
  const req = makeRequest({ targetBoostStrength: "none" });
  assert.equal(computeRepairTargetBoost(makeExercise("tactical_miss"), req), 0);
});

test("primary match with strong strength returns 0.6", () => {
  const req = makeRequest({ targetBoostStrength: "strong", primaryTarget: "tactical_pattern_recognition" });
  assert.equal(computeRepairTargetBoost(makeExercise("tactical_miss"), req), 0.6);
});

test("primary match with moderate strength returns 0.4", () => {
  const req = makeRequest({ targetBoostStrength: "moderate", primaryTarget: "tactical_pattern_recognition" });
  assert.equal(computeRepairTargetBoost(makeExercise("tactical_miss"), req), 0.4);
});

test("primary match with weak strength returns 0.2", () => {
  const req = makeRequest({ targetBoostStrength: "weak", primaryTarget: "tactical_pattern_recognition" });
  assert.equal(computeRepairTargetBoost(makeExercise("tactical_miss"), req), 0.2);
});

test("secondary match returns half the primary boost", () => {
  const req = makeRequest({
    primaryTarget: "endgame_technique",
    secondaryTargets: ["tactical_pattern_recognition"],
    targetBoostStrength: "strong",
  });
  // endgame_technique maps to endgame_technique, not tactical_miss
  // secondary tactical_pattern_recognition maps to tactical_miss
  assert.equal(computeRepairTargetBoost(makeExercise("tactical_miss"), req), 0.3);
});

test("no match returns 0", () => {
  const req = makeRequest({ primaryTarget: "endgame_technique", secondaryTargets: [] });
  assert.equal(computeRepairTargetBoost(makeExercise("tactical_miss"), req), 0);
});

test("opening target with opening phase gets +0.1 bonus", () => {
  const req = makeRequest({
    primaryTarget: "opening_line_recall",
    targetBoostStrength: "moderate",
  });
  // opening_line_recall matches opening_inaccuracy; moderate = 0.4, + 0.1 phase bonus = 0.5
  assert.equal(computeRepairTargetBoost(makeExercise("opening_inaccuracy", "opening"), req), 0.5);
});

test("opening target with middlegame phase gets no phase bonus", () => {
  const req = makeRequest({
    primaryTarget: "opening_line_recall",
    targetBoostStrength: "moderate",
  });
  assert.equal(computeRepairTargetBoost(makeExercise("opening_inaccuracy", "middlegame"), req), 0.4);
});

test("non-opening target with opening phase gets no phase bonus", () => {
  const req = makeRequest({
    primaryTarget: "tactical_pattern_recognition",
    targetBoostStrength: "moderate",
  });
  assert.equal(computeRepairTargetBoost(makeExercise("tactical_miss", "opening"), req), 0.4);
});

test("opening phase bonus alone when no category match", () => {
  const req = makeRequest({
    primaryTarget: "opening_line_recall",
    secondaryTargets: [],
    targetBoostStrength: "strong",
  });
  // positional_error doesn't match opening_inaccuracy, but phase=opening + opening target = 0.1
  assert.equal(computeRepairTargetBoost(makeExercise("positional_error", "opening"), req), 0.1);
});

test("multiple secondaries: first match wins, no stacking", () => {
  const req = makeRequest({
    primaryTarget: "endgame_technique",
    secondaryTargets: ["tactical_pattern_recognition", "calculation_discipline"],
    targetBoostStrength: "strong",
  });
  // calculation_error matches calculation_discipline (secondary), tactical_miss matches tactical_pattern_recognition (secondary)
  // tactical_pattern_recognition is first in list, should match first
  assert.equal(computeRepairTargetBoost(makeExercise("tactical_miss"), req), 0.3);
  assert.equal(computeRepairTargetBoost(makeExercise("calculation_error"), req), 0.3);
});

test("practical_stabilization matches material_loss, tactical_miss, calculation_error", () => {
  const req = makeRequest({
    primaryTarget: "practical_stabilization",
    targetBoostStrength: "strong",
  });
  assert.equal(computeRepairTargetBoost(makeExercise("material_loss"), req), 0.6);
  assert.equal(computeRepairTargetBoost(makeExercise("tactical_miss"), req), 0.6);
  assert.equal(computeRepairTargetBoost(makeExercise("calculation_error"), req), 0.6);
  assert.equal(computeRepairTargetBoost(makeExercise("positional_error"), req), 0);
});

// ── deriveEmphasisAwareBoostStrength tests ─────────────────────────

console.log("\nderiveEmphasisAwareBoostStrength tests:");

test("increase emphasis → strong regardless of evidence", () => {
  assert.equal(deriveEmphasisAwareBoostStrength("isolated", "increase"), "strong");
  assert.equal(deriveEmphasisAwareBoostStrength("improving", "increase"), "strong");
});

test("maintain emphasis → moderate", () => {
  assert.equal(deriveEmphasisAwareBoostStrength("isolated", "maintain"), "moderate");
});

test("reduce emphasis → weak", () => {
  assert.equal(deriveEmphasisAwareBoostStrength("recurring", "reduce"), "weak");
});

test("monitor emphasis falls through: recurring → strong", () => {
  assert.equal(deriveEmphasisAwareBoostStrength("recurring", "monitor"), "strong");
});

test("monitor emphasis falls through: isolated → weak", () => {
  assert.equal(deriveEmphasisAwareBoostStrength("isolated", "monitor"), "weak");
});

test("monitor emphasis falls through: improving → none", () => {
  assert.equal(deriveEmphasisAwareBoostStrength("improving", "monitor"), "none");
});

test("null emphasis falls through: emerging → moderate", () => {
  assert.equal(deriveEmphasisAwareBoostStrength("emerging", null), "moderate");
});

test("undefined emphasis falls through: null evidence → moderate", () => {
  assert.equal(deriveEmphasisAwareBoostStrength(null, undefined), "moderate");
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
