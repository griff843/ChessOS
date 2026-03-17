import { readFile, readdir } from "fs/promises";
import { basename, extname, join } from "path";
import type { ChessColor } from "@chess-os/chess-core";
import type { ExercisePerspective, SessionPerspective } from "@chess-os/training";
import {
  inferHeroColorForGame,
  parsePgnHeaders,
} from "@chess-os/training";
import { ROOT } from "./paths";

function configuredPlayerName(): string | null {
  const fromEnv = process.env.CHESS_OS_PLAYER_NAME?.trim();
  return fromEnv ? fromEnv : null;
}

export async function loadHeroColorByGameId(): Promise<Map<string, ChessColor | null>> {
  const pgnDir = join(ROOT, "data", "pgn");
  const map = new Map<string, ChessColor | null>();

  try {
    const entries = await readdir(pgnDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || extname(entry.name).toLowerCase() !== ".pgn") continue;
      const gameId = basename(entry.name, extname(entry.name));
      const raw = await readFile(join(pgnDir, entry.name), "utf-8");
      map.set(
        gameId,
        inferHeroColorForGame({
          gameId,
          headers: parsePgnHeaders(raw),
          preferredPlayerName: configuredPlayerName(),
        })
      );
    }
  } catch {
    // Ignore missing PGN directory; callers fall back to unknown.
  }

  return map;
}

export type { ExercisePerspective, SessionPerspective };
export { inferHeroColorForGame, parsePgnHeaders };
