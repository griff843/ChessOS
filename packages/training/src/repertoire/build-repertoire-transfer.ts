import type { RepertoireComparison, RepertoireTransferReport } from "./types.js";

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildRepertoireTransfer(args: {
  generatedAt: string;
  comparisons: RepertoireComparison[];
}): RepertoireTransferReport {
  const matched = args.comparisons.filter((entry) => entry.repertoireKey && entry.lineId);
  const gamesMatched = matched.length;

  const summary = {
    gamesMatched,
    averageInBookDepth: Number(avg(matched.map((entry) => entry.inBookDepth)).toFixed(2)),
    deviationRate: Number((matched.filter((entry) => entry.firstDeviationPly !== null).length / Math.max(gamesMatched, 1)).toFixed(4)),
    memoryMissRate: Number((matched.filter((entry) => entry.deviationType === "memory_miss").length / Math.max(gamesMatched, 1)).toFixed(4)),
    averagePostDeviationPerformance: Number(
      avg(
        matched
          .filter((entry) => entry.firstDeviationPly !== null)
          .map((entry) => {
            const base = entry.userScore ?? 0.5;
            return Math.max(0, Math.min(1, base - entry.openingMistakeCount * 0.1));
          })
      ).toFixed(4)
    ),
    recoveryAfterDeviationRate: Number(
      (
        matched.filter((entry) => entry.recoveryAfterDeviation === true).length /
        Math.max(matched.filter((entry) => entry.firstDeviationPly !== null).length, 1)
      ).toFixed(4)
    ),
  };

  const repertoireBuckets = [...new Map(matched.map((entry) => [entry.repertoireKey!, true])).keys()]
    .map((repertoireKey) => matched.filter((entry) => entry.repertoireKey === repertoireKey))
    .map((entries) => {
      const first = entries[0];
      return {
        repertoireKey: first.repertoireKey!,
        repertoireName: first.repertoireName!,
        repertoireSide: first.repertoireSide!,
        games: entries.length,
        averageInBookDepth: Number(avg(entries.map((entry) => entry.inBookDepth)).toFixed(2)),
        score: Number(avg(entries.map((entry) => entry.userScore ?? 0.5)).toFixed(4)),
        deviationRate: Number((entries.filter((entry) => entry.firstDeviationPly !== null).length / Math.max(entries.length, 1)).toFixed(4)),
        memoryMissRate: Number((entries.filter((entry) => entry.deviationType === "memory_miss").length / Math.max(entries.length, 1)).toFixed(4)),
        reviewPriority: Number(avg(entries.map((entry) => entry.reviewPriority + entry.openingMistakeCount * 0.15)).toFixed(4)),
      };
    })
    .sort((a, b) => b.reviewPriority - a.reviewPriority || a.repertoireKey.localeCompare(b.repertoireKey));

  const openingFamilyScores = [...new Map(matched.map((entry) => [entry.openingFamily!, true])).keys()]
    .map((openingFamily) => matched.filter((entry) => entry.openingFamily === openingFamily))
    .map((entries) => ({
      openingFamily: entries[0].openingFamily!,
      games: entries.length,
      score: Number(avg(entries.map((entry) => entry.userScore ?? 0.5)).toFixed(4)),
      deviationRate: Number((entries.filter((entry) => entry.firstDeviationPly !== null).length / Math.max(entries.length, 1)).toFixed(4)),
    }))
    .sort((a, b) => a.score - b.score || b.deviationRate - a.deviationRate || a.openingFamily.localeCompare(b.openingFamily));

  const weakestBuckets = [
    ...repertoireBuckets.slice(0, 2).map((entry) => ({
      bucketKey: entry.repertoireKey,
      label: entry.repertoireName,
      score: entry.score,
      reason: `${Math.round(entry.memoryMissRate * 100)}% memory-miss rate with ${entry.averageInBookDepth.toFixed(2)} ply average in-book depth.`,
    })),
    ...openingFamilyScores.slice(0, 2).map((entry) => ({
      bucketKey: entry.openingFamily,
      label: entry.openingFamily.replace(/_/g, " "),
      score: entry.score,
      reason: `${entry.games} game${entry.games === 1 ? "" : "s"} with ${Math.round(entry.deviationRate * 100)}% deviation rate.`,
    })),
  ]
    .sort((a, b) => a.score - b.score || a.bucketKey.localeCompare(b.bucketKey))
    .slice(0, 4);

  return {
    generatedAt: args.generatedAt,
    summary,
    repertoireBuckets,
    openingFamilyScores,
    weakestBuckets,
  };
}
