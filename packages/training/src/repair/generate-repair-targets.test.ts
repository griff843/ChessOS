/**
 * Unit tests for generateRepairTargets.
 *
 * Run: npx tsx packages/training/src/repair/generate-repair-targets.test.ts
 */

import { strict as assert } from "assert";
import { generateRepairTargets } from "./generate-repair-targets.js";
import type { GameLossDiagnosis, DiagnosisCategory, ContributingFactor } from "../diagnosis/types.js";

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

// ── Helpers ─────────────────────────────────────────────────────────

function makeDiagnosis(
  overrides: Partial<GameLossDiagnosis> & { primaryCategory: DiagnosisCategory }
): GameLossDiagnosis {
  return {
    gameId: "test-game",
    heroColor: "white",
    gameLost: true,
    losingMove: {
      positionId: "test-game:21",
      ply: 21,
      moveSan: "g4",
      fen: "",
      phase: "middlegame",
      label: "mistake",
      evalBefore: 156,
      evalAfter: -56,
      swingCp: 212,
    },
    contributingFactors: [],
    explanation: "Test explanation.",
    finalEvalCp: -277,
    totalCpLoss: 800,
    mistakeCount: 3,
    blunderCount: 1,
    diagnosedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeFactor(category: DiagnosisCategory, swingCp = 300): ContributingFactor {
  return {
    category,
    ply: 25,
    moveSan: "Nf3",
    swingCp,
    note: `${category} contributing factor`,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

console.log("\ngenerateRepairTargets tests\n");

test("opening_memory_failure maps to opening_line_recall", () => {
  const result = generateRepairTargets(
    makeDiagnosis({ primaryCategory: "opening_memory_failure" })
  );
  assert.equal(result.repairNeeded, true);
  assert.equal(result.primaryTarget, "opening_line_recall");
  assert.ok(result.primaryReason.length > 0);
  assert.equal(result.secondaryTargets.length, 0);
});

test("tactical_blunder maps to tactical_pattern_recognition + auto-injects candidate_move_generation", () => {
  const result = generateRepairTargets(
    makeDiagnosis({ primaryCategory: "tactical_blunder" })
  );
  assert.equal(result.primaryTarget, "tactical_pattern_recognition");
  assert.equal(result.secondaryTargets.length, 1);
  assert.equal(result.secondaryTargets[0].target, "candidate_move_generation");
  assert.equal(result.secondaryTargets[0].sourceCategory, "tactical_blunder");
});

test("time_trouble maps to time_management", () => {
  const result = generateRepairTargets(
    makeDiagnosis({ primaryCategory: "time_trouble" })
  );
  assert.equal(result.primaryTarget, "time_management");
  assert.equal(result.repairNeeded, true);
});

test("practical_collapse maps to practical_stabilization", () => {
  const result = generateRepairTargets(
    makeDiagnosis({ primaryCategory: "practical_collapse" })
  );
  assert.equal(result.primaryTarget, "practical_stabilization");
});

test("strategic_misjudgment maps to strategic_planning", () => {
  const result = generateRepairTargets(
    makeDiagnosis({ primaryCategory: "strategic_misjudgment" })
  );
  assert.equal(result.primaryTarget, "strategic_planning");
});

test("gameLost=false returns repairNeeded=false with empty secondaries", () => {
  const result = generateRepairTargets(
    makeDiagnosis({
      primaryCategory: "strategic_misjudgment",
      gameLost: false,
    })
  );
  assert.equal(result.repairNeeded, false);
  assert.equal(result.secondaryTargets.length, 0);
  assert.ok(result.summary.includes("No repair targets"));
});

test("contributing factors produce deduped secondary targets", () => {
  const result = generateRepairTargets(
    makeDiagnosis({
      primaryCategory: "tactical_blunder",
      contributingFactors: [
        makeFactor("calculation_failure"),
        makeFactor("time_trouble"),
        makeFactor("calculation_failure"), // duplicate — should be deduped
      ],
    })
  );
  assert.equal(result.primaryTarget, "tactical_pattern_recognition");
  // Should have: calculation_discipline, time_management, candidate_move_generation (auto-injected)
  const targets = result.secondaryTargets.map((s) => s.target);
  assert.ok(targets.includes("calculation_discipline"));
  assert.ok(targets.includes("time_management"));
  assert.ok(targets.includes("candidate_move_generation"));
  // No duplicates
  assert.equal(new Set(targets).size, targets.length);
});

test("contributing factor with same category as primary is excluded", () => {
  const result = generateRepairTargets(
    makeDiagnosis({
      primaryCategory: "calculation_failure",
      contributingFactors: [
        makeFactor("calculation_failure"), // same as primary — excluded
        makeFactor("time_trouble"),
      ],
    })
  );
  assert.equal(result.primaryTarget, "calculation_discipline");
  const targets = result.secondaryTargets.map((s) => s.target);
  assert.ok(!targets.includes("calculation_discipline"));
  assert.ok(targets.includes("time_management"));
});

test("tactical_blunder with contributing tactical_blunder dedupes and still injects candidate_move_generation", () => {
  const result = generateRepairTargets(
    makeDiagnosis({
      primaryCategory: "tactical_blunder",
      contributingFactors: [
        makeFactor("tactical_blunder"), // same as primary — excluded
      ],
    })
  );
  assert.equal(result.primaryTarget, "tactical_pattern_recognition");
  // Contributing tactical_blunder maps to tactical_pattern_recognition, same as primary — excluded
  // But candidate_move_generation should still be auto-injected
  const targets = result.secondaryTargets.map((s) => s.target);
  assert.ok(targets.includes("candidate_move_generation"));
  assert.ok(!targets.includes("tactical_pattern_recognition"));
});

// ── Summary ─────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
