/**
 * Unit tests for import result display helpers.
 *
 * Run: npx tsx apps/web/src/lib/import-results.test.ts
 */

import { strict as assert } from "assert";
import { formatImportThemeLabel, importPresetCategories } from "./import-results.js";

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

console.log("formatImportThemeLabel:");

test("known tactical_miss theme uses product label", () => {
  assert.equal(formatImportThemeLabel("tactical_miss"), "Tactical blindness");
});

test("known endgame_technique theme uses import label", () => {
  assert.equal(formatImportThemeLabel("endgame_technique"), "Endgame conversion");
});

test("unknown snake_case theme is title-cased", () => {
  assert.equal(formatImportThemeLabel("king_safety_gap"), "King Safety Gap");
});

test("unknown hyphenated theme is title-cased", () => {
  assert.equal(formatImportThemeLabel("space-advantage"), "Space Advantage");
});

test("unknown mixed-case theme is normalized", () => {
  assert.equal(formatImportThemeLabel("Pawn_CHAIN_issue"), "Pawn Chain Issue");
});

test("unknown theme trims and collapses separators", () => {
  assert.equal(formatImportThemeLabel("  loose__piece--alert  "), "Loose Piece Alert");
});

test("empty theme falls back to empty label", () => {
  assert.equal(formatImportThemeLabel(""), "");
});

console.log("\nimportPresetCategories:");

test("known preset returns expected categories", () => {
  assert.deepEqual(importPresetCategories("tactical_recovery"), [
    "tactical_miss",
    "calculation_error",
    "critical_defense",
  ]);
});

test("mixed preset has no category filter", () => {
  assert.equal(importPresetCategories("mixed_improvement"), null);
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
