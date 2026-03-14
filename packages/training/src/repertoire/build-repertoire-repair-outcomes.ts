import type {
  RepairFollowupGameOutcome,
  RepairOutcomeStrength,
  RepairOutcomeVerdict,
  RepertoireComparison,
  RepertoireDrillEvent,
  RepertoireRepairOutcomesReport,
  RepertoireRepairOutcomeEntry,
  RepertoireRepairReport,
} from "./types.js";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function gradeWeight(grade: RepertoireRepairOutcomeEntry["drillOutcome"]): number {
  switch (grade) {
    case "exact_recall":
      return 1;
    case "acceptable_recall":
      return 0.75;
    case "partial_recall":
      return 0.35;
    case "failed_recall":
      return 0;
    default:
      return 0.2;
  }
}

function reDrillWeight(grade: RepertoireRepairOutcomeEntry["reDrillOutcome"]): number {
  return grade === "not_re_drilled" ? 0.2 : gradeWeight(grade);
}

function outcomeStrength(verdict: RepairOutcomeVerdict): RepairOutcomeStrength {
  if (verdict === "repaired_and_transferred" || verdict === "still_failing_in_drills") return "high";
  if (verdict === "improved_in_drills_but_failed_in_games" || verdict === "repaired_but_not_yet_transferred") return "medium";
  return "low";
}

function verdictReason(args: {
  lineName: string;
  verdict: RepairOutcomeVerdict;
  drillOutcome: RepertoireRepairOutcomeEntry["drillOutcome"];
  reDrillOutcome: RepertoireRepairOutcomeEntry["reDrillOutcome"];
  nextGameOutcome: RepairFollowupGameOutcome;
}): string {
  switch (args.verdict) {
    case "repaired_and_transferred":
      return `${args.lineName} improved in drills and the next real-game appearance stayed stable.`;
    case "repaired_but_not_yet_transferred":
      return `${args.lineName} improved in drills, but there is no later same-line game appearance yet.`;
    case "improved_in_drills_but_failed_in_games":
      return `${args.lineName} looked better in drills (${args.drillOutcome}/${args.reDrillOutcome}) but still failed in the next game.`;
    case "still_failing_in_drills":
      return `${args.lineName} is still failing in drills, so the repair did not stabilize recall yet.`;
    default:
      return `${args.lineName} does not have enough follow-up drill or game evidence yet.`;
  }
}

function nextAction(args: {
  lineName: string;
  verdict: RepairOutcomeVerdict;
  nextGameOutcome: RepairFollowupGameOutcome;
}): string {
  switch (args.verdict) {
    case "repaired_and_transferred":
      return `Deprioritize ${args.lineName} slightly and monitor the next real-game appearance.`;
    case "repaired_but_not_yet_transferred":
      return `Keep ${args.lineName} warm with one spaced re-drill before the next serious game.`;
    case "improved_in_drills_but_failed_in_games":
      return `Shift ${args.lineName} toward concept repair because the next game still showed ${args.nextGameOutcome.replace(/_/g, " ")}.`;
    case "still_failing_in_drills":
      return `Keep ${args.lineName} hot in the drill queue until recall reaches exact or acceptable.`;
    default:
      return `Collect another drill or game follow-up on ${args.lineName} before changing its plan.`;
  }
}

export function buildRepertoireRepairOutcomes(args: {
  generatedAt: string;
  repair: RepertoireRepairReport;
  comparisons: RepertoireComparison[];
  drillEvents: RepertoireDrillEvent[];
  priorHistory?: RepertoireRepairOutcomeEntry[];
}): RepertoireRepairOutcomesReport {
  const priorByRepairId = new Map((args.priorHistory ?? []).map((entry) => [entry.repairId, entry]));
  const comparisonsByLine = new Map<string, RepertoireComparison[]>();
  const eventsByLine = new Map<string, RepertoireDrillEvent[]>();

  for (const comparison of args.comparisons.filter((entry) => entry.lineId)) {
    const existing = comparisonsByLine.get(comparison.lineId!);
    if (existing) existing.push(comparison);
    else comparisonsByLine.set(comparison.lineId!, [comparison]);
  }
  for (const event of args.drillEvents) {
    const existing = eventsByLine.get(event.lineId);
    if (existing) existing.push(event);
    else eventsByLine.set(event.lineId, [event]);
  }
  for (const entries of comparisonsByLine.values()) {
    entries.sort((a, b) => a.sourceGameId.localeCompare(b.sourceGameId));
  }
  for (const entries of eventsByLine.values()) {
    entries.sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt));
  }

  const entries: RepertoireRepairOutcomeEntry[] = args.repair.urgentGames.map((repair) => {
    const repairId = `${repair.sourceGameId}:${repair.lineId}`;
    const prior = priorByRepairId.get(repairId);
    const repairScheduledAt = prior?.repairScheduledAt ?? args.generatedAt;
    const lineEvents = eventsByLine.get(repair.lineId) ?? [];
    const drill = lineEvents[0];
    const redrill = lineEvents[1];
    const lineComparisons = comparisonsByLine.get(repair.lineId) ?? [];
    const nextGame = lineComparisons.find((entry) => entry.sourceGameId.localeCompare(repair.sourceGameId) > 0);

    const drillOutcome: RepertoireRepairOutcomeEntry["drillOutcome"] = drill?.recallGrade ?? "not_drilled";
    const reDrillOutcome: RepertoireRepairOutcomeEntry["reDrillOutcome"] = redrill?.recallGrade ?? "not_re_drilled";
    const nextGameOutcome: RepairFollowupGameOutcome = nextGame?.transferFailureType ?? "not_seen";
    const drillImproved = gradeWeight(drillOutcome) >= 0.75 || reDrillWeight(reDrillOutcome) >= 0.75;
    const drillStillFailing = gradeWeight(drillOutcome) < 0.75 && reDrillWeight(reDrillOutcome) < 0.75;
    const gameTransferred = nextGameOutcome === "stable";

    let outcomeVerdict: RepairOutcomeVerdict;
    if (drillImproved && gameTransferred) {
      outcomeVerdict = "repaired_and_transferred";
    } else if (drillImproved && nextGameOutcome === "not_seen") {
      outcomeVerdict = "repaired_but_not_yet_transferred";
    } else if (drillImproved && nextGameOutcome !== "not_seen" && nextGameOutcome !== "stable") {
      outcomeVerdict = "improved_in_drills_but_failed_in_games";
    } else if (drillStillFailing && drill) {
      outcomeVerdict = "still_failing_in_drills";
    } else {
      outcomeVerdict = "insufficient_followup_evidence";
    }

    const transferImproved = outcomeVerdict === "repaired_and_transferred" || outcomeVerdict === "repaired_but_not_yet_transferred";
    const transferStillFragile =
      outcomeVerdict === "improved_in_drills_but_failed_in_games" ||
      outcomeVerdict === "still_failing_in_drills";

    const urgencyBase = repair.urgencyScore;
    const urgency = Number(
      Math.max(
        0,
        Math.min(
          1.5,
          urgencyBase +
            (outcomeVerdict === "still_failing_in_drills" ? 0.25 : 0) +
            (outcomeVerdict === "improved_in_drills_but_failed_in_games" ? 0.2 : 0) -
            (outcomeVerdict === "repaired_and_transferred" ? 0.3 : 0) -
            (outcomeVerdict === "repaired_but_not_yet_transferred" ? 0.1 : 0)
        )
      ).toFixed(4)
    );

    return {
      sourceGameId: repair.sourceGameId,
      repertoireKey: repair.repertoireKey,
      repertoireName: repair.repertoireName,
      lineId: repair.lineId,
      lineName: repair.lineName,
      repairId,
      repairScheduledAt,
      repairDrilledAt: drill?.reviewedAt ?? prior?.repairDrilledAt ?? null,
      reDrilledAt: redrill?.reviewedAt ?? prior?.reDrilledAt ?? null,
      nextGameSeenAt: nextGame?.sourceGameId ?? prior?.nextGameSeenAt ?? null,
      drillOutcome,
      reDrillOutcome,
      nextGameOutcome,
      transferImproved,
      transferStillFragile,
      outcomeVerdict,
      outcomeReason: verdictReason({
        lineName: repair.lineName,
        verdict: outcomeVerdict,
        drillOutcome,
        reDrillOutcome,
        nextGameOutcome,
      }),
      outcomeStrength: outcomeStrength(outcomeVerdict),
      nextAction: nextAction({
        lineName: repair.lineName,
        verdict: outcomeVerdict,
        nextGameOutcome,
      }),
      urgency,
      sourceSignals: [...repair.sourceSignals],
    };
  }).sort((a, b) => b.urgency - a.urgency || a.repairId.localeCompare(b.repairId));

  const recentlyRepairedLines = entries.slice(0, 6);
  const repairsThatWorked = entries.filter((entry) => entry.outcomeVerdict === "repaired_and_transferred").slice(0, 6);
  const repairsStillFragile = entries.filter((entry) => entry.transferStillFragile).slice(0, 6);

  return {
    generatedAt: args.generatedAt,
    entries,
    recentlyRepairedLines,
    repairsThatWorked,
    repairsStillFragile,
    nextActions: entries.slice(0, 6).map((entry) => ({
      repairId: entry.repairId,
      lineId: entry.lineId,
      lineName: entry.lineName,
      outcomeVerdict: entry.outcomeVerdict,
      urgency: entry.urgency,
      nextAction: entry.nextAction,
    })),
    summary: {
      trackedRepairs: entries.length,
      transferredRepairs: entries.filter((entry) => entry.outcomeVerdict === "repaired_and_transferred").length,
      fragileRepairs: entries.filter((entry) => entry.transferStillFragile).length,
      averageUrgency: Number(average(entries.map((entry) => entry.urgency)).toFixed(4)),
    },
  };
}
