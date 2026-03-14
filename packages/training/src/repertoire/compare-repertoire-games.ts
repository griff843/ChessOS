import type { OpeningClassification, OpeningMistake } from "../openings/types.js";
import type { RepertoireComparison, RepertoireMap, RepertoireSourceGame, SourceGameResult } from "./types.js";

function normalizeSan(move: string): string {
  return move.replace(/[+#?!]+/g, "").trim();
}

function matchScore(moves: string[], canonicalMoves: string[]): number {
  let matched = 0;
  for (let index = 0; index < canonicalMoves.length; index += 1) {
    if (moves[index] !== canonicalMoves[index]) break;
    matched += 1;
  }
  return matched;
}

function userMoveIndexForSide(side: "white" | "black", moveIndex: number): boolean {
  return side === "white" ? moveIndex % 2 === 0 : moveIndex % 2 === 1;
}

function resultToScore(result: SourceGameResult): number | null {
  switch (result) {
    case "win":
      return 1;
    case "draw":
      return 0.5;
    case "loss":
      return 0;
    default:
      return null;
  }
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function compareGamesToRepertoire(args: {
  repertoireMap: RepertoireMap;
  sourceGames: RepertoireSourceGame[];
  classifications: OpeningClassification[];
  openingMistakes: OpeningMistake[];
}): RepertoireComparison[] {
  const classificationByGame = new Map(args.classifications.map((entry) => [entry.sourceGameId, entry]));
  const mistakesByGame = new Map<string, OpeningMistake[]>();

  for (const mistake of args.openingMistakes) {
    const existing = mistakesByGame.get(mistake.sourceGameId);
    if (existing) existing.push(mistake);
    else mistakesByGame.set(mistake.sourceGameId, [mistake]);
  }

  const comparisons: RepertoireComparison[] = [];

  for (const game of args.sourceGames) {
    const normalizedMoves = game.sourceMoves.map(normalizeSan);
    const openingMistakes = [...(mistakesByGame.get(game.sourceGameId) ?? [])].sort((a, b) => a.ply - b.ply);
    const firstOpeningMistake = openingMistakes[0] ?? null;
    const classification = classificationByGame.get(game.sourceGameId);

    let best: {
      repertoireKey: string;
      repertoireName: string;
      repertoireSide: "white" | "black";
      lineId: string;
      lineName: string;
      openingFamily: OpeningClassification["openingFamily"];
      canonicalMoves: string[];
      conceptMappings: string[];
      reviewPriority: number;
      criticalDepth: number;
    } | null = null;
    let bestScore = 0;

    for (const repertoire of args.repertoireMap.repertoires) {
      for (const line of repertoire.lineTree) {
        const score = matchScore(normalizedMoves, line.canonicalMoves);
        if (
          score > bestScore ||
          (score === bestScore && best && line.canonicalMoves.length > best.canonicalMoves.length)
        ) {
          best = {
            repertoireKey: repertoire.repertoireKey,
            repertoireName: repertoire.repertoireName,
            repertoireSide: repertoire.repertoireSide,
            lineId: line.lineId,
            lineName: line.lineName,
            openingFamily: line.openingFamily,
            canonicalMoves: line.canonicalMoves,
            conceptMappings: line.conceptMappings,
            reviewPriority: line.reviewPriority,
            criticalDepth: Math.max(...line.criticalJunctions, 0),
          };
          bestScore = score;
        }
      }
    }

    if (!best || bestScore === 0) {
      comparisons.push({
        sourceGameId: game.sourceGameId,
        repertoireKey: null,
        repertoireName: null,
        repertoireSide: null,
        openingFamily: classification?.openingFamily ?? null,
        lineId: null,
        lineName: null,
        sourceMoves: normalizedMoves,
        matchedMoves: [],
        inBookDepth: 0,
        maxBookDepth: 0,
        stayedOnPath: false,
        firstDeviationPly: null,
        firstDeviationMove: null,
        deviationActor: "none",
        deviationType: "unknown_deviation",
        deviationReason: "No seeded repertoire line matched the imported move order.",
        firstBadMomentPly: firstOpeningMistake?.ply ?? null,
        firstBadMomentMove: firstOpeningMistake ? normalizedMoves[firstOpeningMistake.ply - 1] ?? null : null,
        firstBadMomentReason: firstOpeningMistake?.explanation ?? "No seeded repertoire line matched the imported move order.",
        transferFailureType: firstOpeningMistake ? "post_opening_transition_failure" : "stable",
        lineRecallConfidence: 0,
        conceptFailure: firstOpeningMistake?.conceptMappings[0] ?? null,
        reviewPriority: 0,
        conceptMappings: classification?.conceptMappings ?? [],
        sourceResult: game.sourceResult,
        userScore: null,
        openingMistakeCount: openingMistakes.length,
        openingMistakeThemes: openingMistakes.map((mistake) => mistake.theme),
        recoveryAfterDeviation: null,
      });
      continue;
    }

    const canonicalMoves = best.canonicalMoves;
    const exactLineMatched = bestScore >= canonicalMoves.length;
    const deviationIndex = exactLineMatched
      ? (normalizedMoves.length > canonicalMoves.length ? canonicalMoves.length : null)
      : bestScore;
    const firstDeviationMove = deviationIndex !== null ? normalizedMoves[deviationIndex] ?? null : null;
    const deviationActor = deviationIndex === null
      ? "none"
      : userMoveIndexForSide(best.repertoireSide, deviationIndex)
        ? "user"
        : "opponent";

    let deviationType: RepertoireComparison["deviationType"] = "acceptable_improv";
    let deviationReason = exactLineMatched
      ? "The game followed the seeded repertoire line through its modeled book depth."
      : "Deviation detected against the seeded repertoire line.";

    const mistakeOverlap = openingMistakes.some((mistake) =>
      mistake.conceptMappings.some((concept) => best!.conceptMappings.includes(concept))
    );

    if (deviationIndex === null) {
      deviationType = "acceptable_improv";
    } else if (deviationActor === "opponent") {
      deviationType = "opponent_sideline";
      deviationReason = `Opponent deviated first at ply ${deviationIndex + 1}${firstDeviationMove ? ` with ${firstDeviationMove}` : ""}.`;
    } else if (deviationIndex + 1 <= best.criticalDepth) {
      deviationType = "memory_miss";
      deviationReason = `User left the line before the critical junction at ply ${best.criticalDepth}.`;
    } else if (mistakeOverlap) {
      deviationType = "concept_misunderstanding";
      deviationReason = "User deviation overlaps with opening-mistake concepts already under pressure.";
    } else if (exactLineMatched) {
      deviationType = "acceptable_improv";
      deviationReason = "User completed the seeded book path before leaving theory.";
    } else {
      deviationType = "unknown_deviation";
      deviationReason = "Deviation occurred after the known path, but without enough signal to classify cleanly.";
    }

    const userScore = resultToScore(game.sourceResult);
    const recoveryAfterDeviation = deviationIndex === null
      ? null
      : userScore !== null
        ? userScore >= 0.5 && openingMistakes.length <= 1
        : null;

    const firstDeviationPly = deviationIndex !== null ? deviationIndex + 1 : null;
    const deviationHappensFirst = firstDeviationPly !== null && (!firstOpeningMistake || firstDeviationPly <= firstOpeningMistake.ply);
    const firstBadMomentPly = deviationHappensFirst
      ? firstDeviationPly
      : firstOpeningMistake?.ply ?? firstDeviationPly;
    const firstBadMomentMove = firstBadMomentPly !== null ? normalizedMoves[firstBadMomentPly - 1] ?? null : null;
    const firstBadMomentReason = deviationHappensFirst
      ? deviationReason
      : firstOpeningMistake?.explanation ?? deviationReason;

    let transferFailureType: RepertoireComparison["transferFailureType"] = "stable";
    if (deviationType === "memory_miss") {
      transferFailureType = "memory_miss";
    } else if (deviationType === "concept_misunderstanding") {
      transferFailureType = "concept_misunderstanding";
    } else if (deviationType === "opponent_sideline") {
      transferFailureType = "opponent_sideline_mishandling";
    } else if (deviationType === "acceptable_improv" && userScore !== null && userScore < 0.5) {
      transferFailureType = "acceptable_improv_late_collapse";
    } else if (firstOpeningMistake) {
      transferFailureType = "post_opening_transition_failure";
    }

    const lineRecallConfidence = clamp(
      best.canonicalMoves.length > 0
        ? bestScore / best.canonicalMoves.length - openingMistakes.length * 0.08 - (deviationType === "memory_miss" ? 0.2 : 0)
        : 0
    );
    const conceptFailure = firstOpeningMistake?.conceptMappings.find((concept) => best!.conceptMappings.includes(concept))
      ?? firstOpeningMistake?.conceptMappings[0]
      ?? null;

    comparisons.push({
      sourceGameId: game.sourceGameId,
      repertoireKey: best.repertoireKey,
      repertoireName: best.repertoireName,
      repertoireSide: best.repertoireSide,
      openingFamily: best.openingFamily,
      lineId: best.lineId,
      lineName: best.lineName,
      sourceMoves: normalizedMoves,
      matchedMoves: canonicalMoves.slice(0, bestScore),
      inBookDepth: bestScore,
      maxBookDepth: canonicalMoves.length,
      stayedOnPath: deviationIndex === null || exactLineMatched,
      firstDeviationPly,
      firstDeviationMove,
      deviationActor,
      deviationType,
      deviationReason,
      firstBadMomentPly,
      firstBadMomentMove,
      firstBadMomentReason,
      transferFailureType,
      lineRecallConfidence: Number(lineRecallConfidence.toFixed(4)),
      conceptFailure,
      reviewPriority: best.reviewPriority,
      conceptMappings: [...best.conceptMappings],
      sourceResult: game.sourceResult,
      userScore,
      openingMistakeCount: openingMistakes.length,
      openingMistakeThemes: openingMistakes.map((mistake) => mistake.theme),
      recoveryAfterDeviation,
    });
  }

  return comparisons.sort((a, b) => a.sourceGameId.localeCompare(b.sourceGameId));
}
