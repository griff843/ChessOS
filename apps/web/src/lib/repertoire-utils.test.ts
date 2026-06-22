/**
 * Unit tests for repertoire-utils pure helpers.
 *
 * Run: npx tsx apps/web/src/lib/repertoire-utils.test.ts
 */

import { strict as assert } from "assert";
import { findLineNameForId, formatDrillGrade } from "./repertoire-utils.js";

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

// ── findLineNameForId ─────────────────────────────────────────────────────────

console.log("findLineNameForId:");

const repairEntries = [
  { lineId: "scotch-main", lineName: "Scotch Game: Main Line" },
  { lineId: "italian-gc", lineName: "Italian Game: Giuoco Piano" },
];
const drillEntries = [
  { lineId: "ruy-berlin", lineName: "Ruy Lopez: Berlin Defence" },
  { lineId: "scotch-gc", lineName: "Scotch Game: Göring Gambit" },
];

test("found in repairEntries", () => {
  assert.equal(
    findLineNameForId("scotch-main", repairEntries, drillEntries),
    "Scotch Game: Main Line"
  );
});

test("found in drillEntries when not in repairEntries", () => {
  assert.equal(
    findLineNameForId("ruy-berlin", repairEntries, drillEntries),
    "Ruy Lopez: Berlin Defence"
  );
});

test("repairEntries takes priority over drillEntries for same lineId", () => {
  const repair = [{ lineId: "x", lineName: "From Repair" }];
  const drill = [{ lineId: "x", lineName: "From Drill" }];
  assert.equal(findLineNameForId("x", repair, drill), "From Repair");
});

test("not found → null", () => {
  assert.equal(
    findLineNameForId("unknown-id", repairEntries, drillEntries),
    null
  );
});

test("null lineId → null", () => {
  assert.equal(findLineNameForId(null, repairEntries, drillEntries), null);
});

test("undefined lineId → null", () => {
  assert.equal(findLineNameForId(undefined, repairEntries, drillEntries), null);
});

test("empty string lineId → null", () => {
  assert.equal(findLineNameForId("", repairEntries, drillEntries), null);
});

test("empty queues → null", () => {
  assert.equal(findLineNameForId("scotch-main", [], []), null);
});

test("first matching repair entry wins when repair entries repeat", () => {
  const repair = [
    { lineId: "repeat", lineName: "First Repair" },
    { lineId: "repeat", lineName: "Second Repair" },
  ];
  assert.equal(findLineNameForId("repeat", repair, []), "First Repair");
});

// ── formatDrillGrade ──────────────────────────────────────────────────────────

console.log("\nformatDrillGrade:");

test("exact_recall → human label", () => {
  assert.equal(formatDrillGrade("exact_recall"), "Exact recall");
});

test("partial_recall → human label with guidance", () => {
  assert.equal(
    formatDrillGrade("partial_recall"),
    "Partial recall — check the move order"
  );
});

test("failed → human label with action", () => {
  assert.equal(
    formatDrillGrade("failed"),
    "Not recalled — review this line soon"
  );
});

test("failed_recall → human label with action", () => {
  assert.equal(
    formatDrillGrade("failed_recall"),
    "Not recalled — review this line soon"
  );
});

test("unknown grade → capitalized fallback", () => {
  assert.equal(formatDrillGrade("some_new_grade"), "Some new grade");
});

test("unknown grade with repeated underscores preserves spacing fallback", () => {
  assert.equal(formatDrillGrade("line__recall"), "Line  recall");
});

test("already capitalized unknown grade keeps first character", () => {
  assert.equal(formatDrillGrade("Custom_grade"), "Custom grade");
});

test("empty string → empty string (edge case)", () => {
  assert.equal(formatDrillGrade(""), "");
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
