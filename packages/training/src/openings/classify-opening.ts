import type { OpeningClassification, OpeningFamily, OpeningMistakeTheme } from "./types";

interface OpeningLine {
  openingKey: string;
  openingName: string;
  openingFamily: OpeningFamily;
  canonicalMoves: string[];
  openingTags: string[];
  conceptMappings: string[];
  mistakeCategories: OpeningMistakeTheme[];
}

const OPENING_LINES: OpeningLine[] = [
  {
    openingKey: "scotch_game_mainline",
    openingName: "Scotch Game",
    openingFamily: "scotch_game",
    canonicalMoves: ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Nxd4"],
    openingTags: ["open-game", "central-break", "initiative"],
    conceptMappings: ["opening_development", "center_control", "initiative", "calculation_stability"],
    mistakeCategories: ["poor_development", "early_tactical_concession", "theory_deviation"],
  },
  {
    openingKey: "scotch_gambit_mainline",
    openingName: "Scotch Gambit",
    openingFamily: "scotch_gambit",
    canonicalMoves: ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Bc4"],
    openingTags: ["gambit", "initiative", "anti-prep"],
    conceptMappings: ["initiative", "king_attack", "piece_activity", "calculation_stability"],
    mistakeCategories: ["early_tactical_concession", "poor_development", "theory_deviation"],
  },
  {
    openingKey: "italian_game_giuoco_piano",
    openingName: "Italian Game",
    openingFamily: "italian_game",
    canonicalMoves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"],
    openingTags: ["open-game", "development", "king-side-pressure"],
    conceptMappings: ["opening_development", "piece_activity", "king_safety"],
    mistakeCategories: ["poor_development", "king_safety_neglect", "early_tactical_concession"],
  },
  {
    openingKey: "ruy_lopez_mainline",
    openingName: "Ruy Lopez",
    openingFamily: "ruy_lopez",
    canonicalMoves: ["e4", "e5", "Nf3", "Nc6", "Bb5"],
    openingTags: ["open-game", "pressure", "development"],
    conceptMappings: ["opening_development", "center_control", "piece_activity"],
    mistakeCategories: ["poor_development", "center_control_loss", "theory_deviation"],
  },
  {
    openingKey: "sicilian_defense_open",
    openingName: "Sicilian Defense",
    openingFamily: "sicilian_defense",
    canonicalMoves: ["e4", "c5"],
    openingTags: ["imbalanced", "counterattack", "asymmetry"],
    conceptMappings: ["center_control", "initiative", "tactical_awareness"],
    mistakeCategories: ["center_control_loss", "early_tactical_concession", "premature_queen_activity"],
  },
  {
    openingKey: "french_defense_mainline",
    openingName: "French Defense",
    openingFamily: "french_defense",
    canonicalMoves: ["e4", "e6"],
    openingTags: ["closed-center", "structure", "counterplay"],
    conceptMappings: ["pawn_structure", "center_control", "piece_activity"],
    mistakeCategories: ["center_control_loss", "structural_concession", "poor_development"],
  },
  {
    openingKey: "caro_kann_mainline",
    openingName: "Caro-Kann Defense",
    openingFamily: "caro_kann",
    canonicalMoves: ["e4", "c6"],
    openingTags: ["solid", "structure", "development"],
    conceptMappings: ["pawn_structure", "opening_development", "center_control"],
    mistakeCategories: ["poor_development", "structural_concession", "theory_deviation"],
  },
  {
    openingKey: "albin_countergambit_mainline",
    openingName: "Albin Countergambit",
    openingFamily: "albin_countergambit",
    canonicalMoves: ["d4", "d5", "c4", "e5"],
    openingTags: ["countergambit", "initiative", "center-strike"],
    conceptMappings: ["initiative", "center_control", "calculation_stability"],
    mistakeCategories: ["early_tactical_concession", "theory_deviation", "poor_development"],
  },
  {
    openingKey: "queens_gambit_mainline",
    openingName: "Queen's Gambit",
    openingFamily: "queens_gambit",
    canonicalMoves: ["d4", "d5", "c4"],
    openingTags: ["queen-pawn", "center", "structure"],
    conceptMappings: ["center_control", "pawn_structure", "piece_activity"],
    mistakeCategories: ["center_control_loss", "structural_concession", "poor_development"],
  },
  {
    openingKey: "jobava_london_mainline",
    openingName: "Jobava London",
    openingFamily: "jobava_london",
    canonicalMoves: ["d4", "d5", "Nc3", "Nf6", "Bf4"],
    openingTags: ["system", "attacking", "anti-prep"],
    conceptMappings: ["opening_development", "piece_activity", "initiative", "king_safety"],
    mistakeCategories: ["poor_development", "premature_queen_activity", "repeated_opening_drift"],
  },
  {
    openingKey: "london_system_mainline",
    openingName: "London System",
    openingFamily: "london_system",
    canonicalMoves: ["d4", "d5", "Bf4"],
    openingTags: ["system", "solid", "development"],
    conceptMappings: ["opening_development", "king_safety", "piece_activity"],
    mistakeCategories: ["poor_development", "premature_queen_activity", "repeated_opening_drift"],
  },
  {
    openingKey: "kings_indian_mainline",
    openingName: "King's Indian Defense",
    openingFamily: "kings_indian",
    canonicalMoves: ["d4", "Nf6", "c4", "g6"],
    openingTags: ["hypermodern", "king-side-fianchetto", "counterattack"],
    conceptMappings: ["king_safety", "center_control", "initiative"],
    mistakeCategories: ["king_safety_neglect", "center_control_loss", "early_tactical_concession"],
  },
  {
    openingKey: "scandinavian_mainline",
    openingName: "Scandinavian Defense",
    openingFamily: "scandinavian",
    canonicalMoves: ["e4", "d5"],
    openingTags: ["direct-counter", "queen-development", "initiative"],
    conceptMappings: ["center_control", "initiative", "opening_development"],
    mistakeCategories: ["premature_queen_activity", "poor_development", "theory_deviation"],
  },
  {
    openingKey: "reverse_sicilian_mainline",
    openingName: "Reverse Sicilian",
    openingFamily: "reverse_sicilian",
    canonicalMoves: ["c4", "e5"],
    openingTags: ["counterattack", "symmetry-break", "initiative"],
    conceptMappings: ["center_control", "initiative", "piece_activity"],
    mistakeCategories: ["center_control_loss", "poor_development", "theory_deviation"],
  },
  {
    openingKey: "english_opening_mainline",
    openingName: "English Opening",
    openingFamily: "english_opening",
    canonicalMoves: ["c4"],
    openingTags: ["flank-opening", "flexibility", "structure"],
    conceptMappings: ["center_control", "pawn_structure", "piece_activity"],
    mistakeCategories: ["center_control_loss", "poor_development", "repeated_opening_drift"],
  },
  {
    openingKey: "vienna_game_mainline",
    openingName: "Vienna Game",
    openingFamily: "vienna_game",
    canonicalMoves: ["e4", "e5", "Nc3"],
    openingTags: ["open-game", "flexibility", "initiative"],
    conceptMappings: ["opening_development", "initiative", "tactical_awareness"],
    mistakeCategories: ["poor_development", "early_tactical_concession", "theory_deviation"],
  },
  {
    openingKey: "pirc_modern_mainline",
    openingName: "Pirc/Modern",
    openingFamily: "pirc_modern",
    canonicalMoves: ["e4", "d6"],
    openingTags: ["hypermodern", "fianchetto", "counterattack"],
    conceptMappings: ["center_control", "king_safety", "piece_activity"],
    mistakeCategories: ["center_control_loss", "king_safety_neglect", "poor_development"],
  },
];

function normalizeSan(move: string): string {
  return move.replace(/[+#?!]+/g, "").trim();
}

function matchScore(moves: string[], canonicalMoves: string[]): number {
  let matched = 0;
  for (let index = 0; index < canonicalMoves.length; index += 1) {
    if (moves[index] !== canonicalMoves[index]) break;
    matched += 1;
  }
  return matched;
}

export function classifyOpening(gameId: string, moves: string[]): OpeningClassification {
  const sourceMoves = moves.map(normalizeSan);
  let best: OpeningLine | null = null;
  let bestScore = 0;

  for (const line of OPENING_LINES) {
    const score = matchScore(sourceMoves, line.canonicalMoves);
    if (score > bestScore || (score === bestScore && best && line.canonicalMoves.length > best.canonicalMoves.length)) {
      best = line;
      bestScore = score;
    }
  }

  if (!best || bestScore === 0) {
    return {
      openingKey: "misc_unknown_opening_mainline",
      openingName: "Misc / Unknown Opening",
      openingFamily: "misc_unknown_opening",
      canonicalMoves: [],
      openingTags: ["unknown"],
      conceptMappings: ["opening_development", "center_control"],
      mistakeCategories: ["poor_development", "repeated_opening_drift"],
      detectedLine: "misc_unknown_opening_mainline",
      confidence: 0,
      sourceGameId: gameId,
      sourceMoves,
      matchedMoves: [],
      moveCount: sourceMoves.length,
    };
  }

  return {
    openingKey: best.openingKey,
    openingName: best.openingName,
    openingFamily: best.openingFamily,
    canonicalMoves: [...best.canonicalMoves],
    openingTags: [...best.openingTags],
    conceptMappings: [...best.conceptMappings],
    mistakeCategories: [...best.mistakeCategories],
    detectedLine: best.openingKey,
    confidence: Number((bestScore / Math.max(best.canonicalMoves.length, 1)).toFixed(4)),
    sourceGameId: gameId,
    sourceMoves,
    matchedMoves: best.canonicalMoves.slice(0, bestScore),
    moveCount: sourceMoves.length,
  };
}
