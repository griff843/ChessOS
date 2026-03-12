import type { OpeningClassification } from "./types";

interface OpeningLine {
  openingFamily: string;
  openingName: string;
  lineKey: string;
  sanPrefix: string[];
}

const OPENING_LINES: OpeningLine[] = [
  {
    openingFamily: "italian_game",
    openingName: "Italian Game",
    lineKey: "italian_game_giuoco_piano",
    sanPrefix: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"],
  },
  {
    openingFamily: "ruy_lopez",
    openingName: "Ruy Lopez",
    lineKey: "ruy_lopez_mainline",
    sanPrefix: ["e4", "e5", "Nf3", "Nc6", "Bb5"],
  },
  {
    openingFamily: "sicilian_defense",
    openingName: "Sicilian Defense",
    lineKey: "sicilian_defense_open",
    sanPrefix: ["e4", "c5"],
  },
  {
    openingFamily: "french_defense",
    openingName: "French Defense",
    lineKey: "french_defense_mainline",
    sanPrefix: ["e4", "e6"],
  },
  {
    openingFamily: "caro_kann",
    openingName: "Caro-Kann Defense",
    lineKey: "caro_kann_mainline",
    sanPrefix: ["e4", "c6"],
  },
  {
    openingFamily: "queens_gambit",
    openingName: "Queen's Gambit",
    lineKey: "queens_gambit_declined_or_accepted",
    sanPrefix: ["d4", "d5", "c4"],
  },
  {
    openingFamily: "kings_indian",
    openingName: "King's Indian Defense",
    lineKey: "kings_indian_mainline",
    sanPrefix: ["d4", "Nf6", "c4", "g6"],
  },
  {
    openingFamily: "english_opening",
    openingName: "English Opening",
    lineKey: "english_opening_mainline",
    sanPrefix: ["c4"],
  },
];

function normalizeSan(move: string): string {
  return move.replace(/[+#?!]+/g, "").trim();
}

export function classifyOpening(gameId: string, moves: string[]): OpeningClassification {
  const normalized = moves.map(normalizeSan);
  let best = OPENING_LINES[OPENING_LINES.length - 1];
  let bestScore = 0;

  for (const line of OPENING_LINES) {
    const prefix = line.sanPrefix;
    const score = prefix.reduce((count, move, index) => count + (normalized[index] === move ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = line;
    }
  }

  return {
    gameId,
    openingFamily: best.openingFamily,
    openingName: best.openingName,
    lineKey: best.lineKey,
    matchedMoves: best.sanPrefix.slice(0, bestScore),
    moveCount: normalized.length,
  };
}
