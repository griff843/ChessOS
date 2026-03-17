/**
 * Unit tests for evaluateRepairEvidence.
 *
 * Run: npx tsx packages/training/src/repair/evaluate-repair-evidence.test.ts
 */

import { strict as assert } from "assert";
import { evaluateRepairEvidence } from "./evaluate-repair-evidence.js";
import type { DiagnosisHistoryEntry, RepairTarget } from "./types.js";

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

function makeEntry(
  gameId: string,
  primaryTarget: RepairTarget,
  daysAgo: number
): DiagnosisHistoryEntry {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return { gameId, primaryTarget, diagnosedAt: date.toISOString() };
}

// ── Tests ───────────────────────────────────────────────────────────

console.log("\nevaluateRepairEvidence tests\n");

test("isolated: empty history", () => {
  const result = evaluateRepairEvidence("calculation_discipline", "current", []);
  assert.equal(result.status, "isolated");
  assert.equal(result.totalOccurrences, 0);
  assert.equal(result.totalGamesAnalyzed, 0);
});

test("isolated: prior games exist but none match target", () => {
  const history = [
    makeEntry("g1", "time_management", 1),
    makeEntry("g2", "endgame_technique", 2),
  ];
  const result = evaluateRepairEvidence("calculation_discipline", "current", history);
  assert.equal(result.status, "isolated");
  assert.equal(result.totalOccurrences, 0);
  assert.equal(result.totalGamesAnalyzed, 2);
});

test("emerging: 1-2 recent occurrences", () => {
  const history = [
    makeEntry("g1", "calculation_discipline", 1),
    makeEntry("g2", "time_management", 2),
    makeEntry("g3", "calculation_discipline", 3),
  ];
  const result = evaluateRepairEvidence("calculation_discipline", "current", history);
  assert.equal(result.status, "emerging");
  assert.equal(result.totalOccurrences, 2);
  assert.equal(result.recentOccurrences, 2);
});

test("recurring: 3+ recent occurrences, no older", () => {
  const history = [
    makeEntry("g1", "tactical_pattern_recognition", 1),
    makeEntry("g2", "tactical_pattern_recognition", 2),
    makeEntry("g3", "tactical_pattern_recognition", 3),
    makeEntry("g4", "time_management", 4),
  ];
  const result = evaluateRepairEvidence("tactical_pattern_recognition", "current", history);
  assert.equal(result.status, "recurring");
  assert.equal(result.recentOccurrences, 3);
  assert.equal(result.olderOccurrences, 0);
});

test("persistent: 3+ recent AND 2+ older", () => {
  const history = [
    makeEntry("g1", "calculation_discipline", 1),
    makeEntry("g2", "calculation_discipline", 2),
    makeEntry("g3", "calculation_discipline", 3),
    makeEntry("g4", "time_management", 4),
    makeEntry("g5", "time_management", 5),
    // beyond recent window (positions 6+)
    makeEntry("g6", "calculation_discipline", 10),
    makeEntry("g7", "calculation_discipline", 15),
    makeEntry("g8", "time_management", 20),
  ];
  const result = evaluateRepairEvidence("calculation_discipline", "current", history);
  assert.equal(result.status, "persistent");
  assert.equal(result.recentOccurrences, 3);
  assert.equal(result.olderOccurrences, 2);
});

test("improving: fewer recent than older (ratio < 0.5)", () => {
  const history = [
    makeEntry("g1", "time_management", 1),
    makeEntry("g2", "endgame_technique", 2),
    makeEntry("g3", "time_management", 3),
    makeEntry("g4", "time_management", 4),
    makeEntry("g5", "time_management", 5),
    // beyond recent window
    makeEntry("g6", "calculation_discipline", 10),
    makeEntry("g7", "calculation_discipline", 15),
    makeEntry("g8", "calculation_discipline", 20),
  ];
  const result = evaluateRepairEvidence("calculation_discipline", "current", history);
  assert.equal(result.status, "improving");
  assert.equal(result.olderOccurrences, 3);
  assert.equal(result.recentOccurrences, 0);
});

test("current game is excluded from history", () => {
  const history = [
    makeEntry("current", "calculation_discipline", 1),
  ];
  const result = evaluateRepairEvidence("calculation_discipline", "current", history);
  assert.equal(result.status, "isolated");
  assert.equal(result.totalGamesAnalyzed, 0);
});

test("explanation contains target label", () => {
  const result = evaluateRepairEvidence("calculation_discipline", "current", []);
  assert.ok(result.explanation.length > 0);
  assert.ok(result.explanation.includes("calculation discipline"));
});

// ── Summary ─────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
