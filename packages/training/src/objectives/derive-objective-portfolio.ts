import {
  buildObjectiveBias,
  buildObjectiveSelectionSnapshot,
  findNextObjectiveCandidate,
} from "./select-training-objective";
import type {
  ObjectiveCandidateScore,
  ObjectiveEscalationVerdict,
  ObjectiveHistoryEntry,
  ObjectivePortfolioEntry,
  ObjectivePortfolioInput,
  ObjectivePortfolioRotationDecision,
  ObjectivePortfolioState,
  ObjectivePortfolioStatus,
  ObjectiveProgressVerdict,
  TrainingObjective,
} from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

function daysSince(date: string | null, now: string): number {
  if (!date) return 30;
  const diff = new Date(now).getTime() - new Date(date).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function readinessBase(state: ObjectivePortfolioInput["selectionInput"]["readiness"]["state"]): number {
  switch (state) {
    case "ready_to_expand":
      return 0.9;
    case "hold_steady":
      return 0.65;
    default:
      return 0.35;
  }
}

function progressScore(verdict: ObjectiveProgressVerdict | null): number {
  switch (verdict) {
    case "completed":
      return 1;
    case "progressing":
      return 0.85;
    case "holding":
      return 0.6;
    case "stalled":
      return 0.35;
    case "regressing":
      return 0.1;
    default:
      return 0.45;
  }
}

function escalationAdjustment(verdict: ObjectiveEscalationVerdict | null): number {
  switch (verdict) {
    case "continue_current_objective":
      return 0.08;
    case "promote_objective_phase":
      return 0.12;
    case "hold_current_objective":
      return -0.02;
    case "revert_to_repair_mode":
      return -0.08;
    case "switch_objective":
      return -0.18;
    case "retire_objective":
      return -0.2;
    default:
      return 0;
  }
}

function objectiveHistoryWindow(history: ObjectiveHistoryEntry[], objective: TrainingObjective): ObjectiveHistoryEntry[] {
  return history.filter((entry) => entry.objective === objective).slice(-3);
}

function latestHistoryEntry(history: ObjectiveHistoryEntry[], objective: TrainingObjective): ObjectiveHistoryEntry | null {
  const matches = history.filter((entry) => entry.objective === objective);
  return matches[matches.length - 1] ?? null;
}

function objectiveRecurrencePressure(input: ObjectivePortfolioInput, objective: TrainingObjective): number {
  const selection = buildObjectiveSelectionSnapshot(
    input.selectionInput,
    objective,
    input.candidateScores
  );
  const bias = buildObjectiveBias(selection);
  const relevant = new Set(Object.keys(bias.categoryBoosts));
  const matches = input.selectionInput.patternIntelligence.recurrenceEntries.filter((entry) => relevant.has(entry.category));
  if (matches.length === 0) return 0;
  return round(clamp(Math.max(...matches.map((entry) => entry.recurrenceScore)) / 2, 0, 1));
}

function objectiveReviewBurdenImpact(input: ObjectivePortfolioInput, objective: TrainingObjective): number {
  const selection = buildObjectiveSelectionSnapshot(
    input.selectionInput,
    objective,
    input.candidateScores
  );
  const bias = buildObjectiveBias(selection);
  const relevant = new Set(Object.keys(bias.categoryBoosts));
  if (relevant.size === 0) return 0;
  const relevantEntries = input.selectionInput.reviewQueue.entries.filter((entry) => {
    const category = input.selectionInput.store.exercises[entry.exerciseId]?.lessonCategory;
    return category !== undefined && relevant.has(category);
  });
  return round(relevantEntries.length / Math.max(input.selectionInput.reviewQueue.totalEntries, 1));
}

function objectiveInterventionMemoryScore(input: ObjectivePortfolioInput, objective: TrainingObjective): number {
  if (objective === input.currentObjective && input.interventionMemory) {
    const episodes = input.interventionMemory.episodes;
    if (episodes.length === 0) return 0.5;
    const total = episodes.reduce((sum, episode) => {
      switch (episode.outcome) {
        case "effective":
          return sum + 1;
        case "partially_effective":
          return sum + 0.7;
        case "ineffective":
          return sum + 0.25;
        case "regressed":
          return sum + 0.1;
        default:
          return sum + 0.5;
      }
    }, 0);
    return round(total / episodes.length);
  }

  const window = objectiveHistoryWindow(input.objectiveHistory, objective);
  if (window.length === 0) return 0.5;
  return round(
    window.reduce((sum, entry) => sum + progressScore(entry.objectiveProgressVerdict), 0) / window.length
  );
}

function objectiveEscalationVerdict(input: ObjectivePortfolioInput, objective: TrainingObjective): ObjectiveEscalationVerdict | null {
  if (objective === input.currentObjective) {
    return input.currentEscalation.escalationVerdict;
  }
  return latestHistoryEntry(input.objectiveHistory, objective)?.objectiveEscalationVerdict ?? null;
}

function objectivePhase(input: ObjectivePortfolioInput, objective: TrainingObjective): ObjectivePortfolioEntry["currentPhase"] {
  return latestHistoryEntry(input.objectiveHistory, objective)?.objectivePhase ?? buildObjectiveSelectionSnapshot(
    input.selectionInput,
    objective,
    input.candidateScores
  ).objectivePhase;
}

function objectiveReasons(args: {
  objective: TrainingObjective;
  candidate: ObjectiveCandidateScore;
  recurrencePressure: number;
  reviewBurdenImpact: number;
  escalationVerdict: ObjectiveEscalationVerdict | null;
  interventionMemoryScore: number;
  lastTrainedAt: string | null;
}): string[] {
  return [
    ...args.candidate.reasons,
    `Portfolio recurrence pressure is ${args.recurrencePressure.toFixed(2)} and review burden impact is ${args.reviewBurdenImpact.toFixed(2)}.`,
    `Escalation verdict is ${(args.escalationVerdict ?? "none").replace(/_/g, " ")} with intervention memory score ${args.interventionMemoryScore.toFixed(2)}.`,
    `Last trained at ${args.lastTrainedAt ?? "never"}.`,
  ];
}

export function deriveObjectivePortfolio(input: ObjectivePortfolioInput): ObjectivePortfolioState {
  const generatedAt = input.generatedAt ?? input.selectionInput.generatedAt ?? new Date().toISOString();
  const candidateIndex = new Map(input.candidateScores.map((entry, index) => [entry.objective, index]));

  const entries: ObjectivePortfolioEntry[] = input.candidateScores.map((candidate) => {
    const latest = latestHistoryEntry(input.objectiveHistory, candidate.objective);
    const lastTrainedAt = latest?.completedAt ?? null;
    const readinessScore = round(clamp(readinessBase(input.selectionInput.readiness.state) * 0.6 + candidate.score * 0.4, 0, 1));
    const recurrencePressure = objectiveRecurrencePressure(input, candidate.objective);
    const reviewBurdenImpact = objectiveReviewBurdenImpact(input, candidate.objective);
    const interventionMemoryScore = objectiveInterventionMemoryScore(input, candidate.objective);
    const escalationVerdict = objectiveEscalationVerdict(input, candidate.objective);
    const stalenessBonus = clamp(daysSince(lastTrainedAt, generatedAt) / 30, 0, 0.18);
    const latestProgressScore = progressScore(latest?.objectiveProgressVerdict ?? null);
    const portfolioPriority = round(
      candidate.score * 0.45 +
        readinessScore * 0.12 +
        recurrencePressure * 0.1 +
        reviewBurdenImpact * 0.08 +
        interventionMemoryScore * 0.15 +
        latestProgressScore * 0.1 +
        stalenessBonus +
        escalationAdjustment(escalationVerdict)
    );
    const portfolioRotationWeight = round(
      clamp(portfolioPriority + stalenessBonus + (candidate.objective === input.currentObjective ? 0.04 : 0), 0, 1.5)
    );
    return {
      objectiveKey: candidate.objective,
      currentPhase: objectivePhase(input, candidate.objective),
      readinessScore,
      escalationVerdict,
      interventionMemoryScore,
      recurrencePressure,
      reviewBurdenImpact,
      portfolioPriority,
      portfolioRotationWeight,
      lastTrainedAt,
      trainingShare: 0,
      portfolioStatus: "standby" as ObjectivePortfolioStatus,
      reasons: objectiveReasons({
        objective: candidate.objective,
        candidate,
        recurrencePressure,
        reviewBurdenImpact,
        escalationVerdict,
        interventionMemoryScore,
        lastTrainedAt,
      }),
    };
  }).sort((a, b) => {
    if (b.portfolioPriority !== a.portfolioPriority) return b.portfolioPriority - a.portfolioPriority;
    return (candidateIndex.get(a.objectiveKey) ?? 0) - (candidateIndex.get(b.objectiveKey) ?? 0);
  });

  const currentEntry = entries.find((entry) => entry.objectiveKey === input.currentObjective) ?? entries[0];
  const topEntry = entries[0];
  const nextAlternative = entries.find((entry) => entry.objectiveKey !== input.currentObjective) ?? topEntry;

  let activeObjective = topEntry.objectiveKey;
  if (input.currentEscalation.escalationVerdict === "revert_to_repair_mode") {
    activeObjective = input.currentObjective;
  } else if (
    input.currentEscalation.escalationVerdict === "switch_objective" ||
    input.currentEscalation.escalationVerdict === "retire_objective"
  ) {
    activeObjective = (nextAlternative ?? topEntry).objectiveKey;
  } else if (
    (input.currentEscalation.escalationVerdict === "continue_current_objective" ||
      input.currentEscalation.escalationVerdict === "promote_objective_phase") &&
    currentEntry &&
    currentEntry.portfolioPriority >= topEntry.portfolioPriority - 0.05
  ) {
    activeObjective = input.currentObjective;
  } else if (
    input.currentEscalation.escalationVerdict === "hold_current_objective" &&
    currentEntry &&
    topEntry.objectiveKey !== input.currentObjective &&
    topEntry.portfolioPriority >= currentEntry.portfolioPriority + 0.06
  ) {
    activeObjective = topEntry.objectiveKey;
  }

  const shareCandidates = entries.map((entry, index) => {
    const isActive = entry.objectiveKey === activeObjective;
    let status: ObjectivePortfolioStatus = "standby";
    if (isActive && entry.escalationVerdict === "revert_to_repair_mode") {
      status = "repair_mode";
    } else if (isActive) {
      status = "active";
    } else if (entry.escalationVerdict === "switch_objective" || entry.escalationVerdict === "retire_objective") {
      status = "paused";
    } else if (index <= 2 || daysSince(entry.lastTrainedAt, generatedAt) >= 7) {
      status = "rotation_candidate";
    }

    const baseWeight =
      status === "active"
        ? entry.portfolioRotationWeight + 0.5
        : status === "repair_mode"
          ? entry.portfolioRotationWeight + 0.15
          : status === "rotation_candidate"
            ? entry.portfolioRotationWeight
            : status === "standby"
              ? Math.max(entry.portfolioRotationWeight * 0.35, 0.05)
              : 0;

    return {
      ...entry,
      portfolioStatus: status,
      rawWeight: round(baseWeight),
    };
  });

  const totalWeight = shareCandidates.reduce((sum, entry) => sum + entry.rawWeight, 0);
  const rankedObjectives = shareCandidates.map(({ rawWeight, ...entry }) => ({
    ...entry,
    trainingShare: totalWeight > 0 ? round(rawWeight / totalWeight) : 0,
  }));

  const rotationDecisions: ObjectivePortfolioRotationDecision[] = rankedObjectives.map((entry) => ({
    objectiveKey: entry.objectiveKey,
    action:
      entry.portfolioStatus === "active"
        ? "activate"
        : entry.portfolioStatus === "repair_mode"
          ? "repair"
          : entry.portfolioStatus === "paused"
            ? "pause"
            : entry.portfolioStatus === "rotation_candidate"
              ? "rotate_in"
              : "hold",
    reason: entry.reasons[1] ?? entry.reasons[0] ?? "Portfolio ranking retained current state.",
    trainingShare: entry.trainingShare,
  }));

  const second = findNextObjectiveCandidate(
    rankedObjectives.map((entry) => ({ objective: entry.objectiveKey, score: entry.portfolioPriority, reasons: entry.reasons })),
    activeObjective
  );

  return {
    generatedAt,
    activeObjective,
    rankedObjectives,
    rotationDecisions,
    portfolioSummary: `Portfolio activates ${activeObjective.replace(/_/g, " ")} with ${(rankedObjectives.find((entry) => entry.objectiveKey === activeObjective)?.trainingShare ?? 0).toFixed(2)} share while ${second?.objective.replace(/_/g, " ") ?? "no alternate objective"} remains the next rotation candidate.`,
  };
}


