import type {
  RepertoireDrillMemoryReport,
  RepertoireDrillQueueEntry,
  RepertoireDrillQueueReport,
  RepertoireRepairOutcomesReport,
  RepertoireRepairQueueReport,
} from "./types.js";

export function buildRepertoireDrillQueue(args: {
  generatedAt: string;
  memory: RepertoireDrillMemoryReport;
  repairQueue?: RepertoireRepairQueueReport;
  repairOutcomes?: RepertoireRepairOutcomesReport;
}): RepertoireDrillQueueReport {
  const repairQueueByLine = new Map((args.repairQueue?.entries ?? []).map((entry) => [entry.lineId, entry]));
  const repairOutcomeByLine = new Map((args.repairOutcomes?.entries ?? []).map((entry) => [entry.lineId, entry]));
  const entries: RepertoireDrillQueueEntry[] = args.memory.entries
    .map((entry) => {
      const repair = repairQueueByLine.get(entry.lineId);
      const outcome = repairOutcomeByLine.get(entry.lineId);
      const urgency = Number(
        (
          entry.forgettingRisk * 0.6 +
          (1 - entry.stabilityScore) * 0.25 +
          (entry.drillVsGameComparison === "studied_but_failed_otb" ? 0.2 : 0) +
          (entry.drillVsGameComparison === "concept_gap_more_than_memory_gap" ? 0.15 : 0) +
          (repair ? Math.min(0.3, repair.urgencyScore * 0.2) : 0) +
          (outcome?.outcomeVerdict === "still_failing_in_drills" ? 0.2 : 0) +
          (outcome?.outcomeVerdict === "improved_in_drills_but_failed_in_games" ? 0.15 : 0) -
          (outcome?.outcomeVerdict === "repaired_and_transferred" ? 0.2 : 0)
        ).toFixed(4)
      );

      const recommendedAction = outcome?.nextAction
        ?? repair?.scheduledDrillReason
        ?? (entry.drillVsGameComparison === "concept_gap_more_than_memory_gap"
          ? `Review ${entry.lineName} with concept anchors: ${entry.conceptLinkedWeaknesses.join(", ")}.`
          : entry.drillVsGameComparison === "studied_but_failed_otb"
            ? `Replay ${entry.lineName} from memory, then rehearse the first practical transition after book.`
            : entry.drillVsGameComparison === "rarely_reviewed_and_failed"
              ? `Prioritize a fresh review of ${entry.lineName} before the next serious game.`
              : `Keep ${entry.lineName} warm with a short spaced review.`);

      return {
        repertoireKey: entry.repertoireKey,
        repertoireName: entry.repertoireName,
        lineId: entry.lineId,
        lineName: entry.lineName,
        urgency,
        nextRecommendedReviewAt: entry.nextRecommendedReviewAt,
        recallConfidence: entry.recallConfidence,
        forgettingRisk: entry.forgettingRisk,
        stabilityScore: entry.stabilityScore,
        drillVsGameComparison: entry.drillVsGameComparison,
        recommendedAction,
        conceptLinkedWeaknesses: entry.conceptLinkedWeaknesses,
      };
    })
    .sort((a, b) => b.urgency - a.urgency || a.lineId.localeCompare(b.lineId));

  return {
    generatedAt: args.generatedAt,
    entries,
    strongestLines: args.memory.strongestLines.slice(0, 5).map((entry) => ({
      lineId: entry.lineId,
      lineName: entry.lineName,
      recallConfidence: entry.recallConfidence,
      stabilityScore: entry.stabilityScore,
    })),
    nextLinesToReview: entries.slice(0, 5).map((entry) => ({
      lineId: entry.lineId,
      lineName: entry.lineName,
      nextRecommendedReviewAt: entry.nextRecommendedReviewAt,
      urgency: entry.urgency,
    })),
    summary: {
      queueSize: entries.length,
      immediateCount: args.memory.entries.filter((entry) => entry.spacedReviewBucket === "immediate").length,
      stableCount: args.memory.entries.filter((entry) => entry.spacedReviewBucket === "stable").length,
    },
  };
}
