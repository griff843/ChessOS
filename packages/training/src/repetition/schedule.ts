export interface ReviewOutcome {
  trainingItemId: string;
  wasCorrect: boolean;
  reviewedAt: string;
}

export function getNextReviewIntervalDays(wasCorrect: boolean, failureCount: number): number {
  if (!wasCorrect) return 1;
  if (failureCount >= 3) return 2;
  if (failureCount >= 1) return 4;
  return 7;
}
