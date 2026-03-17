import type { TrainingExercise } from "../exercises/types";
import type {
  OpeningClassification,
  OpeningMistake,
  OpeningMistakeTheme,
  OpeningReport,
} from "./types";

function severityFromExercise(exercise: TrainingExercise): OpeningMistake["severity"] {
  if (exercise.engineAnswer.evalSwing >= 250 || exercise.actualLabel === "blunder") return "high";
  if (exercise.engineAnswer.evalSwing >= 120 || exercise.actualLabel === "mistake") return "medium";
  return "low";
}

function relatedConcepts(theme: OpeningMistakeTheme): string[] {
  switch (theme) {
    case "poor_development":
      return ["opening_development", "piece_activity"];
    case "king_safety_neglect":
      return ["king_safety", "opening_development"];
    case "center_control_loss":
      return ["center_control", "pawn_structure"];
    case "structural_concession":
      return ["pawn_structure", "piece_activity"];
    case "early_tactical_concession":
      return ["tactical_awareness", "initiative"];
    case "premature_queen_activity":
      return ["opening_development", "king_safety"];
    case "repeated_opening_drift":
      return ["opening_development", "calculation_stability"];
    case "theory_deviation":
      return ["opening_development", "center_control"];
  }
}

function detectThemes(exercise: TrainingExercise, classification: OpeningClassification): OpeningMistakeTheme[] {
  const themes = new Set<OpeningMistakeTheme>();
  const playedMove = exercise.playedMoveSan.replace(/[+#?!]+/g, "");
  const openingPhase = exercise.phase === "opening" && exercise.ply <= 16;
  if (!openingPhase) return [];

  if (exercise.explanation.lessonCategory === "opening_inaccuracy") {
    themes.add("poor_development");
  }
  if (exercise.explanation.lessonCategory === "critical_defense" || (exercise.ply >= 10 && !classification.sourceMoves.slice(0, 12).some((move) => move === "O-O" || move === "O-O-O"))) {
    themes.add("king_safety_neglect");
  }
  if (exercise.explanation.lessonCategory === "positional_error" || exercise.explanation.reasonCodes.includes("opening_error")) {
    themes.add("center_control_loss");
  }
  if (exercise.explanation.lessonCategory === "material_loss" || exercise.explanation.lessonCategory === "tactical_miss") {
    themes.add("early_tactical_concession");
  }
  if (exercise.explanation.lessonCategory === "opening_inaccuracy" && (playedMove.includes("x") || /^[a-h]/.test(playedMove))) {
    themes.add("structural_concession");
  }
  if (playedMove.startsWith("Q") && exercise.ply <= 12) {
    themes.add("premature_queen_activity");
  }
  if (classification.confidence >= 0.8 && exercise.explanation.reasonCodes.includes("opening_error")) {
    themes.add("theory_deviation");
  }

  return [...themes];
}

function describe(theme: OpeningMistakeTheme, classification: OpeningClassification): string {
  switch (theme) {
    case "poor_development":
      return `${classification.openingName}: piece development lagged behind the canonical setup.`;
    case "king_safety_neglect":
      return `${classification.openingName}: king safety lagged while the opening was still unresolved.`;
    case "center_control_loss":
      return `${classification.openingName}: central control slipped before the middlegame plan was stable.`;
    case "early_tactical_concession":
      return `${classification.openingName}: the opening handed over tactical targets before coordination was complete.`;
    case "structural_concession":
      return `${classification.openingName}: the opening created a structural concession that shaped the next phase.`;
    case "premature_queen_activity":
      return `${classification.openingName}: queen activity arrived before development justified it.`;
    case "repeated_opening_drift":
      return `${classification.openingName}: multiple opening errors in the same game point to a recurring setup drift.`;
    case "theory_deviation":
      return `${classification.openingName}: the move order left the canonical line too early for the position type.`;
  }
}

export function formatOpeningMistakeMd(mistake: OpeningMistake): string {
  return `- ${mistake.openingName}: ${mistake.theme.replace(/_/g, " ")} (${mistake.severity}) - ${mistake.explanation}`;
}

export function buildOpeningReport(args: {
  generatedAt?: string;
  classifications: OpeningClassification[];
  exercises: TrainingExercise[];
}): { report: OpeningReport; mistakes: OpeningMistake[] } {
  const generatedAt = args.generatedAt ?? new Date().toISOString();
  const classificationByGame = new Map(args.classifications.map((entry) => [entry.sourceGameId, entry]));
  const mistakes: OpeningMistake[] = [];
  const gameMistakeCounts = new Map<string, number>();

  for (const exercise of args.exercises) {
    if (exercise.phase !== "opening") continue;
    const classification = classificationByGame.get(exercise.gameId);
    if (!classification) continue;
    for (const theme of detectThemes(exercise, classification)) {
      mistakes.push({
        sourceGameId: exercise.gameId,
        openingFamily: classification.openingFamily,
        openingKey: classification.openingKey,
        openingName: classification.openingName,
        detectedLine: classification.detectedLine,
        positionId: exercise.positionId,
        ply: exercise.ply,
        theme,
        severity: severityFromExercise(exercise),
        explanation: describe(theme, classification),
        conceptMappings: relatedConcepts(theme),
      });
      gameMistakeCounts.set(exercise.gameId, (gameMistakeCounts.get(exercise.gameId) ?? 0) + 1);
    }
  }

  for (const mistake of [...mistakes]) {
    if ((gameMistakeCounts.get(mistake.sourceGameId) ?? 0) >= 3) {
      mistakes.push({
        ...mistake,
        theme: "repeated_opening_drift",
        explanation: describe("repeated_opening_drift", classificationByGame.get(mistake.sourceGameId)!),
        conceptMappings: relatedConcepts("repeated_opening_drift"),
      });
      gameMistakeCounts.set(mistake.sourceGameId, 0);
    }
  }

  const summaryMap = new Map<string, {
    classification: OpeningClassification;
    games: Set<string>;
    themeCounts: Map<OpeningMistakeTheme, number>;
    conceptMappings: Set<string>;
    confidenceTotal: number;
  }>();

  for (const classification of args.classifications) {
    if (!summaryMap.has(classification.openingKey)) {
      summaryMap.set(classification.openingKey, {
        classification,
        games: new Set<string>(),
        themeCounts: new Map<OpeningMistakeTheme, number>(),
        conceptMappings: new Set<string>(classification.conceptMappings),
        confidenceTotal: 0,
      });
    }
    const summary = summaryMap.get(classification.openingKey)!;
    summary.games.add(classification.sourceGameId);
    summary.confidenceTotal += classification.confidence;
    classification.conceptMappings.forEach((concept) => summary.conceptMappings.add(concept));
  }

  for (const mistake of mistakes) {
    const summary = summaryMap.get(mistake.openingKey);
    if (!summary) continue;
    summary.themeCounts.set(mistake.theme, (summary.themeCounts.get(mistake.theme) ?? 0) + 1);
    mistake.conceptMappings.forEach((concept) => summary.conceptMappings.add(concept));
  }

  const familySummaries = [...summaryMap.values()]
    .map((summary) => ({
      openingFamily: summary.classification.openingFamily,
      openingKey: summary.classification.openingKey,
      openingName: summary.classification.openingName,
      games: summary.games.size,
      mistakes: [...summary.themeCounts.values()].reduce((sum, count) => sum + count, 0),
      averageConfidence: Number((summary.confidenceTotal / Math.max(summary.games.size, 1)).toFixed(4)),
      openingTags: [...summary.classification.openingTags],
      topThemes: [...summary.themeCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3)
        .map(([theme, count]) => ({ theme, count })),
      conceptMappings: [...summary.conceptMappings].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => b.mistakes - a.mistakes || a.openingFamily.localeCompare(b.openingFamily));

  const topWeaknesses = familySummaries
    .flatMap((summary) =>
      summary.topThemes.map((entry) => ({
        openingFamily: summary.openingFamily,
        openingKey: summary.openingKey,
        openingName: summary.openingName,
        theme: entry.theme,
        count: entry.count,
        conceptMappings: relatedConcepts(entry.theme),
      }))
    )
    .sort((a, b) => b.count - a.count || a.openingFamily.localeCompare(b.openingFamily))
    .slice(0, 8);

  const recurringMap = new Map<OpeningMistakeTheme, { count: number; openings: Set<OpeningClassification["openingFamily"]> }>();
  for (const mistake of mistakes) {
    const entry = recurringMap.get(mistake.theme) ?? { count: 0, openings: new Set<OpeningClassification["openingFamily"]>() };
    entry.count += 1;
    entry.openings.add(mistake.openingFamily);
    recurringMap.set(mistake.theme, entry);
  }

  const recurringMistakes = [...recurringMap.entries()]
    .map(([theme, entry]) => ({
      theme,
      count: entry.count,
      openings: [...entry.openings].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme))
    .slice(0, 6);

  const recommendedTrainingThemes = [...new Set(topWeaknesses.flatMap((entry) => entry.conceptMappings))].slice(0, 6);

  return {
    report: {
      generatedAt,
      classifications: args.classifications,
      familySummaries,
      topWeaknesses,
      recurringMistakes,
      recommendedTrainingThemes,
    },
    mistakes: mistakes.sort((a, b) => b.ply - a.ply || a.sourceGameId.localeCompare(b.sourceGameId) || a.theme.localeCompare(b.theme)),
  };
}
