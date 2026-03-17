import type { TrainingExercise } from "../exercises/types";
import type { ObjectiveRankingInput } from "./types";

function objectiveRelevance(
  exercise: TrainingExercise,
  categoryBoosts: Record<string, number>,
  difficultyBoosts: Record<string, number>
): number {
  const categoryBoost = categoryBoosts[exercise.explanation.lessonCategory] ?? 1;
  const difficultyBoost = difficultyBoosts[exercise.explanation.difficultyEstimate] ?? 1;
  return Number((categoryBoost * difficultyBoost).toFixed(6));
}

export function rankExercisesForObjective(input: ObjectiveRankingInput): TrainingExercise[] {
  const { exercises, context } = input;
  const { categoryBoosts, difficultyBoosts } = context.bias;

  return [...exercises]
    .map((exercise, idx) => ({
      exercise,
      idx,
      relevance: objectiveRelevance(exercise, categoryBoosts, difficultyBoosts),
    }))
    .sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      if (b.exercise.targetPriority !== a.exercise.targetPriority) {
        return b.exercise.targetPriority - a.exercise.targetPriority;
      }
      return a.idx - b.idx;
    })
    .map((entry) => entry.exercise);
}
