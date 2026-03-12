import type { TrainingExercise } from "../exercises/types";
import type { OpeningClassification, OpeningMistake, OpeningMistakeTheme, OpeningReport } from "./types";

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
    case "center_control_issue":
      return ["center_control", "pawn_structure"];
    case "structural_concession":
      return ["pawn_structure", "piece_activity"];
    case "early_tactical_concession":
      return ["tactical_awareness", "initiative"];
    case "theory_deviation":
      return ["opening_development", "center_control"];
  }
}

function detectThemes(exercise: TrainingExercise): OpeningMistakeTheme[] {
  const themes = new Set<OpeningMistakeTheme>();
  if (exercise.explanation.lessonCategory === "opening_inaccuracy") {
    themes.add("poor_development");
  }
  if (exercise.explanation.lessonCategory === "opening_inaccuracy" && exercise.explanation.reasonCodes.includes("opening_error")) {
    themes.add("theory_deviation");
  }
  if (exercise.explanation.lessonCategory === "critical_defense") {
    themes.add("king_safety_neglect");
  }
  if (exercise.explanation.lessonCategory === "positional_error") {
    themes.add("center_control_issue");
  }
  if (exercise.explanation.lessonCategory === "material_loss" || exercise.explanation.lessonCategory === "tactical_miss") {
    themes.add("early_tactical_concession");
  }
  if (exercise.explanation.lessonCategory === "opening_inaccuracy" && exercise.playedMoveSan.includes("x")) {
    themes.add("structural_concession");
  }
  if (themes.size === 0) {
    themes.add("poor_development");
  }
  return [...themes];
}

function describe(theme: OpeningMistakeTheme, openingName: string): string {
  switch (theme) {
    case "poor_development":
      return `${openingName}: pieces were not developed efficiently enough before the position became tactical.`;
    case "king_safety_neglect":
      return `${openingName}: king safety lagged behind the demands of the position.`;
    case "center_control_issue":
      return `${openingName}: central control slipped and the position became harder to coordinate.`;
    case "early_tactical_concession":
      return `${openingName}: the opening drifted into a tactical concession before the position was stabilized.`;
    case "structural_concession":
      return `${openingName}: the opening created a structural concession that shaped the middlegame.`;
    case "theory_deviation":
      return `${openingName}: the move order deviated from the stable development plan too early.`;
  }
}

export function buildOpeningReport(args: {
  generatedAt?: string;
  classifications: OpeningClassification[];
  exercises: TrainingExercise[];
}): { report: OpeningReport; mistakes: OpeningMistake[] } {
  const generatedAt = args.generatedAt ?? new Date().toISOString();
  const classificationByGame = new Map(args.classifications.map((entry) => [entry.gameId, entry]));
  const mistakes: OpeningMistake[] = [];

  for (const exercise of args.exercises) {
    if (exercise.phase !== "opening") continue;
    const classification = classificationByGame.get(exercise.gameId);
    if (!classification) continue;
    for (const theme of detectThemes(exercise)) {
      mistakes.push({
        gameId: exercise.gameId,
        positionId: exercise.positionId,
        ply: exercise.ply,
        openingFamily: classification.openingFamily,
        theme,
        severity: severityFromExercise(exercise),
        explanation: describe(theme, classification.openingName),
        relatedConcepts: relatedConcepts(theme),
      });
    }
  }

  const summaryMap = new Map<string, { openingName: string; games: Set<string>; themeCounts: Map<OpeningMistakeTheme, number> }>();
  for (const classification of args.classifications) {
    if (!summaryMap.has(classification.openingFamily)) {
      summaryMap.set(classification.openingFamily, {
        openingName: classification.openingName,
        games: new Set<string>(),
        themeCounts: new Map<OpeningMistakeTheme, number>(),
      });
    }
    summaryMap.get(classification.openingFamily)?.games.add(classification.gameId);
  }
  for (const mistake of mistakes) {
    const summary = summaryMap.get(mistake.openingFamily);
    if (!summary) continue;
    summary.themeCounts.set(mistake.theme, (summary.themeCounts.get(mistake.theme) ?? 0) + 1);
  }

  const familySummaries = [...summaryMap.entries()].map(([openingFamily, summary]) => ({
    openingFamily,
    openingName: summary.openingName,
    games: summary.games.size,
    mistakes: [...summary.themeCounts.values()].reduce((sum, count) => sum + count, 0),
    topThemes: [...summary.themeCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([theme, count]) => ({ theme, count })),
  })).sort((a, b) => b.mistakes - a.mistakes || a.openingFamily.localeCompare(b.openingFamily));

  const topWeaknesses = familySummaries.flatMap((summary) =>
    summary.topThemes.map((entry) => ({
      openingFamily: summary.openingFamily,
      openingName: summary.openingName,
      theme: entry.theme,
      count: entry.count,
    }))
  ).sort((a, b) => b.count - a.count || a.openingFamily.localeCompare(b.openingFamily)).slice(0, 6);

  const recommendedTrainingThemes = [...new Set(topWeaknesses.flatMap((entry) => relatedConcepts(entry.theme)))].slice(0, 6);

  return {
    report: {
      generatedAt,
      classifications: args.classifications,
      familySummaries,
      topWeaknesses,
      recommendedTrainingThemes,
    },
    mistakes,
  };
}
