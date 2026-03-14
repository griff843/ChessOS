import type { RepertoireComparison, RepertoireHealthEntry, RepertoireReviewEntry, RepertoireReviewReport } from "./types.js";

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildRepertoireReview(args: {
  generatedAt: string;
  comparisons: RepertoireComparison[];
}): RepertoireReviewReport {
  const matched = args.comparisons.filter((entry) => entry.repertoireKey && entry.lineId);
  const byRepertoire = new Map<string, RepertoireComparison[]>();
  const byLine = new Map<string, RepertoireComparison[]>();
  const byDeviationType = new Map<RepertoireComparison["deviationType"], RepertoireComparison[]>();

  for (const comparison of matched) {
    const repKey = comparison.repertoireKey!;
    const repEntries = byRepertoire.get(repKey);
    if (repEntries) repEntries.push(comparison);
    else byRepertoire.set(repKey, [comparison]);

    const lineKey = comparison.lineId!;
    const lineEntries = byLine.get(lineKey);
    if (lineEntries) lineEntries.push(comparison);
    else byLine.set(lineKey, [comparison]);

    const typeEntries = byDeviationType.get(comparison.deviationType);
    if (typeEntries) typeEntries.push(comparison);
    else byDeviationType.set(comparison.deviationType, [comparison]);
  }

  const currentRepertoireHealth: RepertoireHealthEntry[] = [...byRepertoire.entries()]
    .map(([, entries]) => {
      const first = entries[0];
      const deviationRate = entries.filter((entry) => entry.firstDeviationPly !== null).length / Math.max(entries.length, 1);
      const memoryMissRate = entries.filter((entry) => entry.deviationType === "memory_miss").length / Math.max(entries.length, 1);
      return {
        repertoireKey: first.repertoireKey!,
        repertoireName: first.repertoireName!,
        repertoireSide: first.repertoireSide!,
        games: entries.length,
        averageInBookDepth: Number(avg(entries.map((entry) => entry.inBookDepth)).toFixed(2)),
        deviationRate: Number(deviationRate.toFixed(4)),
        memoryMissRate: Number(memoryMissRate.toFixed(4)),
        score: Number(avg(entries.map((entry) => entry.userScore ?? 0.5)).toFixed(4)),
        reviewPriority: Number(
          avg(entries.map((entry) => entry.reviewPriority + entry.openingMistakeCount * 0.15 + (entry.deviationType === "memory_miss" ? 0.35 : 0))).toFixed(4)
        ),
      };
    })
    .sort((a, b) => b.reviewPriority - a.reviewPriority || a.repertoireKey.localeCompare(b.repertoireKey));

  const topLinesToReview: RepertoireReviewEntry[] = [...byLine.entries()]
    .map(([, entries]) => {
      const first = entries[0];
      const failureCount = entries.filter((entry) => entry.firstDeviationPly !== null || entry.openingMistakeCount > 0).length;
      const memoryMissCount = entries.filter((entry) => entry.deviationType === "memory_miss").length;
      const conceptMissCount = entries.filter((entry) => entry.deviationType === "concept_misunderstanding").length;
      const opponentSidelineCount = entries.filter((entry) => entry.deviationType === "opponent_sideline").length;
      const reviewPriority = Number(
        avg(
          entries.map(
            (entry) =>
              entry.reviewPriority +
              entry.openingMistakeCount * 0.2 +
              (entry.deviationType === "memory_miss" ? 0.45 : 0) +
              (entry.deviationType === "concept_misunderstanding" ? 0.3 : 0)
          )
        ).toFixed(4)
      );

      const recommendedAction = memoryMissCount > 0
        ? `Re-drill the seeded move order for ${first.lineName} and rehearse the first critical junction.`
        : conceptMissCount > 0
          ? `Review the concept links for ${first.lineName}: ${first.conceptMappings.join(", ")}.`
          : opponentSidelineCount > 0
            ? `Add practical responses to common sidelines that appear against ${first.lineName}.`
            : `Keep ${first.lineName} warm with a lightweight review before serious games.`;

      return {
        repertoireKey: first.repertoireKey!,
        repertoireName: first.repertoireName!,
        lineId: first.lineId!,
        lineName: first.lineName!,
        openingFamily: first.openingFamily!,
        reviewPriority,
        failureCount,
        memoryMissCount,
        conceptMissCount,
        opponentSidelineCount,
        averageInBookDepth: Number(avg(entries.map((entry) => entry.inBookDepth)).toFixed(2)),
        sourceGameIds: entries.map((entry) => entry.sourceGameId),
        conceptMappings: [...first.conceptMappings],
        recommendedAction,
      };
    })
    .sort((a, b) => b.reviewPriority - a.reviewPriority || b.failureCount - a.failureCount || a.lineId.localeCompare(b.lineId))
    .slice(0, 8);

  const firstDeviationPatterns = [...byDeviationType.entries()]
    .filter(([type]) => type !== "acceptable_improv")
    .map(([deviationType, entries]) => ({
      deviationType,
      count: entries.length,
      lines: [...new Set(entries.map((entry) => entry.lineName).filter((value): value is string => Boolean(value)))].slice(0, 4),
    }))
    .sort((a, b) => b.count - a.count || a.deviationType.localeCompare(b.deviationType));

  const recommendedFocuses = topLinesToReview.slice(0, 4).map((entry) =>
    `${entry.repertoireName}: ${entry.lineName} (${entry.recommendedAction})`
  );

  return {
    generatedAt: args.generatedAt,
    comparisons: args.comparisons,
    currentRepertoireHealth,
    topLinesToReview,
    firstDeviationPatterns,
    recommendedFocuses,
  };
}
