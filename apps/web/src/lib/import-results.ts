import { existsSync } from "fs";
import { readFile, readdir } from "fs/promises";
import { basename, extname, join } from "path";
import type { TrainingExercise, TrainingExercisesResult, TrainingTarget, TrainingTargetsResult } from "@chess-os/training";
import { loadImportAnalysisStatus } from "./import-analysis";
import { OUT } from "./paths";
import type {
  ImportGameDetail,
  ImportGameResult,
  ImportResults,
  ImportSessionOption,
  ImportSessionPreset,
  ImportThemeSummary,
} from "./import-types";

const THEME_LABELS: Record<string, string> = {
  tactical_miss: "Tactical blindness",
  material_loss: "Hanging pieces",
  positional_error: "Positional drift",
  endgame_technique: "Endgame conversion",
  opening_inaccuracy: "Opening inaccuracies",
  calculation_error: "Calculation errors",
  critical_defense: "Defensive resources",
};

const THEME_PRESETS: Record<string, ImportSessionPreset> = {
  tactical_miss: "tactical_recovery",
  material_loss: "mixed_improvement",
  positional_error: "mixed_improvement",
  endgame_technique: "endgame_mistakes",
  opening_inaccuracy: "opening_mistakes",
  calculation_error: "tactical_recovery",
  critical_defense: "tactical_recovery",
};

const SESSION_OPTIONS: ImportSessionOption[] = [
  {
    preset: "tactical_recovery",
    label: "Tactical recovery session",
    description: "Focus on tactical misses, calculation errors, and defensive saves from imported games.",
    recommendedThemes: ["Tactical blindness", "Calculation errors", "Defensive resources"],
  },
  {
    preset: "opening_mistakes",
    label: "Opening mistakes session",
    description: "Replay early-game inaccuracies and stabilize opening decisions from your imports.",
    recommendedThemes: ["Opening inaccuracies"],
  },
  {
    preset: "endgame_mistakes",
    label: "Endgame mistakes session",
    description: "Drill endgame conversion and late-phase mistakes pulled from imported games.",
    recommendedThemes: ["Endgame conversion"],
  },
  {
    preset: "mixed_improvement",
    label: "Mixed improvement session",
    description: "Blend the strongest themes across your latest imported games into one adaptive session.",
    recommendedThemes: ["Hanging pieces", "Positional drift", "Opening inaccuracies", "Endgame conversion"],
  },
];

interface PgnHeaders {
  white?: string;
  black?: string;
}

function toThemeSummary(key: string, count: number): ImportThemeSummary {
  return {
    key,
    label: THEME_LABELS[key] ?? key.replace(/_/g, " "),
    count,
    preset: THEME_PRESETS[key] ?? "mixed_improvement",
  };
}

function parsePgnHeaders(raw: string): PgnHeaders {
  const headers: PgnHeaders = {};
  const pattern = /^\[(\w+)\s+"([^"]*)"\]/gm;
  for (const match of raw.matchAll(pattern)) {
    const [, key, value] = match;
    if (key === "White") headers.white = value;
    if (key === "Black") headers.black = value;
  }
  return headers;
}

function opponentLabel(headers: PgnHeaders, fallbackGameId: string): string {
  if (headers.white && headers.black) return `${headers.white} vs ${headers.black}`;
  return fallbackGameId;
}

async function loadJsonIfExists<T>(path: string): Promise<T | null> {
  if (!existsSync(path)) return null;
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as T;
}

function sortThemeCounts(entries: Map<string, number>): ImportThemeSummary[] {
  return [...entries.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => toThemeSummary(key, count));
}

function buildGameDetails(
  targets: TrainingTarget[],
  exercises: TrainingExercise[]
): ImportGameDetail[] {
  const exerciseByPosition = new Map(exercises.map((exercise) => [exercise.positionId, exercise]));

  return targets
    .filter((target) => target.targetType !== "critical_test")
    .sort((a, b) => b.targetPriority - a.targetPriority)
    .slice(0, 8)
    .map((target) => {
      const exercise = exerciseByPosition.get(target.positionId);
      const themeKey = exercise?.explanation.lessonCategory ?? target.targetType;
      const theme = THEME_LABELS[themeKey] ?? themeKey.replace(/_/g, " ");
      return {
        positionId: target.positionId,
        ply: target.ply,
        move: target.moveSan,
        evaluationSwing: exercise?.engineAnswer.evalSwing ?? Math.abs(target.evalCp),
        theme,
        suggestedTraining: SESSION_OPTIONS.find((option) => option.preset === (THEME_PRESETS[themeKey] ?? "mixed_improvement"))?.label ?? "Mixed improvement session",
        difficulty: exercise?.explanation.difficultyEstimate ?? "adaptive",
      };
    });
}

export function importPresetCategories(preset: ImportSessionPreset): string[] | null {
  switch (preset) {
    case "tactical_recovery":
      return ["tactical_miss", "calculation_error", "critical_defense"];
    case "opening_mistakes":
      return ["opening_inaccuracy"];
    case "endgame_mistakes":
      return ["endgame_technique"];
    default:
      return null;
  }
}

export async function loadImportResults(): Promise<ImportResults | null> {
  const status = await loadImportAnalysisStatus();
  if (!status || status.summary.gamesWithArtifacts === 0) return null;

  const sourceDir = status.sourceDir;
  const entries = await readdir(sourceDir, { withFileTypes: true }).catch(() => []);
  const pgnFiles = entries.filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".pgn");

  const games: ImportGameResult[] = [];
  const overallThemeCounts = new Map<string, number>();

  for (const file of pgnFiles.sort((a, b) => a.name.localeCompare(b.name))) {
    const gameId = basename(file.name, extname(file.name));
    const pgnPath = join(sourceDir, file.name);
    const targetsPath = join(OUT, "intelligence", gameId, "training-targets.json");
    const exercisesPath = join(OUT, "exercises", gameId, "training-exercises.json");

    const [pgnRaw, targetsResult, exercisesResult] = await Promise.all([
      readFile(pgnPath, "utf-8").catch(() => ""),
      loadJsonIfExists<TrainingTargetsResult>(targetsPath),
      loadJsonIfExists<TrainingExercisesResult>(exercisesPath),
    ]);

    if (!targetsResult || !exercisesResult) continue;

    const themeCounts = new Map<string, number>();
    for (const exercise of exercisesResult.exercises) {
      const key = exercise.explanation.lessonCategory;
      themeCounts.set(key, (themeCounts.get(key) ?? 0) + 1);
      overallThemeCounts.set(key, (overallThemeCounts.get(key) ?? 0) + 1);
    }

    const gameThemeCounts = sortThemeCounts(themeCounts);
    const mistakes = targetsResult.targets.filter((target) => target.targetType !== "critical_test").length;
    const headers = parsePgnHeaders(pgnRaw);

    games.push({
      gameId,
      fileName: file.name,
      opponent: opponentLabel(headers, gameId),
      mistakes,
      themes: gameThemeCounts.slice(0, 3).map((entry) => entry.label),
      themeCounts: gameThemeCounts,
      details: buildGameDetails(targetsResult.targets, exercisesResult.exercises),
    });
  }

  const topThemes = sortThemeCounts(overallThemeCounts).slice(0, 4);

  return {
    generatedAt: status.generatedAt,
    summary: {
      gamesAnalyzed: status.summary.gamesWithArtifacts,
      positionsAnalyzed: status.summary.positionsEvaluated,
      exercisesGenerated: status.summary.trainingExercises,
    },
    topThemes,
    games,
    sessionOptions: SESSION_OPTIONS,
  };
}
