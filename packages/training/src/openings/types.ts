export type OpeningFamily =
  | "italian_game"
  | "ruy_lopez"
  | "sicilian_defense"
  | "french_defense"
  | "caro_kann"
  | "queens_gambit"
  | "london_system"
  | "jobava_london"
  | "kings_indian"
  | "scandinavian"
  | "english_opening"
  | "reverse_sicilian"
  | "vienna_game"
  | "pirc_modern"
  | "scotch_game"
  | "scotch_gambit"
  | "albin_countergambit"
  | "misc_unknown_opening";

export type OpeningMistakeTheme =
  | "poor_development"
  | "king_safety_neglect"
  | "center_control_loss"
  | "early_tactical_concession"
  | "structural_concession"
  | "premature_queen_activity"
  | "repeated_opening_drift"
  | "theory_deviation";

export interface OpeningClassification {
  openingKey: string;
  openingName: string;
  openingFamily: OpeningFamily;
  canonicalMoves: string[];
  openingTags: string[];
  conceptMappings: string[];
  mistakeCategories: OpeningMistakeTheme[];
  detectedLine: string;
  confidence: number;
  sourceGameId: string;
  sourceMoves: string[];
  matchedMoves: string[];
  moveCount: number;
}

export interface OpeningMistake {
  sourceGameId: string;
  openingFamily: OpeningFamily;
  openingKey: string;
  openingName: string;
  detectedLine: string;
  positionId: string;
  ply: number;
  theme: OpeningMistakeTheme;
  severity: "low" | "medium" | "high";
  explanation: string;
  conceptMappings: string[];
}

export interface OpeningFamilySummary {
  openingFamily: OpeningFamily;
  openingKey: string;
  openingName: string;
  games: number;
  mistakes: number;
  averageConfidence: number;
  openingTags: string[];
  topThemes: Array<{
    theme: OpeningMistakeTheme;
    count: number;
  }>;
  conceptMappings: string[];
}

export interface OpeningReport {
  generatedAt: string;
  classifications: OpeningClassification[];
  familySummaries: OpeningFamilySummary[];
  topWeaknesses: Array<{
    openingFamily: OpeningFamily;
    openingKey: string;
    openingName: string;
    theme: OpeningMistakeTheme;
    count: number;
    conceptMappings: string[];
  }>;
  recurringMistakes: Array<{
    theme: OpeningMistakeTheme;
    count: number;
    openings: OpeningFamily[];
  }>;
  recommendedTrainingThemes: string[];
}
