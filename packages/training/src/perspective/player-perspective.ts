import type { ChessColor } from "@chess-os/chess-core";

export type ExercisePerspective = "hero" | "opponent" | "unknown";
export type SessionPerspective = "hero" | "opponent" | "both";

export interface PgnHeaders {
  white?: string;
  black?: string;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

export function parsePgnHeaders(raw: string): PgnHeaders {
  const headers: PgnHeaders = {};
  const pattern = /^\[(\w+)\s+"([^"]*)"\]/gm;
  for (const match of raw.matchAll(pattern)) {
    const [, key, value] = match;
    if (key === "White") headers.white = value;
    if (key === "Black") headers.black = value;
  }
  return headers;
}

export function inferHeroNameFromGameId(gameId: string): string | null {
  const lowered = gameId.toLowerCase();
  for (const separator of ["_vs_", "-vs-", " vs "]) {
    const index = lowered.indexOf(separator);
    if (index > 0) {
      return gameId.slice(0, index);
    }
  }
  return null;
}

export function inferHeroColorForGame(args: {
  gameId: string;
  headers: PgnHeaders;
  preferredPlayerName?: string | null;
}): ChessColor | null {
  const preferredName = args.preferredPlayerName?.trim() || inferHeroNameFromGameId(args.gameId);
  if (!preferredName) return null;

  const preferred = normalizeName(preferredName);
  if (args.headers.white && normalizeName(args.headers.white) === preferred) return "white";
  if (args.headers.black && normalizeName(args.headers.black) === preferred) return "black";
  return null;
}

export function deriveExercisePerspective(args: {
  mover: ChessColor;
  heroColor: ChessColor | null;
}): ExercisePerspective {
  if (!args.heroColor) return "unknown";
  return args.mover === args.heroColor ? "hero" : "opponent";
}
