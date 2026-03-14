import type {
  RepertoireDrillEvent,
  DrillVsGameComparison,
  RepertoireDrillMemoryEntry,
  RepertoireDrillMemoryReport,
  RepertoireMap,
  RepertoireReviewReport,
  RepertoireTransferReport,
  SpacedReviewBucket,
} from "./types.js";

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function addHours(timestamp: string, hours: number): string {
  return new Date(new Date(timestamp).getTime() + hours * 60 * 60 * 1000).toISOString();
}

function deriveBucket(forgettingRisk: number, recallConfidence: number): SpacedReviewBucket {
  if (forgettingRisk >= 0.75 || recallConfidence < 0.35) return "immediate";
  if (forgettingRisk >= 0.5 || recallConfidence < 0.55) return "short_term";
  if (forgettingRisk >= 0.3 || recallConfidence < 0.75) return "warm";
  return "stable";
}

function deriveComparison(args: {
  reviewCount: number;
  failureCount: number;
  conceptLinkedWeaknesses: string[];
}): DrillVsGameComparison {
  if (args.conceptLinkedWeaknesses.length > 0 && args.failureCount > 0) {
    return "concept_gap_more_than_memory_gap";
  }
  if (args.reviewCount >= 2 && args.failureCount === 0) {
    return "studied_and_stable";
  }
  if (args.reviewCount >= 2 && args.failureCount > 0) {
    return "studied_but_failed_otb";
  }
  if (args.reviewCount <= 1 && args.failureCount > 0) {
    return "rarely_reviewed_and_failed";
  }
  return "insufficient_evidence";
}

export function buildRepertoireDrillMemory(args: {
  generatedAt: string;
  repertoireMap: RepertoireMap;
  review: RepertoireReviewReport;
  transfer: RepertoireTransferReport;
  drillEvents?: RepertoireDrillEvent[];
}): RepertoireDrillMemoryReport {
  const comparisonsByLine = new Map<string, RepertoireReviewReport["comparisons"]>();
  const eventsByLine = new Map<string, RepertoireDrillEvent[]>();
  for (const comparison of args.review.comparisons.filter((entry) => entry.lineId && entry.repertoireKey)) {
    const existing = comparisonsByLine.get(comparison.lineId!);
    if (existing) existing.push(comparison);
    else comparisonsByLine.set(comparison.lineId!, [comparison]);
  }
  for (const event of args.drillEvents ?? []) {
    const existing = eventsByLine.get(event.lineId);
    if (existing) existing.push(event);
    else eventsByLine.set(event.lineId, [event]);
  }

  const bucketByRepertoire = new Map(args.transfer.repertoireBuckets.map((entry) => [entry.repertoireKey, entry]));

  const entries: RepertoireDrillMemoryEntry[] = args.repertoireMap.repertoires.flatMap((repertoire) =>
    repertoire.lineTree.map((line) => {
      const comparisons = comparisonsByLine.get(line.lineId) ?? [];
      const drillEvents = (eventsByLine.get(line.lineId) ?? []).sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt));
      const lastEvent = drillEvents[drillEvents.length - 1] ?? null;
      const reviewCount = drillEvents.length > 0 ? drillEvents.length : comparisons.length;
      const successCount = drillEvents.length > 0
        ? drillEvents.filter((event) => event.correctness).length
        : comparisons.filter((entry) => entry.transferFailureType === "stable" || (entry.userScore ?? 0.5) >= 0.5).length;
      const failureCount = drillEvents.length > 0
        ? drillEvents.filter((event) => !event.correctness).length
        : comparisons.filter((entry) => entry.transferFailureType !== "stable" || (entry.userScore ?? 0.5) < 0.5).length;
      const otbFailureCount = comparisons.filter((entry) => (entry.userScore ?? 0.5) < 0.5 || entry.transferFailureType !== "stable").length;
      const recallConfidenceBase = drillEvents.length > 0
        ? avg(drillEvents.map((event) => event.confidence))
        : reviewCount > 0
          ? avg(comparisons.map((entry) => entry.lineRecallConfidence))
          : 0.35;
      const bucketPressure = bucketByRepertoire.get(repertoire.repertoireKey)?.reviewPriority ?? line.reviewPriority;
      const conceptLinkedWeaknesses = [...new Set(comparisons.flatMap((entry) => [
        ...(entry.conceptFailure ? [entry.conceptFailure] : []),
        ...entry.conceptMappings.filter((concept) => entry.transferFailureType === "concept_misunderstanding"),
      ]))];
      const stabilityScore = Number(
        Math.max(0, Math.min(1, (reviewCount === 0 ? 0.25 : successCount / Math.max(reviewCount, 1)) - conceptLinkedWeaknesses.length * 0.05)).toFixed(4)
      );
      const recallConfidence = Number(
        Math.max(0, Math.min(1, recallConfidenceBase + Math.min(reviewCount, 4) * 0.05 - failureCount * 0.08)).toFixed(4)
      );
      const forgettingRisk = Number(
        Math.max(0, Math.min(1, 1 - recallConfidence + failureCount * 0.08 + (bucketPressure - 0.75) * 0.15)).toFixed(4)
      );
      const spacedReviewBucket = lastEvent?.spacedReviewBucket ?? deriveBucket(forgettingRisk, recallConfidence);
      const nextRecommendedReviewAt = lastEvent?.nextRecommendedReviewAt
        ?? (spacedReviewBucket === "stable"
          ? addHours(args.generatedAt, 168)
          : spacedReviewBucket === "warm"
            ? addHours(args.generatedAt, 72)
            : spacedReviewBucket === "short_term"
              ? addHours(args.generatedAt, 24)
              : args.generatedAt);
      const drillVsGameComparison = deriveComparison({
        reviewCount,
        failureCount,
        conceptLinkedWeaknesses,
      });

      return {
        repertoireKey: repertoire.repertoireKey,
        repertoireName: repertoire.repertoireName,
        lineId: line.lineId,
        lineKey: `${repertoire.repertoireKey}:${line.lineId}`,
        lineName: line.lineName,
        sourceCourse: line.sourceCourse,
        sourceOpeningFamily: line.openingFamily,
        reviewCount,
        successCount,
        failureCount,
        otbFailureCount,
        recallConfidence,
        forgettingRisk,
        stabilityScore,
        lastReviewedAt: lastEvent?.reviewedAt ?? null,
        lastCorrectAt: [...drillEvents].reverse().find((event) => event.correctness)?.reviewedAt ?? null,
        lastIncorrectAt: [...drillEvents].reverse().find((event) => !event.correctness)?.reviewedAt ?? null,
        nextRecommendedReviewAt,
        spacedReviewBucket,
        conceptLinkedWeaknesses,
        drillVsGameComparison,
        sourceGameIds: [...new Set(comparisons.map((entry) => entry.sourceGameId))],
      };
    })
  ).sort((a, b) => b.forgettingRisk - a.forgettingRisk || a.lineId.localeCompare(b.lineId));

  const fragileLines = entries
    .filter((entry) => entry.spacedReviewBucket === "immediate" || entry.drillVsGameComparison !== "studied_and_stable")
    .slice(0, 8);
  const strongestLines = [...entries]
    .sort((a, b) => b.stabilityScore - a.stabilityScore || b.recallConfidence - a.recallConfidence || a.lineId.localeCompare(b.lineId))
    .slice(0, 8);
  const atRiskLines = [...entries]
    .sort((a, b) => b.forgettingRisk - a.forgettingRisk || a.lineId.localeCompare(b.lineId))
    .slice(0, 8);

  const drillVsGameComparisons = [...new Set(entries.map((entry) => entry.drillVsGameComparison))]
    .map((comparison) => {
      const matching = entries.filter((entry) => entry.drillVsGameComparison === comparison);
      return {
        comparison,
        count: matching.length,
        lines: matching.map((entry) => entry.lineName).slice(0, 4),
      };
    })
    .sort((a, b) => b.count - a.count || a.comparison.localeCompare(b.comparison));

  return {
    generatedAt: args.generatedAt,
    entries,
    fragileLines,
    strongestLines,
    atRiskLines,
    drillVsGameComparisons,
    summary: {
      lineCount: entries.length,
      reviewedLineCount: entries.filter((entry) => entry.reviewCount > 0).length,
      averageRecallConfidence: Number(avg(entries.map((entry) => entry.recallConfidence)).toFixed(4)),
      averageForgettingRisk: Number(avg(entries.map((entry) => entry.forgettingRisk)).toFixed(4)),
    },
  };
}
