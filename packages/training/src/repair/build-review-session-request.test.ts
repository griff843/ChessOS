/**
 * Unit tests for buildReviewSessionRequest.
 *
 * Run: npx tsx packages/training/src/repair/build-review-session-request.test.ts
 */

import { strict as assert } from "assert";
import { buildReviewSessionRequest } from "./build-review-session-request.js";
import type { RepairTargetRecommendation, RepairEvidence, RepertoireBranchRepair } from "./types.js";

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

function makeRecommendation(overrides: Partial<RepairTargetRecommendation> = {}): RepairTargetRecommendation {
  return {
    gameId: "test-game",
    repairNeeded: true,
    primaryTarget: "tactical_pattern_recognition",
    primaryReason: "Tactical blunder in the middlegame",
    secondaryTargets: [
      { target: "calculation_discipline", sourceCategory: "calculation_failure", reason: "Contributing calculation error" },
    ],
    summary: "Focus on tactical patterns and calculation",
    generatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeEvidence(status: RepairEvidence["status"]): RepairEvidence {
  return {
    currentTarget: "tactical_pattern_recognition",
    status,
    totalOccurrences: 3,
    recentOccurrences: 2,
    olderOccurrences: 1,
    totalGamesAnalyzed: 5,
    explanation: "Test explanation",
  };
}

console.log("buildReviewSessionRequest tests:");

test("returns null when repairNeeded is false", () => {
  const result = buildReviewSessionRequest({
    sourceGameId: "g1",
    recommendation: makeRecommendation({ repairNeeded: false }),
    evidence: null,
    branchRepair: null,
  });
  assert.equal(result, null);
});

test("recurring evidence produces strong boost", () => {
  const result = buildReviewSessionRequest({
    sourceGameId: "g1",
    recommendation: makeRecommendation(),
    evidence: makeEvidence("recurring"),
    branchRepair: null,
  });
  assert.notEqual(result, null);
  assert.equal(result!.targetBoostStrength, "strong");
});

test("persistent evidence produces strong boost", () => {
  const result = buildReviewSessionRequest({
    sourceGameId: "g1",
    recommendation: makeRecommendation(),
    evidence: makeEvidence("persistent"),
    branchRepair: null,
  });
  assert.equal(result!.targetBoostStrength, "strong");
});

test("emerging evidence produces moderate boost", () => {
  const result = buildReviewSessionRequest({
    sourceGameId: "g1",
    recommendation: makeRecommendation(),
    evidence: makeEvidence("emerging"),
    branchRepair: null,
  });
  assert.equal(result!.targetBoostStrength, "moderate");
});

test("isolated evidence produces weak boost", () => {
  const result = buildReviewSessionRequest({
    sourceGameId: "g1",
    recommendation: makeRecommendation(),
    evidence: makeEvidence("isolated"),
    branchRepair: null,
  });
  assert.equal(result!.targetBoostStrength, "weak");
});

test("improving evidence produces none boost", () => {
  const result = buildReviewSessionRequest({
    sourceGameId: "g1",
    recommendation: makeRecommendation(),
    evidence: makeEvidence("improving"),
    branchRepair: null,
  });
  assert.equal(result!.targetBoostStrength, "none");
});

test("null evidence produces moderate boost", () => {
  const result = buildReviewSessionRequest({
    sourceGameId: "g1",
    recommendation: makeRecommendation(),
    evidence: null,
    branchRepair: null,
  });
  assert.equal(result!.targetBoostStrength, "moderate");
  assert.equal(result!.evidenceStatus, null);
});

test("extracts secondary targets correctly", () => {
  const rec = makeRecommendation({
    secondaryTargets: [
      { target: "calculation_discipline", sourceCategory: "calculation_failure", reason: "a" },
      { target: "strategic_planning", sourceCategory: "strategic_misjudgment", reason: "b" },
    ],
  });
  const result = buildReviewSessionRequest({
    sourceGameId: "g1",
    recommendation: rec,
    evidence: null,
    branchRepair: null,
  });
  assert.deepEqual(result!.secondaryTargets, ["calculation_discipline", "strategic_planning"]);
});

test("passes through branchRepairMatched flag", () => {
  const branchRepair = {
    matched: true,
    lineId: "scotch_main",
    lineName: "Scotch Game",
    repertoireKey: "white_scotch",
    repertoireName: "White Repertoire",
    openingFamily: "scotch_game" as const,
    matchedMoveCount: 5,
    firstDeviationPly: null,
    firstDeviationMove: null,
    deviationByUser: false,
    repairMode: "line_recall" as const,
    confidence: "high" as const,
    explanation: "Match",
    drillLineId: "scotch_main",
  } satisfies RepertoireBranchRepair;

  const result = buildReviewSessionRequest({
    sourceGameId: "g1",
    recommendation: makeRecommendation(),
    evidence: null,
    branchRepair,
  });
  assert.equal(result!.branchRepairMatched, true);
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
