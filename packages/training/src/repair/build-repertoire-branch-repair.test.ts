/**
 * Unit tests for buildRepertoireBranchRepair.
 *
 * Run: node packages/training/node_modules/.bin/tsx packages/training/src/repair/build-repertoire-branch-repair.test.ts
 */

import { strict as assert } from "assert";
import { buildRepertoireBranchRepair } from "./build-repertoire-branch-repair.js";
import { buildRepertoireMap } from "../repertoire/build-repertoire-map.js";
import type { GameLossDiagnosis, DiagnosisCategory } from "../diagnosis/types.js";

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

// ── Fixtures ─────────────────────────────────────────────────────────

const REPERTOIRE_MAP = buildRepertoireMap(new Date().toISOString());

function makeDiagnosis(
  category: DiagnosisCategory,
  overrides: Partial<GameLossDiagnosis> = {}
): GameLossDiagnosis {
  return {
    gameId: "test-game",
    heroColor: "white",
    gameLost: true,
    losingMove: {
      positionId: "test-game:9",
      ply: 9,
      moveSan: "Bd3",
      fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3",
      phase: "opening",
      label: "blunder",
      evalBefore: 20,
      evalAfter: -280,
      swingCp: 300,
    },
    contributingFactors: [],
    explanation: "Test opening failure explanation.",
    finalEvalCp: -350,
    totalCpLoss: 450,
    mistakeCount: 2,
    blunderCount: 1,
    diagnosedAt: new Date().toISOString(),
    primaryCategory: category,
    ...overrides,
  };
}

// ── Move sequences ────────────────────────────────────────────────────

// scotch_main: ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Nxd4"]
const SCOTCH_MAIN_MOVES = ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Nxd4", "Nf6", "Nc3"];

// scotch_gambit: ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Bc4"]
const SCOTCH_GAMBIT_MOVES = ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Bc4", "Nf6"];

// Only first 2 scotch moves (partial match)
const SCOTCH_PARTIAL_MOVES = ["e4", "e5", "f4", "d5"];

// black_open_spanish: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"]
const SPANISH_MOVES = ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6"];

// Completely unrelated — no seeded line matches
const UNRECOGNIZED_MOVES = ["a3", "a6", "b3", "b6", "c3", "c6", "d3", "d6"];

// ── Tests ─────────────────────────────────────────────────────────────

console.log("\nTest: buildRepertoireBranchRepair\n");

// 1. opening_memory_failure + full scotch moves → high confidence, line_recall
test("memory failure + scotch moves → matched, high confidence, line_recall", () => {
  const result = buildRepertoireBranchRepair(
    makeDiagnosis("opening_memory_failure"),
    SCOTCH_MAIN_MOVES,
    REPERTOIRE_MAP
  );
  assert.equal(result.matched, true, "should be matched");
  assert.equal(result.lineId, "scotch_main", `expected scotch_main, got ${result.lineId}`);
  assert.equal(result.confidence, "high", `expected high, got ${result.confidence}`);
  assert.equal(result.repairMode, "line_recall");
  assert.ok(result.matchedMoveCount >= 4, `expected ≥4 matched, got ${result.matchedMoveCount}`);
  assert.ok(result.drillLineId === "scotch_main");
  assert.ok(result.explanation.length > 0);
});

// 2. opening_concept_failure + same scotch moves → high confidence, concept_review
test("concept failure + scotch moves → matched, high confidence, concept_review", () => {
  const result = buildRepertoireBranchRepair(
    makeDiagnosis("opening_concept_failure"),
    SCOTCH_MAIN_MOVES,
    REPERTOIRE_MAP
  );
  assert.equal(result.matched, true);
  assert.equal(result.lineId, "scotch_main");
  assert.equal(result.confidence, "high");
  assert.equal(result.repairMode, "concept_review");
});

// 3. Non-opening diagnosis → matched=false immediately (short-circuit)
test("tactical_blunder → matched=false (short-circuit)", () => {
  const result = buildRepertoireBranchRepair(
    makeDiagnosis("tactical_blunder"),
    SCOTCH_MAIN_MOVES,
    REPERTOIRE_MAP
  );
  assert.equal(result.matched, false);
  assert.equal(result.lineId, null);
  assert.equal(result.drillLineId, null);
});

// 4. Unrecognized moves → matched=false (graceful fallback)
test("unrecognized moves → matched=false graceful fallback", () => {
  const result = buildRepertoireBranchRepair(
    makeDiagnosis("opening_memory_failure"),
    UNRECOGNIZED_MOVES,
    REPERTOIRE_MAP
  );
  assert.equal(result.matched, false);
  assert.equal(result.lineId, null);
  assert.equal(result.drillLineId, null);
  assert.equal(result.repairMode, "line_recall");
  assert.equal(
    result.explanation,
    "No seeded repertoire line matched this game's move order. Review the opening family first, then add the recurring line to the repertoire map before drilling exact recall."
  );
});

// 4b. Unrecognized concept failure → matched=false with concept review copy
test("unrecognized concept failure → matched=false with concept review copy", () => {
  const result = buildRepertoireBranchRepair(
    makeDiagnosis("opening_concept_failure"),
    UNRECOGNIZED_MOVES,
    REPERTOIRE_MAP
  );
  assert.equal(result.matched, false);
  assert.equal(result.lineId, null);
  assert.equal(result.drillLineId, null);
  assert.equal(result.repairMode, "concept_review");
  assert.equal(
    result.explanation,
    "No seeded repertoire line matched this game. Review the opening plans and pawn structures for this position type before drilling a specific branch."
  );
});

// 5. Partial scotch match (2 moves) → matched=true, medium confidence
test("partial scotch match (2 moves) → matched=true, medium confidence", () => {
  const result = buildRepertoireBranchRepair(
    makeDiagnosis("opening_memory_failure"),
    SCOTCH_PARTIAL_MOVES,
    REPERTOIRE_MAP
  );
  // e4, e5 match scotch → 2 moves
  assert.equal(result.matched, true, "should be matched");
  assert.equal(result.matchedMoveCount, 2, `expected 2, got ${result.matchedMoveCount}`);
  assert.equal(result.confidence, "medium", `expected medium, got ${result.confidence}`);
});

// 6. Black repertoire line (Spanish) → matched=true, black_open_spanish
test("Spanish moves → matched=true, black_open_spanish", () => {
  const result = buildRepertoireBranchRepair(
    makeDiagnosis("opening_memory_failure", { heroColor: "black" }),
    SPANISH_MOVES,
    REPERTOIRE_MAP
  );
  assert.equal(result.matched, true);
  assert.equal(result.lineId, "black_open_spanish", `got ${result.lineId}`);
  assert.equal(result.matchedMoveCount, 6);
  assert.equal(result.confidence, "high");
  assert.equal(result.openingFamily, "ruy_lopez");
});

// 7. Scotch gambit line → matches scotch_gambit over scotch_main
test("scotch gambit moves → matches scotch_gambit", () => {
  const result = buildRepertoireBranchRepair(
    makeDiagnosis("opening_memory_failure"),
    SCOTCH_GAMBIT_MOVES,
    REPERTOIRE_MAP
  );
  assert.equal(result.matched, true);
  // Both scotch_main and scotch_gambit share 6 moves prefix — gambit has Bc4 at index 6
  // The game plays Bc4 at index 6, matching scotch_gambit
  assert.equal(result.lineId, "scotch_gambit", `expected scotch_gambit, got ${result.lineId}`);
});

// 8. Deviation info is correctly computed
test("deviation ply and move are set when game leaves canonical line", () => {
  // Game plays scotch first 5 moves then deviates (Bg5 instead of Nxd4)
  const deviatingMoves = ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Bg5"];
  const result = buildRepertoireBranchRepair(
    makeDiagnosis("opening_memory_failure"),
    deviatingMoves,
    REPERTOIRE_MAP
  );
  assert.equal(result.matched, true);
  // Matches 6 moves of scotch_main (e4 e5 Nf3 Nc6 d4 exd4), then deviates at index 6
  assert.equal(result.matchedMoveCount, 6);
  assert.equal(result.firstDeviationPly, 7, `expected ply 7, got ${result.firstDeviationPly}`);
  assert.equal(result.firstDeviationMove, "Bg5");
  // White plays on odd plies (1,3,5,7...), index 6 is ply 7 → white move → deviationByUser=true (white_scotch)
  assert.equal(result.deviationByUser, true);
});

// 9. Stayed on path → firstDeviationPly is null
test("game stays on full canonical path → firstDeviationPly is null", () => {
  // scotch_main canonical: ["e4","e5","Nf3","Nc6","d4","exd4","Nxd4"] — 7 moves
  // game provides exactly those 7 moves
  const exactCanonical = ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Nxd4"];
  const result = buildRepertoireBranchRepair(
    makeDiagnosis("opening_memory_failure"),
    exactCanonical,
    REPERTOIRE_MAP
  );
  assert.equal(result.matched, true);
  assert.equal(result.firstDeviationPly, null, "should be null when game follows canonical fully");
});

// ── Summary ──────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
