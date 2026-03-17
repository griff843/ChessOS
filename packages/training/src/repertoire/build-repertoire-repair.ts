import type {
  RepertoireComparison,
  RepertoireDrillMemoryReport,
  RepertoireRepairEntry,
  RepertoireRepairReport,
  RepertoireRepairType,
  RepertoireTransferCoachingReport,
} from "./types.js";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function urgencyLabel(score: number): "low" | "medium" | "high" {
  if (score >= 0.9) return "high";
  if (score >= 0.55) return "medium";
  return "low";
}

export function buildRepertoireRepair(args: {
  generatedAt: string;
  comparisons: RepertoireComparison[];
  transferCoaching: RepertoireTransferCoachingReport;
  drillMemory?: RepertoireDrillMemoryReport;
}): RepertoireRepairReport {
  const matched = args.comparisons.filter(
    (entry): entry is RepertoireComparison & {
      repertoireKey: string;
      repertoireName: string;
      openingFamily: NonNullable<RepertoireComparison["openingFamily"]>;
      lineId: string;
      lineName: string;
    } => Boolean(entry.repertoireKey && entry.repertoireName && entry.openingFamily && entry.lineId && entry.lineName)
  );
  const coachingByLine = new Map(args.transferCoaching.entries.map((entry) => [entry.lineId, entry]));
  const drillMemoryByLine = new Map((args.drillMemory?.entries ?? []).map((entry) => [entry.lineId, entry]));

  const entries: RepertoireRepairEntry[] = matched
    .filter((entry) => entry.transferFailureType !== "stable" || entry.firstBadMomentPly !== null)
    .map((entry) => {
      const coaching = coachingByLine.get(entry.lineId);
      const drillMemory = drillMemoryByLine.get(entry.lineId);

      const repairType: RepertoireRepairType = entry.transferFailureType === "memory_miss"
        ? "memory_repair"
        : entry.transferFailureType === "concept_misunderstanding" || drillMemory?.drillVsGameComparison === "concept_gap_more_than_memory_gap"
          ? "concept_repair"
          : entry.transferFailureType === "post_opening_transition_failure" || entry.transferFailureType === "acceptable_improv_late_collapse"
            ? "post_deviation_transition_repair"
            : "opening_family_repair";

      const sourceSignals = [
        entry.deviationType !== "unknown_deviation" ? `deviation:${entry.deviationType}` : null,
        entry.transferFailureType !== "stable" ? `failure:${entry.transferFailureType}` : null,
        entry.conceptFailure ? `concept:${entry.conceptFailure}` : null,
        ...(entry.openingMistakeThemes.slice(0, 2).map((theme) => `opening_theme:${theme}`)),
        drillMemory ? `drill_gap:${drillMemory.drillVsGameComparison}` : null,
      ].filter((value): value is string => Boolean(value));

      const urgencyScore = Number(
        (
          entry.reviewPriority +
          (coaching?.urgency ?? 0) * 0.6 +
          (1 - entry.lineRecallConfidence) * 0.5 +
          (entry.userScore !== null && entry.userScore < 0.5 ? 0.25 : 0) +
          (drillMemory?.drillVsGameComparison === "studied_but_failed_otb" ? 0.2 : 0) +
          (repairType === "concept_repair" ? 0.1 : 0)
        ).toFixed(4)
      );

      const recommendedReviewLine = coaching?.recommendedReviewLine
        ?? (repairType === "memory_repair"
          ? `Rehearse ${entry.lineName} to the first critical junction before the next serious game.`
          : repairType === "concept_repair"
            ? `Review ${entry.lineName} with concept anchors, then replay the line from memory.`
            : repairType === "post_deviation_transition_repair"
              ? `Replay ${entry.lineName} into the first non-book position and practice the transition plan.`
              : `Review the opening-family plan behind ${entry.lineName} before widening the repertoire tree.`);

      const scheduledDrillReason = repairType === "memory_repair"
        ? `Schedule ${entry.lineName} immediately because the first bad moment happened before the intended book depth.`
        : repairType === "concept_repair"
          ? `Schedule ${entry.lineName} with concept reinforcement because ${entry.conceptFailure ?? "the linked concept"} is failing in practice.`
          : repairType === "post_deviation_transition_repair"
            ? `Schedule ${entry.lineName} to rehearse the first transition after theory ends.`
            : `Schedule ${entry.lineName} to stabilize the opening-family plan against practical drift.`;

      return {
        sourceGameId: entry.sourceGameId,
        repertoireKey: entry.repertoireKey,
        repertoireName: entry.repertoireName,
        lineId: entry.lineId,
        lineName: entry.lineName,
        firstBadMomentMove: entry.firstBadMomentMove,
        firstBadMomentPly: entry.firstBadMomentPly,
        firstBadMomentReason: entry.firstBadMomentReason,
        deviationType: entry.deviationType,
        conceptFailure: entry.conceptFailure,
        repairType,
        repairUrgency: urgencyLabel(urgencyScore),
        urgencyScore,
        recommendedReviewLine,
        recommendedConceptFocus: entry.conceptFailure ?? coaching?.recommendedConceptFocus ?? null,
        scheduledDrillLine: entry.lineName,
        scheduledDrillReason,
        sourceOpeningFamily: entry.openingFamily,
        sourceSignals,
      };
    })
    .sort((a, b) => b.urgencyScore - a.urgencyScore || a.sourceGameId.localeCompare(b.sourceGameId));

  const uniqueRepairTypes = [...new Set(entries.map((entry) => entry.repairType))];
  const repairByType = uniqueRepairTypes
    .map((repairType) => {
      const repairEntries = entries.filter((entry) => entry.repairType === repairType);
      return {
        repairType,
        count: repairEntries.length,
        lines: [...new Set(repairEntries.map((entry) => entry.lineName))].slice(0, 4),
      };
    })
    .sort((a, b) => b.count - a.count || a.repairType.localeCompare(b.repairType));

  const concepts = [...new Set(entries.map((entry) => entry.recommendedConceptFocus).filter((value): value is string => Boolean(value)))];
  const conceptLinkedRepairs = concepts
    .map((concept) => {
      const conceptEntries = entries.filter((entry) => entry.recommendedConceptFocus === concept);
      return {
        concept,
        count: conceptEntries.length,
        lines: [...new Set(conceptEntries.map((entry) => entry.lineName))].slice(0, 4),
      };
    })
    .sort((a, b) => b.count - a.count || a.concept.localeCompare(b.concept));

  return {
    generatedAt: args.generatedAt,
    urgentGames: entries,
    repairByType,
    conceptLinkedRepairs,
    scheduledDrills: entries.slice(0, 6).map((entry) => ({
      lineId: entry.lineId,
      lineName: entry.lineName,
      scheduledDrillReason: entry.scheduledDrillReason,
      urgencyScore: entry.urgencyScore,
    })),
    summary: {
      repairCount: entries.length,
      urgentCount: entries.filter((entry) => entry.repairUrgency === "high").length,
      averageUrgency: Number(average(entries.map((entry) => entry.urgencyScore)).toFixed(4)),
    },
  };
}
