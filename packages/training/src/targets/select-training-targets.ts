/**
 * Select and rank training targets from scored critical positions.
 *
 * Selection criteria:
 * - All positions with actualLabel in {inaccuracy, mistake, blunder}
 * - Positions with actualLabel === "best_or_ok" only if predictedRisk >= 0.4
 *
 * Ranking: by targetPriority descending, top N.
 */

import type { CriticalPosition } from "../intelligence/types";
import { classifyTargetType } from "./classify-target-type";
import { computeTargetPriority } from "./compute-target-priority";
import type { TrainingTarget } from "./types";

const DEFAULT_TOP_N = 10;

/**
 * Select, classify, prioritize, and rank training targets.
 */
export function selectTrainingTargets(
  positions: CriticalPosition[],
  topN: number = DEFAULT_TOP_N
): { targets: TrainingTarget[]; totalCandidates: number } {
  // Classify and filter
  const candidates: TrainingTarget[] = [];

  for (const pos of positions) {
    const targetType = classifyTargetType(pos.actualLabel, pos.predictedRisk);
    if (targetType === null) continue;

    const { priority, factors } = computeTargetPriority(
      pos.criticalityScore,
      pos.actualLabel,
      pos.evalCp,
      pos.phase
    );

    candidates.push({
      gameId: pos.gameId,
      positionId: pos.positionId,
      ply: pos.ply,
      moveSan: pos.moveSan,
      mover: pos.mover,
      heroColor: pos.heroColor ?? null,
      perspective: pos.perspective ?? "unknown",
      fen: pos.fen,
      evalCp: pos.evalCp,
      phase: pos.phase,
      actualLabel: pos.actualLabel,
      targetType,
      predictedRisk: pos.predictedRisk,
      criticalityScore: pos.criticalityScore,
      criticalityFactors: pos.factors,
      targetPriority: priority,
      priorityFactors: factors,
      rank: 0, // assigned below
    });
  }

  // Sort by priority descending, take top N
  candidates.sort((a, b) => b.targetPriority - a.targetPriority);

  const selected = candidates.slice(0, topN);
  for (let i = 0; i < selected.length; i++) {
    selected[i].rank = i + 1;
  }

  return { targets: selected, totalCandidates: candidates.length };
}
