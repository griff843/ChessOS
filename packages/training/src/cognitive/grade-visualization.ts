/**
 * Grade a visualization exercise attempt.
 *
 * Binary grading: exact match with the correct answer is "exact",
 * otherwise "blunder".
 */

import type { GradingTier } from "../grading/eval-loss-bands";
import type { VisualizationQuestion, VisualizationGradeResult } from "./types";

/**
 * Grade a visualization answer by comparing to the correct answer.
 *
 * @param input    User's answer data
 * @param question The visualization question with correct answer
 * @returns Grading result
 */
export function gradeVisualization(
  input: { exerciseId: string; answer: string; timeTakenMs: number },
  question: VisualizationQuestion
): VisualizationGradeResult {
  const normalizedUser = input.answer.trim().toLowerCase();
  const normalizedCorrect = question.correctAnswer.trim().toLowerCase();

  const isCorrect = normalizedUser === normalizedCorrect;
  const gradingTier: GradingTier = isCorrect ? "exact" : "blunder";

  return {
    isCorrect,
    userAnswer: input.answer,
    correctAnswer: question.correctAnswer,
    questionType: question.type,
    gradingTier,
  };
}
