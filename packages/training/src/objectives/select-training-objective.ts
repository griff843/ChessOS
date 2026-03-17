import type { ExerciseTypeMix } from "../cognitive/types";
import type {
  ObjectiveCandidateScore,
  ObjectiveSelectionInput,
  ObjectiveSelectionResult,
  ObjectiveSuccessSignal,
  ObjectiveExerciseBias,
  TrainingObjective,
  ObjectivePhase,
} from "./types";

const OBJECTIVE_ORDER: TrainingObjective[] = [
  "candidate_move_generation",
  "tactical_pattern_recognition",
  "calculation_stability",
  "visualization_depth",
  "defensive_resource_finding",
  "endgame_conversion",
  "attacking_coordination",
  "practical_decision_quality",
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Number(value.toFixed(6));
}

function bucketMissRate(input: ObjectiveSelectionInput, key: string): number {
  const bucket = input.weaknessProfile.byCategory[key];
  if (bucket) return bucket.missRate;
  const trendBucket = input.trendProfile.byCategory[key];
  if (!trendBucket || trendBucket.lifetimeSeen === 0) return 0;
  return 1 - trendBucket.lifetimeAccuracy;
}

function bucketSeen(input: ObjectiveSelectionInput, key: string): number {
  return (
    input.weaknessProfile.byCategory[key]?.seenCount ??
    input.trendProfile.byCategory[key]?.lifetimeSeen ??
    0
  );
}

function difficultyMissRate(input: ObjectiveSelectionInput, difficulty: string): number {
  const bucket = input.weaknessProfile.byDifficulty[difficulty];
  if (bucket) return bucket.missRate;
  const trendBucket = input.trendProfile.byDifficulty[difficulty];
  if (!trendBucket || trendBucket.lifetimeSeen === 0) return 0;
  return 1 - trendBucket.lifetimeAccuracy;
}

function recentAccuracy(input: ObjectiveSelectionInput): number | null {
  if (input.recentSessions.length === 0) return null;
  const window = input.recentSessions.slice(0, 3);
  const total = window.reduce((sum, session) => sum + session.accuracy, 0);
  return total / window.length;
}

function recentDelta(input: ObjectiveSelectionInput): number {
  const recent = recentAccuracy(input);
  if (recent === null) return 0;
  return recent - input.trendProfile.overallAccuracy;
}

function rollingQuality(input: ObjectiveSelectionInput): number {
  const values = Object.values(input.store.exercises).map((entry) => entry.rollingQualityScore);
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function recentTrend(delta: number): ObjectiveSuccessSignal["trend"] {
  if (delta >= 0.03) return "improving";
  if (delta <= -0.03) return "worsening";
  return "stable";
}

function categoryTrend(input: ObjectiveSelectionInput, key: string): ObjectiveSuccessSignal["trend"] {
  return input.trendProfile.byCategory[key]?.trendDirection ?? "insufficient_data";
}

function difficultyTrend(input: ObjectiveSelectionInput, key: string): ObjectiveSuccessSignal["trend"] {
  return input.trendProfile.byDifficulty[key]?.trendDirection ?? "insufficient_data";
}

function focusBonus(
  input: ObjectiveSelectionInput,
  categories: string[],
  multiplier: number
): number {
  const top = input.focusRecommendations.slice(0, 2);
  if (top.some((item) => categories.includes(item.category))) {
    return multiplier;
  }
  return 0;
}

function getReviewPressure(input: ObjectiveSelectionInput): number {
  const total = input.reviewQueue.totalEntries;
  if (total === 0) return 0;
  const overdue = input.reviewQueue.entries.filter((entry) => entry.reason === "overdue").length;
  const unstable = input.reviewQueue.entries.filter((entry) => entry.reason === "unstable").length;
  return clamp((overdue * 1.2 + unstable * 0.8) / Math.max(total, 1), 0, 1);
}

function curriculumThemeBonus(
  input: ObjectiveSelectionInput,
  objective: TrainingObjective
): number {
  const theme = input.curriculumState.activeTheme;
  const matrix: Record<TrainingObjective, Record<string, number>> = {
    candidate_move_generation: { consolidation: 0.06, instability_reduction: 0.04 },
    tactical_pattern_recognition: { tactical_repair: 0.16, blunder_cleanup: 0.08 },
    calculation_stability: { tactical_repair: 0.1, instability_reduction: 0.1 },
    visualization_depth: { difficulty_expansion: 0.14, consolidation: 0.04 },
    defensive_resource_finding: { blunder_cleanup: 0.16, instability_reduction: 0.06 },
    endgame_conversion: { consolidation: 0.08, difficulty_expansion: 0.06 },
    attacking_coordination: { tactical_repair: 0.1, difficulty_expansion: 0.04 },
    practical_decision_quality: { instability_reduction: 0.14, consolidation: 0.08 },
  };
  return matrix[objective][theme] ?? 0;
}

export function computeObjectiveCandidateScores(
  input: ObjectiveSelectionInput
): ObjectiveCandidateScore[] {
  const recurring = new Set(input.patternIntelligence.recurringWeaknesses);
  const reviewPressure = getReviewPressure(input);
  const delta = recentDelta(input);
  const blockedGatePressure = clamp(input.curriculumState.blockedGateCount / 4, 0, 1);
  const hardMiss = difficultyMissRate(input, "hard");
  const openingMiss = bucketMissRate(input, "opening_inaccuracy");
  const positionalMiss = bucketMissRate(input, "positional_error");
  const tacticalMiss = bucketMissRate(input, "tactical_miss");
  const calcMiss = bucketMissRate(input, "calculation_error");
  const defenseMiss = bucketMissRate(input, "critical_defense");
  const endgameMiss = bucketMissRate(input, "endgame_technique");
  const practicalMiss = 1 - input.trendProfile.overallAccuracy;

  const scores: ObjectiveCandidateScore[] = [
    {
      objective: "candidate_move_generation",
      score: round(
        openingMiss * 0.34 +
          positionalMiss * 0.28 +
          focusBonus(input, ["opening_inaccuracy", "positional_error"], 0.1) +
          curriculumThemeBonus(input, "candidate_move_generation") +
          Math.max(0, -delta) * 0.08 +
          0.06
      ),
      reasons: [
        `Opening miss rate ${openingMiss.toFixed(2)} and positional miss rate ${positionalMiss.toFixed(2)} are both elevated.`,
        `Top focus and curriculum theme ${input.curriculumState.activeTheme} support broader candidate generation work.`,
      ],
    },
    {
      objective: "tactical_pattern_recognition",
      score: round(
        tacticalMiss * 0.46 +
          (recurring.has("tactical_miss") ? 0.18 : 0) +
          (input.patternIntelligence.topVulnerability?.category === "tactical_miss" ? 0.12 : 0) +
          focusBonus(input, ["tactical_miss"], 0.08) +
          curriculumThemeBonus(input, "tactical_pattern_recognition") +
          0.05
      ),
      reasons: [
        `Tactical miss rate is ${tacticalMiss.toFixed(2)} with recurring tactical weakness ${recurring.has("tactical_miss") ? "present" : "absent"}.`,
        `Pattern intelligence and curriculum theme ${input.curriculumState.activeTheme} make tactical repair the highest-leverage short-term target.`,
      ],
    },
    {
      objective: "calculation_stability",
      score: round(
        calcMiss * 0.4 +
          hardMiss * 0.2 +
          reviewPressure * 0.08 +
          Math.max(0, -delta) * 0.12 +
          blockedGatePressure * 0.08 +
          curriculumThemeBonus(input, "calculation_stability") +
          focusBonus(input, ["calculation_error"], 0.08)
      ),
      reasons: [
        `Calculation miss rate ${calcMiss.toFixed(2)} and hard-tier miss rate ${hardMiss.toFixed(2)} indicate unstable deeper calculation.`,
        `Recent accuracy delta ${delta.toFixed(2)} with ${input.curriculumState.blockedGateCount} blocked curriculum gates favors stabilization over expansion.`,
      ],
    },
    {
      objective: "visualization_depth",
      score: round(
        hardMiss * 0.34 +
          calcMiss * 0.18 +
          (input.readiness.state === "ready_to_expand" ? 0.14 : 0.04) +
          (input.curriculumState.expansionReserved ? 0.1 : 0) +
          curriculumThemeBonus(input, "visualization_depth") +
          0.04
      ),
      reasons: [
        `Hard-tier miss rate ${hardMiss.toFixed(2)} suggests visualization depth is limiting reliable conversion.`,
        `Readiness ${input.readiness.state} and curriculum expansion flag ${input.curriculumState.expansionReserved ? "on" : "off"} determine whether depth work is timely.`,
      ],
    },
    {
      objective: "defensive_resource_finding",
      score: round(
        defenseMiss * 0.5 +
          (recurring.has("critical_defense") ? 0.18 : 0) +
          reviewPressure * 0.08 +
          curriculumThemeBonus(input, "defensive_resource_finding") +
          focusBonus(input, ["critical_defense"], 0.08) +
          0.04
      ),
      reasons: [
        `Critical defense miss rate is ${defenseMiss.toFixed(2)} with review pressure ${reviewPressure.toFixed(2)}.`,
        `Defensive resource work aligns with curriculum theme ${input.curriculumState.activeTheme} and should reduce practical collapses.`,
      ],
    },
    {
      objective: "endgame_conversion",
      score: round(
        endgameMiss * 0.52 +
          Math.min(bucketSeen(input, "endgame_technique") / 12, 0.1) +
          blockedGatePressure * 0.06 +
          curriculumThemeBonus(input, "endgame_conversion") +
          focusBonus(input, ["endgame_technique"], 0.08)
      ),
      reasons: [
        `Endgame miss rate ${endgameMiss.toFixed(2)} over ${bucketSeen(input, "endgame_technique")} seen endgame exercises is still below target.`,
        `Curriculum theme ${input.curriculumState.activeTheme} and blocked-gate pressure ${blockedGatePressure.toFixed(2)} support structured endgame conversion reps.`,
      ],
    },
    {
      objective: "attacking_coordination",
      score: round(
        tacticalMiss * 0.26 +
          positionalMiss * 0.24 +
          (input.patternIntelligence.topVulnerability?.category === "tactical_miss" ? 0.08 : 0.03) +
          curriculumThemeBonus(input, "attacking_coordination") +
          (input.readiness.state === "ready_to_expand" ? 0.06 : 0.02) +
          0.04
      ),
      reasons: [
        `Attacking coordination is constrained by tactical miss ${tacticalMiss.toFixed(2)} and positional miss ${positionalMiss.toFixed(2)}.`,
        `Dynamic-position growth is best timed when readiness is ${input.readiness.state} and theme is ${input.curriculumState.activeTheme}.`,
      ],
    },
    {
      objective: "practical_decision_quality",
      score: round(
        practicalMiss * 0.28 +
          reviewPressure * 0.22 +
          blockedGatePressure * 0.12 +
          Math.max(0, -delta) * 0.12 +
          curriculumThemeBonus(input, "practical_decision_quality") +
          0.08
      ),
      reasons: [
        `Overall miss pressure ${practicalMiss.toFixed(2)}, review pressure ${reviewPressure.toFixed(2)}, and recent delta ${delta.toFixed(2)} point to broad practical instability.`,
        `Objective is a deterministic fallback when curriculum theme ${input.curriculumState.activeTheme} emphasizes consolidation over one narrow repair lane.`,
      ],
    },
  ];

  return scores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return OBJECTIVE_ORDER.indexOf(a.objective) - OBJECTIVE_ORDER.indexOf(b.objective);
  });
}

export function computeObjectivePhase(input: ObjectiveSelectionInput): ObjectivePhase {
  if (
    input.readiness.state === "repair_mode" ||
    input.curriculumState.blockedGateCount >= 2 ||
    input.curriculumState.activeTheme === "blunder_cleanup" ||
    input.curriculumState.activeTheme === "instability_reduction"
  ) {
    return "stabilize";
  }

  if (
    input.readiness.state === "ready_to_expand" &&
    (input.curriculumState.overallReadiness || input.curriculumState.expansionReserved)
  ) {
    return "expand";
  }

  return "build";
}

export function buildObjectiveExerciseMix(
  objective: TrainingObjective,
  phase: ObjectivePhase
): { mix: ExerciseTypeMix; rationale: string } {
  const byObjective: Record<TrainingObjective, ExerciseTypeMix> = {
    candidate_move_generation: { tactical: 5, recall: 1, visualization: 1, reconstruction: 3 },
    tactical_pattern_recognition: { tactical: 6, recall: 1, visualization: 1, reconstruction: 2 },
    calculation_stability: { tactical: 4, recall: 1, visualization: 3, reconstruction: 2 },
    visualization_depth: { tactical: 3, recall: 2, visualization: 4, reconstruction: 1 },
    defensive_resource_finding: { tactical: 5, recall: 1, visualization: 2, reconstruction: 2 },
    endgame_conversion: { tactical: 5, recall: 1, visualization: 2, reconstruction: 2 },
    attacking_coordination: { tactical: 5, recall: 1, visualization: 2, reconstruction: 2 },
    practical_decision_quality: { tactical: 5, recall: 1, visualization: 2, reconstruction: 2 },
  };

  const base = byObjective[objective];
  if (phase === "stabilize") {
    return {
      mix: {
        tactical: base.tactical + 1,
        recall: base.recall,
        visualization: Math.max(1, base.visualization - 1),
        reconstruction: base.reconstruction,
      },
      rationale: "Stabilize phase increases concrete tactical certainty while limiting visualization overload.",
    };
  }
  if (phase === "expand") {
    return {
      mix: {
        tactical: Math.max(3, base.tactical - 1),
        recall: base.recall,
        visualization: base.visualization + 1,
        reconstruction: base.reconstruction,
      },
      rationale: "Expand phase adds deeper visualization demand while keeping tactical anchors in place.",
    };
  }
  return {
    mix: base,
    rationale: "Build phase keeps a balanced objective mix across tactical and cognitive workloads.",
  };
}

function objectiveBias(objective: TrainingObjective): ObjectiveExerciseBias {
  switch (objective) {
    case "candidate_move_generation":
      return {
        categoryBoosts: { opening_inaccuracy: 1.2, positional_error: 1.2 },
        difficultyBoosts: { easy: 1.05, medium: 1.1, hard: 1.05 },
      };
    case "tactical_pattern_recognition":
      return {
        categoryBoosts: { tactical_miss: 1.25, calculation_error: 1.1 },
        difficultyBoosts: { medium: 1.1, hard: 1.1 },
      };
    case "calculation_stability":
      return {
        categoryBoosts: { calculation_error: 1.3, tactical_miss: 1.1 },
        difficultyBoosts: { medium: 1.1, hard: 1.2 },
      };
    case "visualization_depth":
      return {
        categoryBoosts: { calculation_error: 1.2, endgame_technique: 1.1 },
        difficultyBoosts: { medium: 1.1, hard: 1.25 },
      };
    case "defensive_resource_finding":
      return {
        categoryBoosts: { critical_defense: 1.35, tactical_miss: 1.05 },
        difficultyBoosts: { medium: 1.1, hard: 1.05 },
      };
    case "endgame_conversion":
      return {
        categoryBoosts: { endgame_technique: 1.35 },
        difficultyBoosts: { medium: 1.1, hard: 1.1 },
      };
    case "attacking_coordination":
      return {
        categoryBoosts: { positional_error: 1.15, tactical_miss: 1.15 },
        difficultyBoosts: { medium: 1.1, hard: 1.1 },
      };
    case "practical_decision_quality":
      return {
        categoryBoosts: {
          tactical_miss: 1.1,
          calculation_error: 1.1,
          positional_error: 1.1,
          critical_defense: 1.1,
        },
        difficultyBoosts: { easy: 1.05, medium: 1.1, hard: 1.1 },
      };
  }
}

export function buildObjectiveSignals(
  input: ObjectiveSelectionInput,
  objective: TrainingObjective
): ObjectiveSuccessSignal[] {
  const overallAccuracy = input.trendProfile.overallAccuracy;
  const reviewOverdue = input.reviewQueue.entries.filter((entry) => entry.reason === "overdue").length;
  const tacticalMiss = bucketMissRate(input, "tactical_miss");
  const calcMiss = bucketMissRate(input, "calculation_error");
  const defenseMiss = bucketMissRate(input, "critical_defense");
  const endgameMiss = bucketMissRate(input, "endgame_technique");
  const openingMiss = bucketMissRate(input, "opening_inaccuracy");
  const positionalMiss = bucketMissRate(input, "positional_error");
  const hardAccuracy = 1 - difficultyMissRate(input, "hard");
  const quality = rollingQuality(input);
  const delta = recentDelta(input);

  const templates: Record<TrainingObjective, ObjectiveSuccessSignal[]> = {
    candidate_move_generation: [
      {
        signal: "Opening and positional miss rate",
        metric: "candidate_generation_miss_rate",
        currentValue: Number(((openingMiss + positionalMiss) / 2).toFixed(4)),
        targetValue: 0.28,
        direction: "decrease",
        trend: categoryTrend(input, "opening_inaccuracy"),
      },
      {
        signal: "Recent practical accuracy",
        metric: "recent_accuracy",
        currentValue: Number((recentAccuracy(input) ?? overallAccuracy).toFixed(4)),
        targetValue: 0.72,
        direction: "increase",
        trend: recentTrend(delta),
      },
    ],
    tactical_pattern_recognition: [
      {
        signal: "Reduced tactical miss rate",
        metric: "tactical_miss_rate",
        currentValue: Number(tacticalMiss.toFixed(4)),
        targetValue: 0.3,
        direction: "decrease",
        trend: categoryTrend(input, "tactical_miss"),
      },
      {
        signal: "Improved exact and acceptable quality",
        metric: "rolling_quality_score",
        currentValue: Number(quality.toFixed(4)),
        targetValue: 0.65,
        direction: "increase",
        trend: recentTrend(delta),
      },
    ],
    calculation_stability: [
      {
        signal: "Calculation miss rate",
        metric: "calculation_miss_rate",
        currentValue: Number(calcMiss.toFixed(4)),
        targetValue: 0.28,
        direction: "decrease",
        trend: categoryTrend(input, "calculation_error"),
      },
      {
        signal: "Hard-tier exactness",
        metric: "hard_accuracy",
        currentValue: Number(hardAccuracy.toFixed(4)),
        targetValue: 0.6,
        direction: "increase",
        trend: difficultyTrend(input, "hard"),
      },
    ],
    visualization_depth: [
      {
        signal: "Hard-tier stability",
        metric: "hard_accuracy",
        currentValue: Number(hardAccuracy.toFixed(4)),
        targetValue: 0.62,
        direction: "increase",
        trend: difficultyTrend(input, "hard"),
      },
      {
        signal: "Calculation miss reduction",
        metric: "calculation_miss_rate",
        currentValue: Number(calcMiss.toFixed(4)),
        targetValue: 0.25,
        direction: "decrease",
        trend: categoryTrend(input, "calculation_error"),
      },
    ],
    defensive_resource_finding: [
      {
        signal: "Defense miss rate reduction",
        metric: "critical_defense_miss_rate",
        currentValue: Number(defenseMiss.toFixed(4)),
        targetValue: 0.26,
        direction: "decrease",
        trend: categoryTrend(input, "critical_defense"),
      },
      {
        signal: "Overdue defensive burden",
        metric: "overdue_review_count",
        currentValue: reviewOverdue,
        targetValue: 4,
        direction: "decrease",
        trend: recentTrend(-reviewOverdue / Math.max(input.reviewQueue.totalEntries || 1, 1)),
      },
    ],
    endgame_conversion: [
      {
        signal: "Endgame miss rate reduction",
        metric: "endgame_miss_rate",
        currentValue: Number(endgameMiss.toFixed(4)),
        targetValue: 0.24,
        direction: "decrease",
        trend: categoryTrend(input, "endgame_technique"),
      },
      {
        signal: "Practical conversion accuracy",
        metric: "overall_accuracy",
        currentValue: Number(overallAccuracy.toFixed(4)),
        targetValue: 0.74,
        direction: "increase",
        trend: recentTrend(delta),
      },
    ],
    attacking_coordination: [
      {
        signal: "Dynamic tactic miss reduction",
        metric: "tactical_miss_rate",
        currentValue: Number(tacticalMiss.toFixed(4)),
        targetValue: 0.29,
        direction: "decrease",
        trend: categoryTrend(input, "tactical_miss"),
      },
      {
        signal: "Positional support accuracy",
        metric: "positional_miss_rate",
        currentValue: Number(positionalMiss.toFixed(4)),
        targetValue: 0.3,
        direction: "decrease",
        trend: categoryTrend(input, "positional_error"),
      },
    ],
    practical_decision_quality: [
      {
        signal: "Overall accuracy growth",
        metric: "overall_accuracy",
        currentValue: Number(overallAccuracy.toFixed(4)),
        targetValue: 0.73,
        direction: "increase",
        trend: recentTrend(delta),
      },
      {
        signal: "Review burden reduction",
        metric: "overdue_review_count",
        currentValue: reviewOverdue,
        targetValue: 5,
        direction: "decrease",
        trend: recentTrend(-reviewOverdue / Math.max(input.reviewQueue.totalEntries || 1, 1)),
      },
    ],
  };

  return templates[objective];
}

function progressionState(
  signals: ObjectiveSuccessSignal[]
): ObjectiveSelectionResult["progressionState"] {
  let score = 0;
  for (const signal of signals) {
    const normalized =
      signal.direction === "increase"
        ? clamp(signal.currentValue / Math.max(signal.targetValue, 0.0001), 0, 1.25)
        : clamp(signal.targetValue / Math.max(signal.currentValue, 0.0001), 0, 1.25);
    score += normalized;
  }
  const average = signals.length > 0 ? score / signals.length : 0;
  if (average >= 0.95) return { score: Number(average.toFixed(4)), status: "on_track" };
  if (average >= 0.7) return { score: Number(average.toFixed(4)), status: "fragile" };
  return { score: Number(average.toFixed(4)), status: "needs_attention" };
}

function weeklyPlan(objective: TrainingObjective): string[] {
  const plans: Record<TrainingObjective, string[]> = {
    candidate_move_generation: [
      "Session 1-2: Reconstruction-heavy candidate comparison from opening and positional errors.",
      "Session 3-4: Medium tactical branches with explicit move shortlist generation.",
      "Session 5+: Confirm lower opening and positional miss rates.",
    ],
    tactical_pattern_recognition: [
      "Session 1-2: High-volume tactical pattern reps with immediate answer verification.",
      "Session 3-4: Add reconstruction prompts to force motif recall under variations.",
      "Session 5+: Verify lower tactical miss rate and stronger quality score.",
    ],
    calculation_stability: [
      "Session 1-2: Stabilize medium-depth calculation before adding more branches.",
      "Session 3-4: Increase hard-position depth with visualization checkpoints.",
      "Session 5+: Confirm hard accuracy growth and lower calculation miss rate.",
    ],
    visualization_depth: [
      "Session 1-2: Visualization-first exercises with short but exact move trees.",
      "Session 3-4: Extend boardless sequence depth and material tracking.",
      "Session 5+: Validate deeper hard-tier accuracy without tactical collapse.",
    ],
    defensive_resource_finding: [
      "Session 1-2: Defense-critical saves with forced continuation reconstruction.",
      "Session 3-4: Blend tactical and visualization defense prompts.",
      "Session 5+: Recheck defense miss rate and overdue queue pressure.",
    ],
    endgame_conversion: [
      "Session 1-2: Endgame technique drills at medium depth with exact conversion goals.",
      "Session 3-4: Add reconstruction continuations from practical endgame positions.",
      "Session 5+: Track endgame miss-rate decline and conversion accuracy.",
    ],
    attacking_coordination: [
      "Session 1-2: Coordinated attacking motifs and continuation recall.",
      "Session 3-4: Increase visualization checks for king-safety transitions.",
      "Session 5+: Monitor tactical and positional trend recovery in dynamic positions.",
    ],
    practical_decision_quality: [
      "Session 1-2: Balanced mix with review pressure kept under control.",
      "Session 3-4: Tighten exact and acceptable outcomes in medium and hard tiers.",
      "Session 5+: Validate accuracy growth and overdue burden decline.",
    ],
  };

  return plans[objective];
}

export function buildObjectiveSelectionSnapshot(
  input: ObjectiveSelectionInput,
  objective: TrainingObjective,
  candidateScores?: ObjectiveCandidateScore[],
  phaseOverride?: ObjectivePhase
): ObjectiveSelectionResult {
  const scores = candidateScores ?? computeObjectiveCandidateScores(input);
  const phase = phaseOverride ?? computeObjectivePhase(input);
  const winner = scores.find((entry) => entry.objective === objective);
  if (!winner) {
    throw new Error(`Objective ${objective} is missing from candidate scores`);
  }
  const mix = buildObjectiveExerciseMix(objective, phase);
  const signals = buildObjectiveSignals(input, objective);
  const progression = progressionState(signals);

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    currentObjective: objective,
    objectiveReason: winner.reasons.join(" "),
    objectivePhase: phase,
    progressionState: progression,
    successSignals: signals,
    weeklyPlan: weeklyPlan(objective),
    objectiveExerciseMix: mix.mix,
    objectiveExerciseMixRationale: mix.rationale,
    candidateScores: scores,
    curriculumState: input.curriculumState,
  };
}

export function findNextObjectiveCandidate(
  scores: ObjectiveCandidateScore[],
  currentObjective: TrainingObjective
): ObjectiveCandidateScore | null {
  return scores.find((entry) => entry.objective !== currentObjective) ?? null;
}

export function selectTrainingObjective(
  input: ObjectiveSelectionInput
): ObjectiveSelectionResult {
  const scores = computeObjectiveCandidateScores(input);
  return buildObjectiveSelectionSnapshot(input, scores[0].objective, scores);
}

export function buildObjectiveBias(
  selection: ObjectiveSelectionResult
): ObjectiveExerciseBias {
  return objectiveBias(selection.currentObjective);
}

