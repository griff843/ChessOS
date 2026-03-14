/**
 * Deterministic game loss diagnosis.
 *
 * Consumes a TrainingDatasetRow[] and produces a GameLossDiagnosis
 * identifying the primary loss reason, first truly losing practical
 * decision, optional contributing factors, and actionable explanation.
 *
 * Eval convention: evalCp is always from White's perspective.
 * swingCp: positive = mover's position got worse.
 */

import type { ChessColor } from "@chess-os/chess-core";
import type { TrainingDatasetRow } from "../dataset/types.js";
import type {
  DiagnosisCategory,
  DiagnosisMove,
  ContributingFactor,
  GameLossDiagnosis,
} from "./types.js";

// ── Thresholds ──────────────────────────────────────────────────────

/** Hero eval below this = position is lost. */
const LOSING_THRESHOLD = -200;

/** Hero eval above this = position is manageable. */
const MANAGEABLE_THRESHOLD = -150;

/** Minimum swing to count as significant for losing-move detection. */
const SIGNIFICANT_SWING = 150;

/** Swing threshold for "tactical blunder" category. */
const BLUNDER_SWING = 300;

/** Last fraction of game plies to check for time-trouble pattern. */
const TIME_TROUBLE_FRACTION = 0.25;

/** Ply window (hero-moves) for collapse detection. */
const COLLAPSE_WINDOW_PLIES = 12;

/** Minimum hero errors within window for practical collapse. */
const COLLAPSE_MIN_ERRORS = 3;

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Compute eval AFTER this move from White's perspective.
 * White move: evalAfter = evalBefore - swing
 * Black move: evalAfter = evalBefore + swing
 */
function evalAfterWhite(row: TrainingDatasetRow): number {
  return row.mover === "white"
    ? row.evalCp - row.swingCp
    : row.evalCp + row.swingCp;
}

/** Convert White-perspective eval to hero-perspective. */
function heroEval(evalWhite: number, hero: ChessColor): number {
  return hero === "white" ? evalWhite : -evalWhite;
}

/** Infer which side lost from the final position eval. */
function inferLoser(rows: TrainingDatasetRow[]): ChessColor | null {
  if (rows.length === 0) return null;
  const last = rows[rows.length - 1];
  const finalWhite = evalAfterWhite(last);
  if (finalWhite > 200) return "black";
  if (finalWhite < -200) return "white";
  return null;
}

// ── Category Classification ─────────────────────────────────────────

function classifyCategory(
  move: TrainingDatasetRow,
  heroMoves: TrainingDatasetRow[],
  allRows: TrainingDatasetRow[]
): DiagnosisCategory {
  const totalPlies = allRows.length > 0 ? allRows[allRows.length - 1].ply : 0;
  const heroErrors = heroMoves.filter((r) => r.label !== "best_or_ok");

  // 1. Time trouble: errors concentrated in last 25% of game
  if (totalPlies > 20 && heroErrors.length >= 3) {
    const latePlyThreshold = totalPlies * (1 - TIME_TROUBLE_FRACTION);
    const lateErrors = heroErrors.filter((r) => r.ply >= latePlyThreshold);
    if (lateErrors.length >= 3 && lateErrors.length / heroErrors.length >= 0.6) {
      return "time_trouble";
    }
  }

  // 2. Practical collapse: 3+ hero mistakes/blunders clustered after initial setback
  const severeErrors = heroErrors.filter(
    (r) => r.label === "mistake" || r.label === "blunder"
  );
  if (severeErrors.length >= COLLAPSE_MIN_ERRORS) {
    for (let i = 0; i <= severeErrors.length - COLLAPSE_MIN_ERRORS; i++) {
      const windowStart = severeErrors[i].ply;
      const windowEnd = windowStart + COLLAPSE_WINDOW_PLIES;
      const cluster = severeErrors.filter(
        (e) => e.ply >= windowStart && e.ply <= windowEnd
      );
      if (cluster.length >= COLLAPSE_MIN_ERRORS && move.ply > cluster[0].ply) {
        return "practical_collapse";
      }
    }
  }

  // 3. Opening failures
  if (move.phase === "opening") {
    return move.swingCp >= BLUNDER_SWING
      ? "opening_memory_failure"
      : "opening_concept_failure";
  }

  // 4. Endgame technique failure
  if (move.phase === "endgame") {
    return "endgame_technique_failure";
  }

  // 5. Calculation failure: long engine PV + significant swing
  const pvLength = move.pv?.length ?? 0;
  if (pvLength >= 5 && move.swingCp >= 200) {
    return "calculation_failure";
  }

  // 6. Tactical blunder: single large swing in middlegame
  if (move.swingCp >= BLUNDER_SWING) {
    return "tactical_blunder";
  }

  // 7. Default: gradual positional decline
  return "strategic_misjudgment";
}

// ── Explanation ─────────────────────────────────────────────────────

function generateExplanation(
  category: DiagnosisCategory,
  move: TrainingDatasetRow
): string {
  const moveNum = Math.ceil(move.ply / 2);
  const desc = `${move.moveSan} (move ${moveNum})`;

  switch (category) {
    case "opening_memory_failure":
      return `A critical opening error with ${desc} dropped ${move.swingCp}cp. Review this opening line to avoid repeating the mistake.`;
    case "opening_concept_failure":
      return `Positional understanding broke down in the opening around ${desc}. Focus on the strategic ideas behind this opening.`;
    case "calculation_failure":
      return `A miscalculation at ${desc} caused a ${move.swingCp}cp loss. The position required deeper calculation.`;
    case "tactical_blunder":
      return `A tactical oversight at ${desc} cost ${move.swingCp}cp. Practice pattern recognition for similar threats.`;
    case "strategic_misjudgment":
      return `The position deteriorated due to a misjudgment at ${desc}. Work on positional evaluation and planning.`;
    case "time_trouble":
      return `Errors accumulated late in the game, with the decisive mistake at ${desc}. Work on time management and decision-making under pressure.`;
    case "endgame_technique_failure":
      return `The endgame was mishandled at ${desc}, losing ${move.swingCp}cp. Study this endgame type to improve technique.`;
    case "practical_collapse":
      return `After an initial setback, consecutive errors followed with the decisive collapse at ${desc}. Work on resilience after mistakes.`;
  }
}

// ── Main Diagnosis Function ─────────────────────────────────────────

const EMPTY_MOVE: DiagnosisMove = {
  positionId: "",
  ply: 0,
  moveSan: "",
  fen: "",
  phase: "middlegame",
  label: "best_or_ok",
  evalBefore: 0,
  evalAfter: 0,
  swingCp: 0,
};

/**
 * Diagnose a game loss from the training dataset rows.
 *
 * @param rows - All classified moves for a single game (both sides).
 * @param heroColorInput - Which side to diagnose. If null, inferred from final eval.
 * @returns A complete GameLossDiagnosis.
 */
export function diagnoseGameLoss(
  rows: TrainingDatasetRow[],
  heroColorInput?: ChessColor | null
): GameLossDiagnosis {
  const gameId = rows[0]?.gameId ?? "unknown";
  const heroColor = heroColorInput ?? inferLoser(rows);

  // Can't determine who to diagnose
  if (!heroColor || rows.length === 0) {
    return {
      gameId,
      heroColor: null,
      gameLost: false,
      primaryCategory: "strategic_misjudgment",
      losingMove: EMPTY_MOVE,
      contributingFactors: [],
      explanation: "No clear loss detected in this game.",
      finalEvalCp: 0,
      totalCpLoss: 0,
      mistakeCount: 0,
      blunderCount: 0,
      diagnosedAt: new Date().toISOString(),
    };
  }

  // Compute final eval from hero perspective
  const lastRow = rows[rows.length - 1];
  const finalEvalCp = heroEval(evalAfterWhite(lastRow), heroColor);

  // Hero's moves only
  const heroMoves = rows.filter((r) => r.mover === heroColor);
  const heroErrors = heroMoves.filter((r) => r.label !== "best_or_ok");
  const mistakeCount = heroErrors.filter((r) => r.label === "mistake").length;
  const blunderCount = heroErrors.filter((r) => r.label === "blunder").length;
  const totalCpLoss = heroMoves.reduce(
    (sum, r) => sum + Math.max(0, r.swingCp),
    0
  );

  const gameLost = finalEvalCp < LOSING_THRESHOLD;

  // No loss or no errors → minimal result
  if (!gameLost || heroErrors.length === 0) {
    return {
      gameId,
      heroColor,
      gameLost: false,
      primaryCategory: "strategic_misjudgment",
      losingMove: EMPTY_MOVE,
      contributingFactors: [],
      explanation: gameLost
        ? "The game was lost but no specific hero errors were identified."
        : "The game was not clearly lost based on engine evaluation.",
      finalEvalCp,
      totalCpLoss,
      mistakeCount,
      blunderCount,
      diagnosedAt: new Date().toISOString(),
    };
  }

  // ── Find the first truly losing practical decision ──────────────

  // Pass 1: find the first move that transitions from manageable to losing
  let losingMoveRow: TrainingDatasetRow | null = null;

  for (const row of heroErrors) {
    if (row.label === "inaccuracy") continue; // skip minor errors

    const evalBeforeHero = heroEval(row.evalCp, heroColor);
    const evalAfterHero = heroEval(evalAfterWhite(row), heroColor);

    if (
      evalBeforeHero >= MANAGEABLE_THRESHOLD &&
      evalAfterHero < LOSING_THRESHOLD &&
      row.swingCp >= SIGNIFICANT_SWING
    ) {
      losingMoveRow = row;
      break;
    }
  }

  // Pass 2: fallback to largest-swing hero error
  if (!losingMoveRow) {
    losingMoveRow = heroErrors.reduce((worst, r) =>
      r.swingCp > worst.swingCp ? r : worst
    );
  }

  // Build DiagnosisMove
  const evalAfterHeroLM = heroEval(evalAfterWhite(losingMoveRow), heroColor);
  const losingMove: DiagnosisMove = {
    positionId: losingMoveRow.positionId,
    ply: losingMoveRow.ply,
    moveSan: losingMoveRow.moveSan,
    fen: losingMoveRow.fen,
    phase: losingMoveRow.phase,
    label: losingMoveRow.label,
    evalBefore: heroEval(losingMoveRow.evalCp, heroColor),
    evalAfter: evalAfterHeroLM,
    swingCp: losingMoveRow.swingCp,
  };

  // Classify primary diagnosis
  const primaryCategory = classifyCategory(
    losingMoveRow,
    heroMoves,
    rows
  );

  // Contributing factors: other significant hero errors, max 3
  const contributingFactors: ContributingFactor[] = heroErrors
    .filter(
      (r) =>
        r.positionId !== losingMoveRow!.positionId && r.swingCp >= 100
    )
    .sort((a, b) => b.swingCp - a.swingCp)
    .slice(0, 3)
    .map((r) => ({
      category: classifyCategory(r, heroMoves, rows),
      ply: r.ply,
      moveSan: r.moveSan,
      swingCp: r.swingCp,
      note: `${r.label} in ${r.phase}, losing ${r.swingCp}cp`,
    }));

  // Generate explanation
  const explanation = generateExplanation(primaryCategory, losingMoveRow);

  return {
    gameId,
    heroColor,
    gameLost: true,
    primaryCategory,
    losingMove,
    contributingFactors,
    explanation,
    finalEvalCp,
    totalCpLoss,
    mistakeCount,
    blunderCount,
    diagnosedAt: new Date().toISOString(),
  };
}
