/**
 * Tests for diagnose-game-loss.
 *
 * Run: npx tsx packages/training/src/diagnosis/diagnose-game-loss.test.ts
 */

import { strict as assert } from "assert";
import type { TrainingDatasetRow } from "../dataset/types.js";
import { diagnoseGameLoss } from "./diagnose-game-loss.js";

// ── Test Helpers ────────────────────────────────────────────────────

function makeRow(overrides: Partial<TrainingDatasetRow> & { ply: number; mover: "white" | "black" }): TrainingDatasetRow {
  const ply = overrides.ply;
  return {
    gameId: "test-game",
    positionId: `test-game:${ply}`,
    ply,
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    mover: overrides.mover,
    heroColor: null,
    perspective: "unknown",
    moveSan: overrides.moveSan ?? "e4",
    evalCp: overrides.evalCp ?? 0,
    depth: 20,
    swingCp: overrides.swingCp ?? 0,
    label: overrides.label ?? "best_or_ok",
    phase: overrides.phase ?? "middlegame",
    features: {} as TrainingDatasetRow["features"],
    ...(overrides.pv !== undefined ? { pv: overrides.pv } : {}),
  };
}

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

// ── Tests ───────────────────────────────────────────────────────────

console.log("diagnose-game-loss tests\n");

// ── 1. No loss detected ────────────────────────────────────────────

test("returns gameLost=false when game is equal", () => {
  const rows: TrainingDatasetRow[] = [
    makeRow({ ply: 1, mover: "white", evalCp: 20, swingCp: 10, label: "best_or_ok" }),
    makeRow({ ply: 2, mover: "black", evalCp: 10, swingCp: 15, label: "best_or_ok" }),
    makeRow({ ply: 3, mover: "white", evalCp: 25, swingCp: 5, label: "best_or_ok" }),
    makeRow({ ply: 4, mover: "black", evalCp: 20, swingCp: 10, label: "best_or_ok" }),
  ];

  const diagnosis = diagnoseGameLoss(rows, "white");
  assert.equal(diagnosis.gameLost, false);
  assert.equal(diagnosis.heroColor, "white");
});

// ── 2. Tactical blunder ────────────────────────────────────────────

test("identifies tactical blunder in middlegame", () => {
  // White has a balanced position, then blunders a piece
  const rows: TrainingDatasetRow[] = [
    makeRow({ ply: 1, mover: "white", evalCp: 30, swingCp: 10 }),
    makeRow({ ply: 2, mover: "black", evalCp: 20, swingCp: 5 }),
    makeRow({ ply: 3, mover: "white", evalCp: 25, swingCp: 5 }),
    makeRow({ ply: 4, mover: "black", evalCp: 20, swingCp: 10 }),
    // White blunders: eval was +30 from white perspective, swings 400cp
    // evalAfterWhite for white = evalCp - swingCp = 30 - 400 = -370
    makeRow({
      ply: 5,
      mover: "white",
      moveSan: "Ng5??",
      evalCp: 30,
      swingCp: 400,
      label: "blunder",
      phase: "middlegame",
    }),
    // After blunder, position stays lost
    makeRow({ ply: 6, mover: "black", evalCp: -370, swingCp: 10 }),
    makeRow({ ply: 7, mover: "white", evalCp: -360, swingCp: 20 }),
    makeRow({ ply: 8, mover: "black", evalCp: -380, swingCp: 5 }),
  ];

  const diagnosis = diagnoseGameLoss(rows, "white");
  assert.equal(diagnosis.gameLost, true);
  assert.equal(diagnosis.primaryCategory, "tactical_blunder");
  assert.equal(diagnosis.losingMove.ply, 5);
  assert.equal(diagnosis.losingMove.moveSan, "Ng5??");
  assert.equal(diagnosis.losingMove.swingCp, 400);
  assert.equal(diagnosis.blunderCount, 1);
});

// ── 3. Opening memory failure ──────────────────────────────────────

test("identifies opening memory failure", () => {
  const rows: TrainingDatasetRow[] = [
    makeRow({ ply: 1, mover: "white", evalCp: 20, swingCp: 5, phase: "opening" }),
    makeRow({ ply: 2, mover: "black", evalCp: 15, swingCp: 5, phase: "opening" }),
    // White blunders in the opening with a huge swing
    makeRow({
      ply: 3,
      mover: "white",
      moveSan: "f3??",
      evalCp: 20,
      swingCp: 350,
      label: "blunder",
      phase: "opening",
    }),
    makeRow({ ply: 4, mover: "black", evalCp: -330, swingCp: 10, phase: "opening" }),
    makeRow({ ply: 5, mover: "white", evalCp: -320, swingCp: 15, phase: "middlegame" }),
    makeRow({ ply: 6, mover: "black", evalCp: -335, swingCp: 10, phase: "middlegame" }),
  ];

  const diagnosis = diagnoseGameLoss(rows, "white");
  assert.equal(diagnosis.gameLost, true);
  assert.equal(diagnosis.primaryCategory, "opening_memory_failure");
  assert.equal(diagnosis.losingMove.ply, 3);
  assert.equal(diagnosis.losingMove.phase, "opening");
});

// ── 4. Opening concept failure (smaller opening error) ─────────────

test("identifies opening concept failure for moderate opening mistakes", () => {
  const rows: TrainingDatasetRow[] = [
    makeRow({ ply: 1, mover: "white", evalCp: 20, swingCp: 5, phase: "opening" }),
    makeRow({ ply: 2, mover: "black", evalCp: 15, swingCp: 10, phase: "opening" }),
    // White makes a moderate opening mistake (swing < 300 but > 150)
    makeRow({
      ply: 3,
      mover: "white",
      moveSan: "a4?",
      evalCp: 25,
      swingCp: 250,
      label: "mistake",
      phase: "opening",
    }),
    makeRow({ ply: 4, mover: "black", evalCp: -225, swingCp: 10, phase: "opening" }),
    makeRow({ ply: 5, mover: "white", evalCp: -215, swingCp: 20, phase: "middlegame" }),
    makeRow({ ply: 6, mover: "black", evalCp: -235, swingCp: 5, phase: "middlegame" }),
  ];

  const diagnosis = diagnoseGameLoss(rows, "white");
  assert.equal(diagnosis.gameLost, true);
  assert.equal(diagnosis.primaryCategory, "opening_concept_failure");
});

// ── 5. Practical collapse ──────────────────────────────────────────

test("identifies practical collapse when multiple errors cluster", () => {
  // White starts OK, makes an error, then collapses with consecutive mistakes
  const rows: TrainingDatasetRow[] = [
    makeRow({ ply: 1, mover: "white", evalCp: 50, swingCp: 10 }),
    makeRow({ ply: 2, mover: "black", evalCp: 40, swingCp: 5 }),
    // First error by white
    makeRow({ ply: 3, mover: "white", evalCp: 45, swingCp: 120, label: "mistake", moveSan: "Bc4" }),
    makeRow({ ply: 4, mover: "black", evalCp: -75, swingCp: 5 }),
    // Second error by white immediately
    makeRow({ ply: 5, mover: "white", evalCp: -70, swingCp: 160, label: "mistake", moveSan: "Nd2?" }),
    makeRow({ ply: 6, mover: "black", evalCp: -230, swingCp: 10 }),
    // Third error by white - full collapse
    makeRow({ ply: 7, mover: "white", evalCp: -220, swingCp: 200, label: "mistake", moveSan: "Qe2?" }),
    makeRow({ ply: 8, mover: "black", evalCp: -420, swingCp: 5 }),
    // Fourth error
    makeRow({ ply: 9, mover: "white", evalCp: -415, swingCp: 180, label: "mistake", moveSan: "Rf1?" }),
    makeRow({ ply: 10, mover: "black", evalCp: -595, swingCp: 10 }),
  ];

  const diagnosis = diagnoseGameLoss(rows, "white");
  assert.equal(diagnosis.gameLost, true);
  assert.equal(diagnosis.primaryCategory, "practical_collapse");
  // The losing move should NOT be the first error (ply 3), since collapse means it came after
  assert.ok(diagnosis.losingMove.ply > 3, "Losing move should be after initial error");
  assert.ok(diagnosis.contributingFactors.length > 0, "Should have contributing factors");
});

// ── 6. Time trouble pattern ────────────────────────────────────────

test("identifies time trouble when errors concentrate late in game", () => {
  // Long game with errors only in the last 25%
  const rows: TrainingDatasetRow[] = [];

  // Plies 1-30: clean play
  for (let ply = 1; ply <= 30; ply++) {
    rows.push(makeRow({
      ply,
      mover: ply % 2 === 1 ? "white" : "black",
      evalCp: 20,
      swingCp: 5,
    }));
  }

  // Plies 31-40: white collapses (last 25% of 40 plies = last 10)
  rows.push(makeRow({ ply: 31, mover: "white", evalCp: 20, swingCp: 200, label: "mistake", moveSan: "h4?" }));
  rows.push(makeRow({ ply: 32, mover: "black", evalCp: -180, swingCp: 5 }));
  rows.push(makeRow({ ply: 33, mover: "white", evalCp: -175, swingCp: 250, label: "blunder", moveSan: "g4??" }));
  rows.push(makeRow({ ply: 34, mover: "black", evalCp: -425, swingCp: 5 }));
  rows.push(makeRow({ ply: 35, mover: "white", evalCp: -420, swingCp: 300, label: "blunder", moveSan: "Kf1??" }));
  rows.push(makeRow({ ply: 36, mover: "black", evalCp: -720, swingCp: 5 }));
  rows.push(makeRow({ ply: 37, mover: "white", evalCp: -715, swingCp: 200, label: "mistake", moveSan: "Ke2?" }));
  rows.push(makeRow({ ply: 38, mover: "black", evalCp: -915, swingCp: 10 }));
  rows.push(makeRow({ ply: 39, mover: "white", evalCp: -905, swingCp: 150, label: "mistake", moveSan: "Kd3?" }));
  rows.push(makeRow({ ply: 40, mover: "black", evalCp: -1055, swingCp: 5 }));

  const diagnosis = diagnoseGameLoss(rows, "white");
  assert.equal(diagnosis.gameLost, true);
  assert.equal(diagnosis.primaryCategory, "time_trouble");
  assert.ok(diagnosis.mistakeCount >= 3, "Should have multiple mistakes");
  assert.ok(diagnosis.blunderCount >= 2, "Should have blunders");
});

// ── 7. Endgame technique failure ───────────────────────────────────

test("identifies endgame technique failure", () => {
  const rows: TrainingDatasetRow[] = [
    makeRow({ ply: 1, mover: "white", evalCp: 50, swingCp: 5, phase: "middlegame" }),
    makeRow({ ply: 2, mover: "black", evalCp: 45, swingCp: 5, phase: "middlegame" }),
    makeRow({ ply: 3, mover: "white", evalCp: 50, swingCp: 10, phase: "middlegame" }),
    makeRow({ ply: 4, mover: "black", evalCp: 40, swingCp: 5, phase: "middlegame" }),
    // White fails in the endgame
    makeRow({
      ply: 5,
      mover: "white",
      moveSan: "Kf2?",
      evalCp: 45,
      swingCp: 350,
      label: "blunder",
      phase: "endgame",
    }),
    makeRow({ ply: 6, mover: "black", evalCp: -305, swingCp: 10, phase: "endgame" }),
    makeRow({ ply: 7, mover: "white", evalCp: -295, swingCp: 20, phase: "endgame" }),
    makeRow({ ply: 8, mover: "black", evalCp: -315, swingCp: 5, phase: "endgame" }),
  ];

  const diagnosis = diagnoseGameLoss(rows, "white");
  assert.equal(diagnosis.gameLost, true);
  assert.equal(diagnosis.primaryCategory, "endgame_technique_failure");
  assert.equal(diagnosis.losingMove.phase, "endgame");
});

// ── 8. Calculation failure ─────────────────────────────────────────

test("identifies calculation failure with long PV", () => {
  const rows: TrainingDatasetRow[] = [
    makeRow({ ply: 1, mover: "white", evalCp: 30, swingCp: 5 }),
    makeRow({ ply: 2, mover: "black", evalCp: 25, swingCp: 5 }),
    // White miscalculates a deep line
    makeRow({
      ply: 3,
      mover: "white",
      moveSan: "Nxe5?",
      evalCp: 30,
      swingCp: 280,
      label: "mistake",
      phase: "middlegame",
      pv: ["e4e5", "d7d5", "e5d6", "c7d6", "f1b5", "b8c6", "d2d4"],
    }),
    makeRow({ ply: 4, mover: "black", evalCp: -250, swingCp: 10 }),
    makeRow({ ply: 5, mover: "white", evalCp: -240, swingCp: 15 }),
    makeRow({ ply: 6, mover: "black", evalCp: -255, swingCp: 5 }),
  ];

  const diagnosis = diagnoseGameLoss(rows, "white");
  assert.equal(diagnosis.gameLost, true);
  assert.equal(diagnosis.primaryCategory, "calculation_failure");
});

// ── 9. Strategic misjudgment (default/gradual) ─────────────────────

test("identifies strategic misjudgment for gradual decline", () => {
  // White gradually loses without a single catastrophic error
  const rows: TrainingDatasetRow[] = [
    makeRow({ ply: 1, mover: "white", evalCp: 30, swingCp: 5 }),
    makeRow({ ply: 2, mover: "black", evalCp: 25, swingCp: 5 }),
    makeRow({ ply: 3, mover: "white", evalCp: 30, swingCp: 80, label: "inaccuracy" }),
    makeRow({ ply: 4, mover: "black", evalCp: -50, swingCp: 5 }),
    makeRow({ ply: 5, mover: "white", evalCp: -45, swingCp: 90, label: "inaccuracy" }),
    makeRow({ ply: 6, mover: "black", evalCp: -135, swingCp: 5 }),
    // Moderate mistake, not a blunder, no long PV, not opening/endgame
    makeRow({
      ply: 7,
      mover: "white",
      moveSan: "Be3?",
      evalCp: -130,
      swingCp: 180,
      label: "mistake",
      phase: "middlegame",
    }),
    makeRow({ ply: 8, mover: "black", evalCp: -310, swingCp: 10 }),
    makeRow({ ply: 9, mover: "white", evalCp: -300, swingCp: 20 }),
    makeRow({ ply: 10, mover: "black", evalCp: -320, swingCp: 5 }),
  ];

  const diagnosis = diagnoseGameLoss(rows, "white");
  assert.equal(diagnosis.gameLost, true);
  assert.equal(diagnosis.primaryCategory, "strategic_misjudgment");
});

// ── 10. Infers loser from final eval ───────────────────────────────

test("infers heroColor from final eval when not provided", () => {
  const rows: TrainingDatasetRow[] = [
    makeRow({ ply: 1, mover: "white", evalCp: 20, swingCp: 5 }),
    makeRow({ ply: 2, mover: "black", evalCp: 15, swingCp: 5 }),
    // White blunders
    makeRow({
      ply: 3,
      mover: "white",
      evalCp: 20,
      swingCp: 400,
      label: "blunder",
      moveSan: "Bg5??",
    }),
    // evalAfterWhite = 20 - 400 = -380
    makeRow({ ply: 4, mover: "black", evalCp: -380, swingCp: 10 }),
  ];

  const diagnosis = diagnoseGameLoss(rows); // no heroColor
  assert.equal(diagnosis.heroColor, "white"); // should infer white lost
  assert.equal(diagnosis.gameLost, true);
});

// ── 11. Empty rows ─────────────────────────────────────────────────

test("handles empty rows gracefully", () => {
  const diagnosis = diagnoseGameLoss([]);
  assert.equal(diagnosis.gameLost, false);
  assert.equal(diagnosis.heroColor, null);
});

// ── 12. Contributing factors ───────────────────────────────────────

test("includes contributing factors for other significant errors", () => {
  const rows: TrainingDatasetRow[] = [
    makeRow({ ply: 1, mover: "white", evalCp: 50, swingCp: 5 }),
    makeRow({ ply: 2, mover: "black", evalCp: 45, swingCp: 5 }),
    // First mistake by white
    makeRow({
      ply: 3,
      mover: "white",
      evalCp: 50,
      swingCp: 120,
      label: "mistake",
      moveSan: "Nb3?",
    }),
    makeRow({ ply: 4, mover: "black", evalCp: -70, swingCp: 5 }),
    // Big blunder by white (the losing move)
    makeRow({
      ply: 5,
      mover: "white",
      evalCp: -65,
      swingCp: 400,
      label: "blunder",
      moveSan: "Qh5??",
    }),
    // evalAfterWhite = -65 - 400 = -465
    makeRow({ ply: 6, mover: "black", evalCp: -465, swingCp: 5 }),
  ];

  const diagnosis = diagnoseGameLoss(rows, "white");
  assert.equal(diagnosis.gameLost, true);
  // The losing move should be ply 5 (biggest swing, transition to losing)
  assert.equal(diagnosis.losingMove.ply, 5);
  // Contributing factor should include ply 3 (swing 120 >= 100 threshold)
  assert.equal(diagnosis.contributingFactors.length, 1);
  assert.equal(diagnosis.contributingFactors[0].ply, 3);
});

// ── 13. Black as hero ──────────────────────────────────────────────

test("works correctly when hero is black", () => {
  // Eval convention: evalCp is always from White's perspective
  // Black moves: evalAfterWhite = evalCp + swingCp
  const rows: TrainingDatasetRow[] = [
    makeRow({ ply: 1, mover: "white", evalCp: 30, swingCp: 5 }),
    // Black blunders: eval from white's perspective was 25 (good for white = bad for black)
    // After black's blunder: evalAfterWhite = 25 + 400 = 425 (even worse for black)
    makeRow({
      ply: 2,
      mover: "black",
      evalCp: 25,
      swingCp: 400,
      label: "blunder",
      moveSan: "d5??",
    }),
    makeRow({ ply: 3, mover: "white", evalCp: 425, swingCp: 10 }),
    makeRow({ ply: 4, mover: "black", evalCp: 415, swingCp: 15 }),
  ];

  const diagnosis = diagnoseGameLoss(rows, "black");
  assert.equal(diagnosis.gameLost, true);
  assert.equal(diagnosis.heroColor, "black");
  assert.equal(diagnosis.losingMove.ply, 2);
  // Hero eval before should be negative (black was worse even before blunder)
  // heroEval(25, "black") = -25
  assert.equal(diagnosis.losingMove.evalBefore, -25);
  // heroEval after = heroEval(425, "black") = -425
  assert.equal(diagnosis.losingMove.evalAfter, -425);
  assert.ok(diagnosis.finalEvalCp < -200, "Final eval should be negative for losing side");
});

// ── Summary ─────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
