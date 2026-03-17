/**
 * Critical position robustness check.
 *
 * Compares the top critical positions for a game under two different
 * model configurations to assess whether ranking is stable or brittle
 * when features are added/removed.
 */

import type { TrainingDatasetRow } from "../dataset/types";
import type { DecisionTreeParams } from "../model/decision-tree";
import { buildGameCriticalPositions } from "./build-critical-positions";
import type { CriticalPosition, CriticalPositionsResult } from "./types";

export interface RobustnessGameResult {
  gameId: string;
  totalPositions: number;
  configA: CriticalPositionsResult;
  configB: CriticalPositionsResult;
  overlapCount: number;
  overlapPositionIds: string[];
  onlyInA: string[];
  onlyInB: string[];
  rankShifts: Array<{
    positionId: string;
    ply: number;
    moveSan: string;
    rankA: number | null;
    rankB: number | null;
    shift: string;
  }>;
}

export interface CriticalPositionRobustnessResult {
  configAName: string;
  configBName: string;
  games: RobustnessGameResult[];
  overallOverlapRate: number;
  finding: string;
}

/**
 * Compare critical positions for multiple games under two tree configs.
 */
export function runCriticalPositionRobustness(
  gameRows: Map<string, TrainingDatasetRow[]>,
  configA: { name: string; treeParams: DecisionTreeParams },
  configB: { name: string; treeParams: DecisionTreeParams },
  topN: number = 5
): CriticalPositionRobustnessResult {
  const games: RobustnessGameResult[] = [];
  let totalOverlap = 0;
  let totalCompared = 0;

  for (const [gameId, rows] of gameRows) {
    const resultA = buildGameCriticalPositions(rows, configA.treeParams, topN);
    const resultB = buildGameCriticalPositions(rows, configB.treeParams, topN);

    const idsA = new Set(resultA.positions.map((p) => p.positionId));
    const idsB = new Set(resultB.positions.map((p) => p.positionId));

    const overlapIds = resultA.positions
      .filter((p) => idsB.has(p.positionId))
      .map((p) => p.positionId);
    const onlyInA = resultA.positions
      .filter((p) => !idsB.has(p.positionId))
      .map((p) => p.positionId);
    const onlyInB = resultB.positions
      .filter((p) => !idsA.has(p.positionId))
      .map((p) => p.positionId);

    // Compute rank shifts for all positions that appear in either config
    const allIds = new Set([...idsA, ...idsB]);
    const rankMapA = new Map(resultA.positions.map((p) => [p.positionId, p]));
    const rankMapB = new Map(resultB.positions.map((p) => [p.positionId, p]));

    const rankShifts = Array.from(allIds).map((id) => {
      const posA = rankMapA.get(id);
      const posB = rankMapB.get(id);
      const rankA = posA?.rank ?? null;
      const rankB = posB?.rank ?? null;

      let shift: string;
      if (rankA !== null && rankB !== null) {
        const delta = rankA - rankB;
        shift = delta === 0 ? "unchanged" : delta > 0 ? `improved ${delta}` : `dropped ${-delta}`;
      } else if (rankA !== null) {
        shift = "dropped out of top N";
      } else {
        shift = "new in top N";
      }

      return {
        positionId: id,
        ply: posA?.ply ?? posB?.ply ?? 0,
        moveSan: posA?.moveSan ?? posB?.moveSan ?? "",
        rankA,
        rankB,
        shift,
      };
    }).sort((a, b) => (a.ply) - (b.ply));

    totalOverlap += overlapIds.length;
    totalCompared += topN;

    games.push({
      gameId,
      totalPositions: rows.length,
      configA: resultA,
      configB: resultB,
      overlapCount: overlapIds.length,
      overlapPositionIds: overlapIds,
      onlyInA,
      onlyInB,
      rankShifts,
    });
  }

  const overallOverlapRate = totalCompared > 0 ? totalOverlap / totalCompared : 0;

  let finding: string;
  if (overallOverlapRate >= 0.8) {
    finding =
      `Critical position ranking is robust: ${(overallOverlapRate * 100).toFixed(0)}% overlap ` +
      `across ${games.length} game(s). Removing moverIsBlack does not materially change ` +
      `which positions are flagged as critical.`;
  } else if (overallOverlapRate >= 0.5) {
    finding =
      `Critical position ranking shows moderate stability: ${(overallOverlapRate * 100).toFixed(0)}% overlap ` +
      `across ${games.length} game(s). Some positions shift rank or drop out of the top ${topN}, ` +
      `but the core critical positions are generally preserved.`;
  } else {
    finding =
      `Critical position ranking is brittle: only ${(overallOverlapRate * 100).toFixed(0)}% overlap ` +
      `across ${games.length} game(s). The feature removal significantly changes which ` +
      `positions are flagged as critical. This warrants caution before removing the feature.`;
  }

  return {
    configAName: configA.name,
    configBName: configB.name,
    games,
    overallOverlapRate,
    finding,
  };
}
