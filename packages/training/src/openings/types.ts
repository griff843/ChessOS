export type OpeningMistakeTheme =
  | "poor_development"
  | "king_safety_neglect"
  | "center_control_issue"
  | "early_tactical_concession"
  | "structural_concession"
  | "theory_deviation";

export interface OpeningClassification {
  gameId: string;
  openingFamily: string;
  openingName: string;
  lineKey: string;
  matchedMoves: string[];
  moveCount: number;
}

export interface OpeningMistake {
  gameId: string;
  positionId: string;
  ply: number;
  openingFamily: string;
  theme: OpeningMistakeTheme;
  severity: "low" | "medium" | "high";
  explanation: string;
  relatedConcepts: string[];
}

export interface OpeningFamilySummary {
  openingFamily: string;
  openingName: string;
  games: number;
  mistakes: number;
  topThemes: Array<{
    theme: OpeningMistakeTheme;
    count: number;
  }>;
}

export interface OpeningReport {
  generatedAt: string;
  classifications: OpeningClassification[];
  familySummaries: OpeningFamilySummary[];
  topWeaknesses: Array<{
    openingFamily: string;
    openingName: string;
    theme: OpeningMistakeTheme;
    count: number;
  }>;
  recommendedTrainingThemes: string[];
}
