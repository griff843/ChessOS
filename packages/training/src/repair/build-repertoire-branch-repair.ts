/**
 * Branch-aware opening repair matching.
 *
 * Given a GameLossDiagnosis, the game's move sequence, and the seeded
 * RepertoireMap, finds the nearest repertoire line match and returns a
 * typed RepertoireBranchRepair describing the specific opening branch
 * implicated and the recommended repair mode.
 *
 * Pure function — no I/O, fully deterministic.
 * Only active for opening_memory_failure and opening_concept_failure.
 * Degrades gracefully when no trustworthy branch match exists.
 */

import type { GameLossDiagnosis } from "../diagnosis/types.js";
import type { RepertoireMap } from "../repertoire/types.js";
import type {
  BranchRepairConfidence,
  BranchRepairMode,
  RepertoireBranchRepair,
} from "./types.js";

// ── Constants ────────────────────────────────────────────────────────

const OPENING_DIAGNOSIS_CATEGORIES = new Set([
  "opening_memory_failure",
  "opening_concept_failure",
] as const);

/** Minimum matched moves to return a result at all. */
const MIN_MATCH = 1;

/** Matched move thresholds for confidence bands. */
const MEDIUM_THRESHOLD = 2;
const HIGH_THRESHOLD = 4;

// ── Helpers ──────────────────────────────────────────────────────────

function normalizeSan(move: string): string {
  return move.replace(/[+#?!]+/g, "").trim();
}

function matchScore(moves: string[], canonicalMoves: string[]): number {
  let matched = 0;
  for (let i = 0; i < canonicalMoves.length; i += 1) {
    if (moves[i] !== canonicalMoves[i]) break;
    matched += 1;
  }
  return matched;
}

/**
 * Returns true when the move at deviationIndex is the user's move
 * (i.e. a move made by the repertoireSide player).
 * White plays at even indices (0-based), black at odd.
 */
function isUserDeviation(
  repertoireSide: "white" | "black",
  deviationIndex: number
): boolean {
  return repertoireSide === "white"
    ? deviationIndex % 2 === 0
    : deviationIndex % 2 === 1;
}

function computeConfidence(matchedCount: number): BranchRepairConfidence {
  if (matchedCount >= HIGH_THRESHOLD) return "high";
  if (matchedCount >= MEDIUM_THRESHOLD) return "medium";
  return "low";
}

function buildExplanation(args: {
  matched: boolean;
  lineName: string | null;
  repertoireName: string | null;
  matchedMoveCount: number;
  firstDeviationPly: number | null;
  firstDeviationMove: string | null;
  deviationByUser: boolean;
  repairMode: BranchRepairMode;
  confidence: BranchRepairConfidence;
  diagnosisCategory: string;
}): string {
  if (!args.matched) {
    return args.diagnosisCategory === "opening_memory_failure"
      ? "No seeded repertoire line matched this game's move order. Review the opening family first, then add the recurring line to the repertoire map before drilling exact recall."
      : "No seeded repertoire line matched this game. Review the opening plans and pawn structures for this position type before drilling a specific branch.";
  }

  const {
    lineName,
    repertoireName,
    matchedMoveCount,
    firstDeviationPly,
    firstDeviationMove,
    deviationByUser,
    repairMode,
    confidence,
  } = args;

  const lineRef = lineName ?? "this line";
  const repRef = repertoireName ? ` (${repertoireName})` : "";
  const confidenceNote =
    confidence === "high"
      ? ""
      : confidence === "medium"
        ? " (partial match — line may overlap with another opening)"
        : " (weak match — only the opening moves align)";

  let deviationNote = "";
  if (firstDeviationPly !== null && firstDeviationMove) {
    deviationNote = deviationByUser
      ? ` The game left the seeded path at move ${Math.ceil(firstDeviationPly / 2)} (ply ${firstDeviationPly}) with ${firstDeviationMove}.`
      : ` The opponent deviated first at ply ${firstDeviationPly} with ${firstDeviationMove}.`;
  } else if (firstDeviationPly === null) {
    deviationNote = " The game followed the seeded line through its full modelled depth.";
  }

  const repairNote =
    repairMode === "line_recall"
      ? " Drill the canonical move order to reinforce memorisation."
      : " Review the strategic concepts and typical structures of this branch.";

  return `This game maps to ${lineRef}${repRef}${confidenceNote}.${deviationNote}${repairNote}`;
}

// ── Empty / no-match result builder ─────────────────────────────────

function noMatchResult(
  category: string,
  repairMode: BranchRepairMode
): RepertoireBranchRepair {
  return {
    matched: false,
    lineId: null,
    lineName: null,
    repertoireKey: null,
    repertoireName: null,
    openingFamily: null,
    matchedMoveCount: 0,
    firstDeviationPly: null,
    firstDeviationMove: null,
    deviationByUser: false,
    repairMode,
    confidence: "low",
    explanation: buildExplanation({
      matched: false,
      lineName: null,
      repertoireName: null,
      matchedMoveCount: 0,
      firstDeviationPly: null,
      firstDeviationMove: null,
      deviationByUser: false,
      repairMode,
      confidence: "low",
      diagnosisCategory: category,
    }),
    drillLineId: null,
  };
}

// ── Main Function ────────────────────────────────────────────────────

/**
 * Build a branch-aware opening repair recommendation.
 *
 * @param diagnosis   - A complete GameLossDiagnosis.
 * @param gameMoves   - SAN move strings in game order (from training-dataset.json).
 * @param repertoireMap - The seeded RepertoireMap.
 * @returns A deterministic RepertoireBranchRepair.
 */
export function buildRepertoireBranchRepair(
  diagnosis: GameLossDiagnosis,
  gameMoves: string[],
  repertoireMap: RepertoireMap
): RepertoireBranchRepair {
  const category = diagnosis.primaryCategory;

  // Only applies to opening-related diagnoses
  if (!OPENING_DIAGNOSIS_CATEGORIES.has(category as "opening_memory_failure" | "opening_concept_failure")) {
    return noMatchResult(category, "line_recall");
  }

  const repairMode: BranchRepairMode =
    category === "opening_memory_failure" ? "line_recall" : "concept_review";

  const normalizedMoves = gameMoves.map(normalizeSan);

  // Find best matching repertoire line
  type BestMatch = {
    repertoireKey: string;
    repertoireName: string;
    repertoireSide: "white" | "black";
    lineId: string;
    lineName: string;
    openingFamily: import("../openings/types.js").OpeningFamily;
    canonicalMoves: string[];
    score: number;
  };

  let best: BestMatch | null = null;
  let bestScore = 0;

  for (const repertoire of repertoireMap.repertoires) {
    for (const line of repertoire.lineTree) {
      const score = matchScore(normalizedMoves, line.canonicalMoves);
      if (
        score > bestScore ||
        (score === bestScore &&
          best &&
          line.canonicalMoves.length > best.canonicalMoves.length)
      ) {
        best = {
          repertoireKey: repertoire.repertoireKey,
          repertoireName: repertoire.repertoireName,
          repertoireSide: repertoire.repertoireSide,
          lineId: line.lineId,
          lineName: line.lineName,
          openingFamily: line.openingFamily,
          canonicalMoves: line.canonicalMoves,
          score,
        };
        bestScore = score;
      }
    }
  }

  // No match — graceful fallback
  if (!best || bestScore < MIN_MATCH) {
    return noMatchResult(category, repairMode);
  }

  // Compute deviation point
  const exactMatch = bestScore >= best.canonicalMoves.length;
  const deviationIndex = exactMatch ? null : bestScore;
  const firstDeviationPly = deviationIndex !== null ? deviationIndex + 1 : null;
  const firstDeviationMove =
    deviationIndex !== null ? (normalizedMoves[deviationIndex] ?? null) : null;
  const deviationByUser =
    deviationIndex !== null
      ? isUserDeviation(best.repertoireSide, deviationIndex)
      : false;

  const confidence = computeConfidence(bestScore);

  const explanation = buildExplanation({
    matched: true,
    lineName: best.lineName,
    repertoireName: best.repertoireName,
    matchedMoveCount: bestScore,
    firstDeviationPly,
    firstDeviationMove,
    deviationByUser,
    repairMode,
    confidence,
    diagnosisCategory: category,
  });

  return {
    matched: true,
    lineId: best.lineId,
    lineName: best.lineName,
    repertoireKey: best.repertoireKey,
    repertoireName: best.repertoireName,
    openingFamily: best.openingFamily,
    matchedMoveCount: bestScore,
    firstDeviationPly,
    firstDeviationMove,
    deviationByUser,
    repairMode,
    confidence,
    explanation,
    drillLineId: best.lineId,
  };
}
