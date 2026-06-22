/**
 * Unit tests for deterministic train/test split helpers.
 *
 * Run: pnpm exec tsx packages/training/src/model/train-test-split.test.ts
 */

import { strict as assert } from "assert";
import { splitDataset, stratifiedSplit } from "./train-test-split.js";

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

function ids(rows: Array<{ id: string }>): string[] {
  return rows.map((row) => row.id);
}

console.log("train-test-split tests:");

test("splitDataset is deterministic for the same seed", () => {
  const rows = Array.from({ length: 10 }, (_, index) => ({ id: `row-${index}` }));

  const first = splitDataset(rows, { train: 0.6, val: 0.2, test: 0.2 }, 7);
  const second = splitDataset(rows, { train: 0.6, val: 0.2, test: 0.2 }, 7);

  assert.deepEqual(ids(first.train), ids(second.train));
  assert.deepEqual(ids(first.val), ids(second.val));
  assert.deepEqual(ids(first.test), ids(second.test));
});

test("splitDataset uses ratio floors and sends the remainder to test", () => {
  const rows = Array.from({ length: 7 }, (_, index) => ({ id: `row-${index}` }));
  const split = splitDataset(rows, { train: 0.5, val: 0.25, test: 0.25 }, 3);

  assert.equal(split.train.length, 3);
  assert.equal(split.val.length, 1);
  assert.equal(split.test.length, 3);
  assert.equal(split.train.length + split.val.length + split.test.length, rows.length);
});

test("splitDataset does not mutate the input order", () => {
  const rows = Array.from({ length: 8 }, (_, index) => ({ id: `row-${index}` }));
  const before = ids(rows);

  splitDataset(rows, { train: 0.5, val: 0.25, test: 0.25 }, 11);

  assert.deepEqual(ids(rows), before);
});

test("stratifiedSplit preserves class counts by split", () => {
  const rows = [
    { id: "zero-1", target: 0 },
    { id: "zero-2", target: 0 },
    { id: "zero-3", target: 0 },
    { id: "zero-4", target: 0 },
    { id: "one-1", target: 1 },
    { id: "one-2", target: 1 },
    { id: "one-3", target: 1 },
    { id: "one-4", target: 1 },
  ];

  const split = stratifiedSplit(rows, (row) => row.target, { train: 0.5, val: 0.25, test: 0.25 }, 5);

  assert.equal(split.train.filter((row) => row.target === 0).length, 2);
  assert.equal(split.train.filter((row) => row.target === 1).length, 2);
  assert.equal(split.val.filter((row) => row.target === 0).length, 1);
  assert.equal(split.val.filter((row) => row.target === 1).length, 1);
  assert.equal(split.test.filter((row) => row.target === 0).length, 1);
  assert.equal(split.test.filter((row) => row.target === 1).length, 1);
});

test("stratifiedSplit treats non-1 targets as class 0", () => {
  const rows = [
    { id: "zero", target: 0 },
    { id: "negative", target: -1 },
    { id: "two", target: 2 },
    { id: "one", target: 1 },
  ];

  const split = stratifiedSplit(rows, (row) => row.target, { train: 1, val: 0, test: 0 }, 13);

  assert.equal(split.train.filter((row) => row.target === 1).length, 1);
  assert.equal(split.train.filter((row) => row.target !== 1).length, 3);
  assert.deepEqual(split.val, []);
  assert.deepEqual(split.test, []);
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
