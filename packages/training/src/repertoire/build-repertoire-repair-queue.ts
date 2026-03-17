import type {
  RepertoireDrillMemoryReport,
  RepertoireRepairUrgency,
  RepertoireRepairQueueEntry,
  RepertoireRepairQueueReport,
  RepertoireRepairReport,
} from "./types.js";

export function buildRepertoireRepairQueue(args: {
  generatedAt: string;
  repair: RepertoireRepairReport;
  drillMemory?: RepertoireDrillMemoryReport;
}): RepertoireRepairQueueReport {
  const drillMemoryByLine = new Map((args.drillMemory?.entries ?? []).map((entry) => [entry.lineId, entry]));

  const entries: RepertoireRepairQueueEntry[] = args.repair.urgentGames
    .map((entry) => {
      const memory = drillMemoryByLine.get(entry.lineId);
      const urgencyScore = Number(
        (
          entry.urgencyScore +
          (memory?.spacedReviewBucket === "immediate" ? 0.15 : 0) +
          (memory?.drillVsGameComparison === "studied_but_failed_otb" ? 0.15 : 0)
        ).toFixed(4)
      );
      const repairUrgency: RepertoireRepairUrgency = urgencyScore >= 0.9 ? "high" : urgencyScore >= 0.55 ? "medium" : "low";

      return {
        sourceGameId: entry.sourceGameId,
        repertoireKey: entry.repertoireKey,
        repertoireName: entry.repertoireName,
        lineId: entry.lineId,
        lineName: entry.lineName,
        repairType: entry.repairType,
        repairUrgency,
        urgencyScore,
        recommendedReviewLine: entry.recommendedReviewLine,
        recommendedConceptFocus: entry.recommendedConceptFocus,
        scheduledDrillLine: entry.scheduledDrillLine,
        scheduledDrillReason: entry.scheduledDrillReason,
        nextRecommendedReviewAt: memory?.nextRecommendedReviewAt ?? null,
        firstBadMomentMove: entry.firstBadMomentMove,
        firstBadMomentPly: entry.firstBadMomentPly,
        sourceOpeningFamily: entry.sourceOpeningFamily,
      };
    })
    .sort((a, b) => b.urgencyScore - a.urgencyScore || a.lineId.localeCompare(b.lineId));

  return {
    generatedAt: args.generatedAt,
    entries,
    topRepairLines: entries.slice(0, 5).map((entry) => ({
      lineId: entry.lineId,
      lineName: entry.lineName,
      urgencyScore: entry.urgencyScore,
      scheduledDrillReason: entry.scheduledDrillReason,
    })),
    urgentGames: entries.slice(0, 5).map((entry) => ({
      sourceGameId: entry.sourceGameId,
      lineName: entry.lineName,
      repairType: entry.repairType,
      urgencyScore: entry.urgencyScore,
    })),
    summary: {
      queueSize: entries.length,
      immediateRepairCount: entries.filter((entry) => entry.repairUrgency === "high").length,
      conceptRepairCount: entries.filter((entry) => entry.repairType === "concept_repair").length,
    },
  };
}
