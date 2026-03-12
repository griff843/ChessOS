import type { TrainingExercise } from "../exercises/types";
import type { ProgressStore, SessionHistoryRecord } from "../progress/types";
import type { ConceptGraph } from "../concepts/types";
import { mapExerciseToConcepts } from "../concepts/types";
import type { LearningConceptState, LearningModel } from "./types";

interface OpeningLookup {
  byGameId: Record<string, string | undefined>;
}

interface ConceptAccumulator {
  conceptKey: string;
  conceptName: string;
  reviewCount: number;
  successCount: number;
  failureCount: number;
  exposureCount: number;
  intervalDaysTotal: number;
  intervalSamples: number;
  qualityTotal: number;
  qualitySamples: number;
  lastSeenAt: string | null;
  lastCorrectAt: string | null;
  lastIncorrectAt: string | null;
  improvingEvidence: number;
  worseningEvidence: number;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

function daysBetween(from: string | null, to: string): number {
  if (!from) return 0;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, ms / 86400000);
}

function laterDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function buildAccumulator(conceptKey: string, conceptName: string): ConceptAccumulator {
  return {
    conceptKey,
    conceptName,
    reviewCount: 0,
    successCount: 0,
    failureCount: 0,
    exposureCount: 0,
    intervalDaysTotal: 0,
    intervalSamples: 0,
    qualityTotal: 0,
    qualitySamples: 0,
    lastSeenAt: null,
    lastCorrectAt: null,
    lastIncorrectAt: null,
    improvingEvidence: 0,
    worseningEvidence: 0,
  };
}

function trendFromEvidence(success: number, failure: number, improving: number, worsening: number): LearningConceptState["trend"] {
  if (success + failure < 2) return "insufficient_data";
  if (improving > worsening) return "improving";
  if (worsening > improving) return "worsening";
  return "stable";
}

export function deriveLearningModel(args: {
  generatedAt?: string;
  exercises: TrainingExercise[];
  store: ProgressStore;
  history: SessionHistoryRecord[];
  conceptGraph: ConceptGraph;
  openingLookup?: OpeningLookup;
}): LearningModel {
  const generatedAt = args.generatedAt ?? new Date().toISOString();
  const accumulators = new Map<string, ConceptAccumulator>();
  const conceptIndex = args.conceptGraph.conceptIndex;

  const touch = (conceptKey: string): ConceptAccumulator => {
    const concept = conceptIndex[conceptKey];
    const existing = accumulators.get(conceptKey);
    if (existing) return existing;
    const next = buildAccumulator(conceptKey, concept?.conceptName ?? conceptKey);
    accumulators.set(conceptKey, next);
    return next;
  };

  for (const exercise of args.exercises) {
    const progress = args.store.exercises[exercise.positionId];
    const openingFamily = args.openingLookup?.byGameId[exercise.gameId] ?? null;
    const concepts = mapExerciseToConcepts(exercise, args.conceptGraph, openingFamily);
    if (concepts.length === 0) continue;

    for (const conceptKey of concepts) {
      const acc = touch(conceptKey);
      acc.exposureCount += 1;
      if (!progress) continue;
      acc.reviewCount += progress.timesSeen;
      acc.successCount += progress.timesCorrect;
      acc.failureCount += progress.timesIncorrect;
      acc.lastSeenAt = laterDate(acc.lastSeenAt, progress.lastSeenAt);
      if (progress.lastResult === "correct") {
        acc.lastCorrectAt = laterDate(acc.lastCorrectAt, progress.lastSeenAt);
      }
      if (progress.lastResult === "incorrect") {
        acc.lastIncorrectAt = laterDate(acc.lastIncorrectAt, progress.lastSeenAt);
      }
      if (progress.intervalDays > 0) {
        acc.intervalDaysTotal += progress.intervalDays;
        acc.intervalSamples += 1;
      }
      acc.qualityTotal += progress.rollingQualityScore;
      acc.qualitySamples += 1;
      if (progress.masteryState === "improving" || progress.masteryState === "mastered") {
        acc.improvingEvidence += 1;
      }
      if (progress.masteryState === "unstable" || progress.lastResult === "incorrect") {
        acc.worseningEvidence += 1;
      }
    }
  }

  for (const record of args.history.filter((entry) => entry.completedAt && entry.results)) {
    for (const [category, count] of Object.entries(record.categoryDistribution)) {
      const concept = args.conceptGraph.concepts.find((entry) => entry.lessonCategories.includes(category as never));
      if (!concept || count <= 0) continue;
      const acc = touch(concept.conceptKey);
      acc.exposureCount += count;
    }
  }

  const concepts = args.conceptGraph.concepts.map((concept) => {
    const acc = accumulators.get(concept.conceptKey) ?? buildAccumulator(concept.conceptKey, concept.conceptName);
    const attempts = acc.successCount + acc.failureCount;
    const accuracy = attempts > 0 ? acc.successCount / attempts : 0;
    const avgQuality = acc.qualitySamples > 0 ? acc.qualityTotal / acc.qualitySamples : 0;
    const avgInterval = acc.intervalSamples > 0 ? acc.intervalDaysTotal / acc.intervalSamples : 0;
    const daysSinceSeen = daysBetween(acc.lastSeenAt, generatedAt);
    const recencyPenalty = acc.lastSeenAt ? clamp(daysSinceSeen / Math.max(avgInterval || 3, 1), 0, 1.5) : 1;
    const halfLife = attempts === 0 ? 2 : Math.max(2, Number((2 + accuracy * 8 + avgInterval * 0.75 + avgQuality * 4).toFixed(2)));
    const forgettingRisk = attempts === 0
      ? 1
      : clamp((daysSinceSeen / halfLife) * (1 - accuracy * 0.45) + (acc.failureCount > acc.successCount ? 0.15 : 0), 0, 1);
    const masteryScore = attempts === 0
      ? 0
      : clamp(accuracy * 0.55 + avgQuality * 0.2 + clamp(avgInterval / 21, 0, 1) * 0.15 + clamp((acc.successCount - acc.failureCount) / Math.max(attempts, 1), -1, 1) * 0.1);
    const retentionScore = attempts === 0
      ? 0
      : clamp(accuracy * 0.6 + (1 - forgettingRisk) * 0.25 + clamp(1 - recencyPenalty * 0.25, 0, 1) * 0.15);
    const stabilityScore = attempts === 0
      ? 0
      : clamp(avgQuality * 0.4 + accuracy * 0.35 + clamp((acc.reviewCount || 0) / 10, 0, 1) * 0.1 + clamp(1 - (acc.failureCount / Math.max(attempts, 1)), 0, 1) * 0.15);

    const status: LearningConceptState["status"] =
      attempts === 0
        ? "unseen"
        : masteryScore >= 0.78 && stabilityScore >= 0.72 && forgettingRisk <= 0.35
          ? "mastered"
          : forgettingRisk >= 0.72
            ? "at_risk"
            : stabilityScore < 0.45 || accuracy < 0.5
              ? "unstable"
              : "stable";

    const nextRecommendedReviewAt = acc.lastSeenAt
      ? new Date(new Date(acc.lastSeenAt).getTime() + halfLife * 86400000).toISOString()
      : generatedAt;

    const signals: string[] = [];
    if (attempts === 0) {
      signals.push("No exposure yet; schedule an introductory review.");
    } else {
      signals.push(`Accuracy ${Math.round(accuracy * 100)}% across ${attempts} attempts.`);
      signals.push(`Average stability ${Math.round(stabilityScore * 100)} with forgetting risk ${Math.round(forgettingRisk * 100)}.`);
      if (acc.failureCount > acc.successCount) {
        signals.push("Failures still outnumber successes, so reinforce before expanding difficulty.");
      } else if (status === "mastered") {
        signals.push("This concept is stable enough to deprioritize in near-term session composition.");
      } else if (status === "at_risk") {
        signals.push("Spacing window is expiring; bring this back soon for retention support.");
      }
    }

    return {
      conceptKey: concept.conceptKey,
      conceptName: concept.conceptName,
      masteryScore: round(masteryScore),
      retentionScore: round(retentionScore),
      forgettingRisk: round(forgettingRisk),
      stabilityScore: round(stabilityScore),
      lastSeenAt: acc.lastSeenAt,
      lastCorrectAt: acc.lastCorrectAt,
      lastIncorrectAt: acc.lastIncorrectAt,
      reviewCount: acc.reviewCount,
      successCount: acc.successCount,
      failureCount: acc.failureCount,
      conceptHalfLifeEstimate: round(halfLife),
      nextRecommendedReviewAt,
      trend: trendFromEvidence(acc.successCount, acc.failureCount, acc.improvingEvidence, acc.worseningEvidence),
      status,
      signals,
    } satisfies LearningConceptState;
  }).sort((a, b) => b.forgettingRisk - a.forgettingRisk || a.conceptKey.localeCompare(b.conceptKey));

  const masteredConcepts = concepts.filter((entry) => entry.status === "mastered").map((entry) => entry.conceptKey);
  const unstableConcepts = concepts.filter((entry) => entry.status === "unstable").map((entry) => entry.conceptKey);
  const atRiskConcepts = concepts.filter((entry) => entry.status === "at_risk").map((entry) => entry.conceptKey);

  const conceptCount = concepts.length;
  const avg = (selector: (entry: LearningConceptState) => number) =>
    conceptCount > 0 ? round(concepts.reduce((sum, entry) => sum + selector(entry), 0) / conceptCount) : 0;

  return {
    generatedAt,
    conceptCount,
    concepts,
    masteredConcepts,
    unstableConcepts,
    atRiskConcepts,
    nextReviewRecommendations: concepts
      .filter((entry) => entry.status === "at_risk" || entry.status === "unstable")
      .slice(0, 8)
      .map((entry) => ({
        conceptKey: entry.conceptKey,
        conceptName: entry.conceptName,
        nextRecommendedReviewAt: entry.nextRecommendedReviewAt,
        forgettingRisk: entry.forgettingRisk,
      })),
    summary: {
      averageMastery: avg((entry) => entry.masteryScore),
      averageRetention: avg((entry) => entry.retentionScore),
      averageStability: avg((entry) => entry.stabilityScore),
      averageForgettingRisk: avg((entry) => entry.forgettingRisk),
    },
  };
}

export function buildLearningPriorityLookup(
  exercises: TrainingExercise[],
  conceptGraph: ConceptGraph,
  learningModel: LearningModel,
  openingLookup?: OpeningLookup
): Map<string, number> {
  const byConcept = new Map(learningModel.concepts.map((concept) => [concept.conceptKey, concept]));
  const boosts = new Map<string, number>();

  for (const exercise of exercises) {
    const openingFamily = openingLookup?.byGameId[exercise.gameId] ?? null;
    const concepts = mapExerciseToConcepts(exercise, conceptGraph, openingFamily);
    let bestBoost = 0;

    for (const conceptKey of concepts) {
      const concept = byConcept.get(conceptKey);
      if (!concept) continue;
      const boost = concept.forgettingRisk * 0.55 + (concept.status === "unstable" ? 0.25 : 0) + (concept.trend === "improving" ? 0.1 : 0);
      if (boost > bestBoost) bestBoost = boost;
    }

    boosts.set(exercise.positionId, round(bestBoost));
  }

  return boosts;
}
