import type {
  RepertoireDrillEvent,
  RepertoireDrillExercise,
  RepertoireRecallGrade,
  SpacedReviewBucket,
} from "./types.js";

function normalizeMove(move: string): string {
  return move.replace(/[+#?!]+/g, "").trim();
}

function bucketForGrade(grade: RepertoireRecallGrade, confidence: number): SpacedReviewBucket {
  if (grade === "failed_recall") return "immediate";
  if (grade === "partial_recall" || confidence < 0.45) return "short_term";
  if (grade === "acceptable_recall" || confidence < 0.75) return "warm";
  return "stable";
}

function nextReviewAt(reviewedAt: string, bucket: SpacedReviewBucket): string {
  const hours = bucket === "immediate" ? 0 : bucket === "short_term" ? 24 : bucket === "warm" ? 72 : 168;
  return new Date(new Date(reviewedAt).getTime() + hours * 60 * 60 * 1000).toISOString();
}

export function gradeRepertoireDrillAttempt(args: {
  exercise: RepertoireDrillExercise;
  userResponse: string;
  confidence: number;
  reviewedAt: string;
}): RepertoireDrillEvent {
  const expected = args.exercise.expectedContinuation.map(normalizeMove);
  const userMoves = args.userResponse
    .split(/\s+/)
    .map(normalizeMove)
    .filter(Boolean);

  let matched = 0;
  for (let i = 0; i < Math.min(expected.length, userMoves.length); i += 1) {
    if (expected[i] !== userMoves[i]) break;
    matched += 1;
  }

  let recallGrade: RepertoireRecallGrade;
  if (expected.length > 0 && matched === expected.length && userMoves.length === expected.length) {
    recallGrade = "exact_recall";
  } else if (matched === expected.length && userMoves.length < expected.length) {
    recallGrade = "acceptable_recall";
  } else if (matched > 0) {
    recallGrade = "partial_recall";
  } else {
    recallGrade = "failed_recall";
  }

  const correctness = recallGrade === "exact_recall" || recallGrade === "acceptable_recall";
  const spacedReviewBucket = bucketForGrade(recallGrade, args.confidence);

  return {
    drillSessionId: "",
    repertoireKey: args.exercise.repertoireKey,
    lineId: args.exercise.lineId,
    lineKey: args.exercise.lineKey,
    presentedLine: [...args.exercise.presentedLine],
    expectedContinuation: [...args.exercise.expectedContinuation],
    userResponse: userMoves,
    recallGrade,
    correctness,
    confidence: Number(Math.max(0, Math.min(1, args.confidence)).toFixed(4)),
    reviewedAt: args.reviewedAt,
    nextRecommendedReviewAt: nextReviewAt(args.reviewedAt, spacedReviewBucket),
    spacedReviewBucket,
    conceptLinkedWeaknesses: [...args.exercise.conceptLinkedWeaknesses],
    sourceOpeningFamily: args.exercise.sourceOpeningFamily,
  };
}
