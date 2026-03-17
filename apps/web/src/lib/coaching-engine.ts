import { formatCategory } from "./utils";
import {
  PATTERN_DICTIONARY,
  type CoachingPatternKey,
} from "./pattern-dictionary";

export interface CoachingEngineInput {
  position: string;
  engineEvaluation: number | null;
  bestMove: string;
  userMove: string;
  theme: string;
  reasonCodes?: string[];
}

export interface MoveCoachingInsight {
  explanation: string;
  hint1: string;
  hint2: string;
  pattern: string;
  improvement_tip: string;
  patternKey: CoachingPatternKey;
}

export interface AdaptiveDifficultyPlan {
  correctStreak: number;
  failStreak: number;
  exerciseDepth: number;
  themeDifficulty: "reinforce" | "steady" | "stretch";
  rationale: string;
  nextFocus: string;
}

export interface SessionAttemptSummary {
  lessonCategory: string;
  difficultyEstimate: string;
  isCorrect: boolean;
}

export interface SessionCoachingFeedback {
  todaysFocus: string;
  correct: number;
  incorrect: number;
  themesImproved: string[];
  themesStruggling: string[];
  recurringWeakness: string | null;
  recommendedNextSession: string;
  adaptivePlan: AdaptiveDifficultyPlan;
}

const PATTERN_ALIASES: Array<[string, CoachingPatternKey]> = [
  ["hanging", "hanging_piece"],
  ["undefended", "hanging_piece"],
  ["fork", "fork"],
  ["double_attack", "fork"],
  ["double attack", "fork"],
  ["pin", "pin"],
  ["pinned", "pin"],
  ["skewer", "skewer"],
  ["discovered", "discovered_attack"],
  ["back_rank", "back_rank"],
  ["back rank", "back_rank"],
  ["deflection", "deflection"],
  ["remove_defender", "deflection"],
  ["remove defender", "deflection"],
  ["overload", "overload"],
  ["overworked", "overload"],
  ["zwischenzug", "zwischenzug"],
  ["intermezzo", "zwischenzug"],
  ["endgame", "endgame_conversion"],
  ["conversion", "endgame_conversion"],
];

const FALLBACK_THEME_PATTERNS: Record<string, CoachingPatternKey> = {
  tactical_miss: "fork",
  material_loss: "hanging_piece",
  positional_error: "pin",
  endgame_technique: "endgame_conversion",
  opening_inaccuracy: "overload",
  calculation_error: "zwischenzug",
  critical_defense: "back_rank",
};

function inferPatternKey(
  theme: string,
  reasonCodes: string[] = []
): CoachingPatternKey {
  const haystack = [theme, ...reasonCodes].join(" ").toLowerCase();

  for (const [alias, key] of PATTERN_ALIASES) {
    if (haystack.includes(alias)) return key;
  }

  return FALLBACK_THEME_PATTERNS[theme] ?? "fork";
}

function formatHint(template: string, input: CoachingEngineInput): string {
  return template
    .replaceAll("{bestMove}", input.bestMove)
    .replaceAll("{userMove}", input.userMove)
    .replaceAll("{theme}", formatCategory(input.theme));
}

function describeEval(engineEvaluation: number | null, position: string): string {
  const pieceCount = position.split(" ")[0]?.replace(/[1-8/]/g, "").length ?? 0;
  if (engineEvaluation === null || Number.isNaN(engineEvaluation)) {
    return pieceCount <= 8
      ? "The ending still demanded technique and precise coordination."
      : "The position still had tactical tension.";
  }
  if (engineEvaluation >= 250) {
    return "You had a clearly favorable position and there was a concrete way to press the advantage.";
  }
  if (engineEvaluation <= -250) {
    return "This was a defensive moment, so precision mattered to avoid the position getting worse.";
  }
  return "The position was balanced enough that one tactical detail changed the assessment.";
}

export function buildCoachingInsight(
  input: CoachingEngineInput
): MoveCoachingInsight {
  const patternKey = inferPatternKey(input.theme, input.reasonCodes);
  const entry = PATTERN_DICTIONARY[patternKey];

  return {
    explanation:
      `${describeEval(input.engineEvaluation, input.position)} ${entry.coachingText} ` +
      `The coach move was ${input.bestMove}, not ${input.userMove}.`,
    hint1: formatHint(entry.hintTemplates[0], input),
    hint2: formatHint(entry.hintTemplates[1], input),
    pattern: entry.name,
    improvement_tip:
      patternKey === "fork"
        ? "Look for double attacks when pieces are centralized."
        : patternKey === "endgame_conversion"
          ? "In winning endings, improve king activity and reduce counterplay before cashing in."
          : `Train ${entry.name.toLowerCase()} positions and verbalize the key defender before moving.`,
    patternKey,
  };
}

export function buildAdaptiveDifficultyPlan(input: {
  correctStreak: number;
  failStreak: number;
  theme: string;
}): AdaptiveDifficultyPlan {
  if (input.correctStreak >= 3) {
    return {
      correctStreak: input.correctStreak,
      failStreak: input.failStreak,
      exerciseDepth: 4,
      themeDifficulty: "stretch",
      rationale:
        "Your current streak supports deeper calculation and a tougher thematic load.",
      nextFocus: `Press into harder ${formatCategory(input.theme).toLowerCase()} exercises.`,
    };
  }

  if (input.failStreak >= 2) {
    return {
      correctStreak: input.correctStreak,
      failStreak: input.failStreak,
      exerciseDepth: 2,
      themeDifficulty: "reinforce",
      rationale:
        "The recent miss streak suggests we should simplify the tree and repeat the core motif.",
      nextFocus: `Reinforce ${formatCategory(input.theme).toLowerCase()} with shallower exercises.`,
    };
  }

  return {
    correctStreak: input.correctStreak,
    failStreak: input.failStreak,
    exerciseDepth: 3,
    themeDifficulty: "steady",
    rationale:
      "Current results are mixed, so hold the depth steady and keep the same teaching theme.",
    nextFocus: `Stay with the current ${formatCategory(input.theme).toLowerCase()} difficulty.`,
  };
}

export function buildSessionCoachingFeedback(
  attempts: SessionAttemptSummary[]
): SessionCoachingFeedback {
  const correct = attempts.filter((attempt) => attempt.isCorrect).length;
  const incorrect = attempts.length - correct;

  const byTheme = new Map<
    string,
    { total: number; correct: number; difficulty: Record<string, number> }
  >();

  for (const attempt of attempts) {
    const current = byTheme.get(attempt.lessonCategory) ?? {
      total: 0,
      correct: 0,
      difficulty: {},
    };

    current.total += 1;
    current.correct += attempt.isCorrect ? 1 : 0;
    current.difficulty[attempt.difficultyEstimate] =
      (current.difficulty[attempt.difficultyEstimate] ?? 0) + 1;
    byTheme.set(attempt.lessonCategory, current);
  }

  const rankedThemes = [...byTheme.entries()].sort((a, b) => {
    const aMisses = a[1].total - a[1].correct;
    const bMisses = b[1].total - b[1].correct;
    if (bMisses !== aMisses) return bMisses - aMisses;
    return b[1].total - a[1].total;
  });

  const themesImproved = [...byTheme.entries()]
    .filter(([, stats]) => stats.correct / stats.total >= 0.6)
    .map(([theme]) => formatCategory(theme))
    .slice(0, 3);

  const themesStruggling = rankedThemes
    .filter(([, stats]) => stats.correct / stats.total < 0.6)
    .map(([theme]) => formatCategory(theme))
    .slice(0, 3);

  const recurringWeakness = rankedThemes[0]?.[0] ?? null;
  const recurringWeaknessLabel = recurringWeakness
    ? formatCategory(recurringWeakness)
    : null;

  let correctStreak = 0;
  let failStreak = 0;
  for (let i = attempts.length - 1; i >= 0; i -= 1) {
    if (attempts[i]?.isCorrect) {
      if (failStreak > 0) break;
      correctStreak += 1;
    } else {
      if (correctStreak > 0) break;
      failStreak += 1;
    }
  }

  const dominantTheme = rankedThemes
    .slice()
    .sort((a, b) => b[1].total - a[1].total)[0]?.[0];
  const adaptivePlan = buildAdaptiveDifficultyPlan({
    correctStreak,
    failStreak,
    theme: recurringWeakness ?? dominantTheme ?? "tactical_miss",
  });

  return {
    todaysFocus: formatCategory(dominantTheme ?? "tactical_miss"),
    correct,
    incorrect,
    themesImproved,
    themesStruggling,
    recurringWeakness: recurringWeaknessLabel,
    recommendedNextSession: recurringWeaknessLabel
      ? `${recurringWeaknessLabel} tactics`
      : "Mixed tactical repair",
    adaptivePlan,
  };
}


