import type {
  DrillVsGameGap,
  RepertoireDrillMemoryReport,
  RepertoireTransferCoachingEntry,
  RepertoireTransferCoachingReport,
  RepertoireTransferReport,
  RepertoireReviewReport,
} from "./types.js";

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function deriveGap(entry: RepertoireReviewReport["comparisons"][number]): DrillVsGameGap {
  if (entry.transferFailureType === "memory_miss") {
    return "line_breaks_before_book_depth";
  }
  if (
    entry.transferFailureType === "concept_misunderstanding" ||
    entry.transferFailureType === "opponent_sideline_mishandling"
  ) {
    return "concept_gap_over_memory_gap";
  }
  if (
    entry.transferFailureType === "acceptable_improv_late_collapse" ||
    entry.transferFailureType === "post_opening_transition_failure"
  ) {
    return "line_holds_then_collapses_in_games";
  }
  if (entry.firstBadMomentPly === null && entry.userScore !== 0) {
    return "stable_in_games";
  }
  return "insufficient_evidence";
}

export function buildRepertoireTransferCoaching(args: {
  generatedAt: string;
  review: RepertoireReviewReport;
  transfer: RepertoireTransferReport;
  drillMemory?: RepertoireDrillMemoryReport;
}): RepertoireTransferCoachingReport {
  const matched = args.review.comparisons.filter((entry) => entry.repertoireKey && entry.lineId);
  const byLine = new Map<string, typeof matched>();
  const drillMemoryByLine = new Map((args.drillMemory?.entries ?? []).map((entry) => [entry.lineId, entry]));

  for (const entry of matched) {
    const existing = byLine.get(entry.lineId!);
    if (existing) existing.push(entry);
    else byLine.set(entry.lineId!, [entry]);
  }

  const entries: RepertoireTransferCoachingEntry[] = [...byLine.entries()]
    .map(([, lineEntries]) => {
      const first = lineEntries[0];
      const firstBadMoment = [...lineEntries]
        .filter((entry) => entry.firstBadMomentPly !== null)
        .sort((a, b) => (a.firstBadMomentPly ?? 999) - (b.firstBadMomentPly ?? 999))[0] ?? first;
      const averageRecallConfidence = Number(avg(lineEntries.map((entry) => entry.lineRecallConfidence)).toFixed(4));
      const averageScore = avg(lineEntries.map((entry) => entry.userScore ?? 0.5));
      const urgentFailures = lineEntries.filter((entry) => entry.transferFailureType !== "stable").length;
      const conceptFailure = firstBadMoment.conceptFailure ?? lineEntries.find((entry) => entry.conceptFailure)?.conceptFailure ?? null;
      const memoryState = drillMemoryByLine.get(first.lineId!);
      const drillVsGameGap = memoryState?.drillVsGameComparison === "studied_but_failed_otb"
        ? "line_holds_then_collapses_in_games"
        : memoryState?.drillVsGameComparison === "concept_gap_more_than_memory_gap"
          ? "concept_gap_over_memory_gap"
          : deriveGap(firstBadMoment);

      const recommendedReviewLine = firstBadMoment.transferFailureType === "memory_miss"
        ? `Re-drill ${first.lineName} through ply ${Math.max(first.firstDeviationPly ?? 0, first.maxBookDepth)} and rehearse the first critical junction.`
        : firstBadMoment.transferFailureType === "concept_misunderstanding"
          ? `Review ${first.lineName} with concept anchors before replaying the line from memory.`
          : firstBadMoment.transferFailureType === "opponent_sideline_mishandling"
            ? `Add an explicit sideline response block for ${first.lineName} and rehearse the opponent deviation point.`
            : `Replay ${first.lineName} into the first transition position and train the plan after book ends.`;

      const recommendedConceptFocus = conceptFailure;
      const urgency = Number(
        (
          avg(lineEntries.map((entry) => entry.reviewPriority)) +
          urgentFailures * 0.2 +
          (1 - averageRecallConfidence) * 0.6 +
          (averageScore < 0.5 ? 0.35 : 0) +
          (memoryState?.drillVsGameComparison === "studied_but_failed_otb" ? 0.2 : 0) +
          (memoryState?.drillVsGameComparison === "concept_gap_more_than_memory_gap" ? 0.15 : 0)
        ).toFixed(4)
      );

      const coachingSummary = firstBadMoment.transferFailureType === "memory_miss"
        ? `${first.lineName} is breaking before the intended path settles, so this looks like a recall problem rather than a later middlegame collapse.`
        : firstBadMoment.transferFailureType === "concept_misunderstanding"
          ? `${first.lineName} is failing around ${recommendedConceptFocus ?? "the linked concept cluster"}, so concept repair matters more than rote move recall.`
          : firstBadMoment.transferFailureType === "opponent_sideline_mishandling"
            ? `${first.lineName} is usually leaving theory because opponents sidestep the seeded line first, so practical sideline prep should come before broader expansion.`
            : `${first.lineName} usually reaches the intended path but collapses later, so the transfer problem is the first transition plan after the book sequence.`;
      const coachingSummaryWithMemory = memoryState?.drillVsGameComparison === "studied_but_failed_otb"
        ? `${coachingSummary} The line looks studied, so repair should emphasize practical transition decisions rather than pure memorization.`
        : memoryState?.drillVsGameComparison === "concept_gap_more_than_memory_gap"
          ? `${coachingSummary} Drill memory evidence suggests the concept failure is heavier than the memory failure.`
          : coachingSummary;

      return {
        repertoireKey: first.repertoireKey!,
        repertoireName: first.repertoireName!,
        openingFamily: first.openingFamily!,
        lineId: first.lineId!,
        lineName: first.lineName!,
        firstBadMomentMove: firstBadMoment.firstBadMomentMove,
        firstBadMomentPly: firstBadMoment.firstBadMomentPly,
        firstBadMomentReason: firstBadMoment.firstBadMomentReason,
        deviationType: firstBadMoment.deviationType,
        deviationActor: firstBadMoment.deviationActor,
        transferFailureType: firstBadMoment.transferFailureType,
        lineRecallConfidence: averageRecallConfidence,
        conceptFailure: recommendedConceptFocus,
        drillVsGameGap,
        recommendedReviewLine,
        recommendedConceptFocus,
        coachingSummary: coachingSummaryWithMemory,
        urgency,
        sourceGameIds: [...new Set(lineEntries.map((entry) => entry.sourceGameId))],
      };
    })
    .sort((a, b) => b.urgency - a.urgency || a.lineId.localeCompare(b.lineId));

  const fragileLines = entries.filter((entry) => entry.transferFailureType !== "stable").slice(0, 8);
  const topActions = fragileLines.slice(0, 5).map((entry) => ({
    repertoireKey: entry.repertoireKey,
    lineId: entry.lineId,
    lineName: entry.lineName,
    urgency: entry.urgency,
    action: entry.recommendedReviewLine,
  }));

  const drillVsGameGaps = [...new Map(entries.map((entry) => [entry.drillVsGameGap, true])).keys()]
    .map((gap) => {
      const gapEntries = entries.filter((entry) => entry.drillVsGameGap === gap);
      return {
        gap,
        count: gapEntries.length,
        lines: gapEntries.map((entry) => entry.lineName).slice(0, 4),
      };
    })
    .sort((a, b) => b.count - a.count || a.gap.localeCompare(b.gap));

  const conceptReinforcements = [...new Set(entries.map((entry) => entry.recommendedConceptFocus).filter((value): value is string => Boolean(value)))]
    .map((concept) => {
      const conceptEntries = entries.filter((entry) => entry.recommendedConceptFocus === concept);
      return {
        concept,
        count: conceptEntries.length,
        lines: conceptEntries.map((entry) => entry.lineName).slice(0, 4),
      };
    })
    .sort((a, b) => b.count - a.count || a.concept.localeCompare(b.concept));

  return {
    generatedAt: args.generatedAt,
    entries,
    fragileLines,
    topActions,
    drillVsGameGaps,
    conceptReinforcements,
    summary: {
      matchedLines: entries.length,
      unstableLines: fragileLines.length,
      averageLineRecallConfidence: Number(avg(entries.map((entry) => entry.lineRecallConfidence)).toFixed(4)),
    },
  };
}
