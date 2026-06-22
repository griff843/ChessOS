/**
 * Unit tests for extractEngineAnswer.
 *
 * Run: pnpm exec tsx packages/training/src/exercises/extract-engine-answer.test.ts
 */

import { strict as assert } from "assert";
import { extractEngineAnswer } from "./extract-engine-answer.js";

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

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const BLACK_TO_MOVE_FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

console.log("extractEngineAnswer tests:");

test("extracts best move, SAN, PV, and white eval-after math", () => {
  const answer = extractEngineAnswer(
    STARTING_FEN,
    "e2e4",
    ["e2e4", "e7e5", "g1f3"],
    40,
    25,
    "white"
  );

  assert.equal(answer.bestMoveUci, "e2e4");
  assert.equal(answer.bestMoveSan, "e4");
  assert.deepEqual(answer.pv, ["e2e4", "e7e5", "g1f3"]);
  assert.equal(answer.evalBefore, 40);
  assert.equal(answer.evalAfter, 15);
  assert.equal(answer.evalSwing, 25);
});

test("uses black eval-after math from white perspective", () => {
  const answer = extractEngineAnswer(
    BLACK_TO_MOVE_FEN,
    "e7e5",
    ["e7e5", "g1f3"],
    20,
    35,
    "black"
  );

  assert.equal(answer.bestMoveUci, "e7e5");
  assert.equal(answer.bestMoveSan, "e5");
  assert.equal(answer.evalBefore, 20);
  assert.equal(answer.evalAfter, 55);
  assert.equal(answer.evalSwing, 35);
});

test("returns undefined SAN and empty PV when answer data is missing", () => {
  const answer = extractEngineAnswer(
    STARTING_FEN,
    undefined,
    undefined,
    -10,
    0,
    "white"
  );

  assert.equal(answer.bestMoveUci, undefined);
  assert.equal(answer.bestMoveSan, undefined);
  assert.deepEqual(answer.pv, []);
  assert.equal(answer.evalBefore, -10);
  assert.equal(answer.evalAfter, -10);
  assert.equal(answer.evalSwing, 0);
});

test("preserves an explicitly empty PV array", () => {
  const answer = extractEngineAnswer(
    STARTING_FEN,
    "g1f3",
    [],
    5,
    15,
    "white"
  );

  assert.equal(answer.bestMoveSan, "Nf3");
  assert.deepEqual(answer.pv, []);
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
