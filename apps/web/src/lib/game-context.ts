import { readFile, readdir } from "fs/promises";
import { basename, extname, join } from "path";
import type { ChessColor } from "@chess-os/chess-core";
import { inferHeroColorForGame } from "@chess-os/training";
import { ROOT, OUT } from "./paths";

export interface GameContext {
  gameId: string;
  white: string | null;
  black: string | null;
  result: string | null;
  date: string | null;
  eco: string | null;
  opening: string | null;
  whiteElo: number | null;
  blackElo: number | null;
  heroColor: ChessColor | null;
  rowCount: number | null;
}

interface FullPgnHeaders {
  white?: string;
  black?: string;
  result?: string;
  date?: string;
  eco?: string;
  opening?: string;
  whiteElo?: string;
  blackElo?: string;
}

function parseFullPgnHeaders(raw: string): FullPgnHeaders {
  const headers: FullPgnHeaders = {};
  const pattern = /^\[(\w+)\s+"([^"]*)"\]/gm;
  for (const match of raw.matchAll(pattern)) {
    const [, key, value] = match;
    switch (key) {
      case "White": headers.white = value; break;
      case "Black": headers.black = value; break;
      case "Result": headers.result = value; break;
      case "Date": headers.date = value; break;
      case "UTCDate": if (!headers.date) headers.date = value; break;
      case "ECO": headers.eco = value; break;
      case "Opening": headers.opening = value; break;
      case "WhiteElo": headers.whiteElo = value; break;
      case "BlackElo": headers.blackElo = value; break;
    }
  }
  return headers;
}

function configuredPlayerName(): string | null {
  const fromEnv = process.env.CHESS_OS_PLAYER_NAME?.trim();
  return fromEnv ? fromEnv : null;
}

function formatResult(result: string, heroColor: ChessColor | null): string | null {
  if (result === "1-0") {
    if (heroColor === "white") return "Won";
    if (heroColor === "black") return "Lost";
    return "1-0";
  }
  if (result === "0-1") {
    if (heroColor === "white") return "Lost";
    if (heroColor === "black") return "Won";
    return "0-1";
  }
  if (result === "1/2-1/2") return "Draw";
  return null;
}

function formatPgnDate(dateStr: string): string | null {
  // PGN dates are YYYY.MM.DD
  const parts = dateStr.split(".");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  try {
    const d = new Date(`${year}-${month}-${day}`);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export async function loadGameContext(gameId: string): Promise<GameContext> {
  const ctx: GameContext = {
    gameId,
    white: null,
    black: null,
    result: null,
    date: null,
    eco: null,
    opening: null,
    whiteElo: null,
    blackElo: null,
    heroColor: null,
    rowCount: null,
  };

  // Load PGN headers
  const pgnDir = join(ROOT, "data", "pgn");
  try {
    const entries = await readdir(pgnDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || extname(entry.name).toLowerCase() !== ".pgn") continue;
      const name = basename(entry.name, extname(entry.name));
      if (name !== gameId) continue;

      const raw = await readFile(join(pgnDir, entry.name), "utf-8");
      const headers = parseFullPgnHeaders(raw);

      ctx.white = headers.white ?? null;
      ctx.black = headers.black ?? null;
      ctx.eco = headers.eco ?? null;
      ctx.opening = headers.opening ?? null;
      ctx.whiteElo = headers.whiteElo ? parseInt(headers.whiteElo, 10) : null;
      ctx.blackElo = headers.blackElo ? parseInt(headers.blackElo, 10) : null;

      ctx.heroColor = inferHeroColorForGame({
        gameId,
        headers: { white: headers.white, black: headers.black },
        preferredPlayerName: configuredPlayerName(),
      });

      if (headers.result) {
        ctx.result = formatResult(headers.result, ctx.heroColor);
      }
      if (headers.date) {
        ctx.date = formatPgnDate(headers.date);
      }
      break;
    }
  } catch {
    // PGN directory missing — fall back to gameId-only context
  }

  // Load row count from training dataset
  try {
    const datasetPath = join(OUT, "games", gameId, "training-dataset.json");
    const raw = await readFile(datasetPath, "utf-8");
    const parsed = JSON.parse(raw);
    ctx.rowCount = parsed.rowCount ?? null;
  } catch {
    // Dataset not found
  }

  return ctx;
}
