export interface LearningConceptState {
  conceptKey: string;
  conceptName: string;
  masteryScore: number;
  retentionScore: number;
  forgettingRisk: number;
  stabilityScore: number;
  lastSeenAt: string | null;
  lastCorrectAt: string | null;
  lastIncorrectAt: string | null;
  reviewCount: number;
  successCount: number;
  failureCount: number;
  conceptHalfLifeEstimate: number;
  nextRecommendedReviewAt: string | null;
  trend: "improving" | "stable" | "worsening" | "insufficient_data";
  status: "mastered" | "stable" | "at_risk" | "unstable" | "unseen";
  signals: string[];
}

export interface LearningModel {
  generatedAt: string;
  conceptCount: number;
  concepts: LearningConceptState[];
  masteredConcepts: string[];
  unstableConcepts: string[];
  atRiskConcepts: string[];
  nextReviewRecommendations: Array<{
    conceptKey: string;
    conceptName: string;
    nextRecommendedReviewAt: string | null;
    forgettingRisk: number;
  }>;
  summary: {
    averageMastery: number;
    averageRetention: number;
    averageStability: number;
    averageForgettingRisk: number;
  };
}
