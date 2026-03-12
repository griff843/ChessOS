/**
 * Pure parsing functions for UCI protocol output.
 * No I/O or process dependencies — only string → typed result.
 */

export interface ParsedUciInfo {
  depth: number;
  scoreCp?: number;
  mateIn?: number;
  pv: string[];
}

/**
 * Parse a UCI `info` line into structured data.
 * Returns null if the line is not a parseable info line with depth + score.
 *
 * Example input:
 *   "info depth 20 seldepth 28 multipv 1 score cp 35 nodes 1234 nps 567890 pv e2e4 e7e5 d2d4"
 */
export function parseInfoLine(line: string): ParsedUciInfo | null {
  if (!line.startsWith("info ")) return null;

  const depthMatch = line.match(/\bdepth\s+(\d+)/);
  if (!depthMatch) return null;

  const depth = parseInt(depthMatch[1], 10);

  // Score: either "score cp <N>" or "score mate <N>"
  let scoreCp: number | undefined;
  let mateIn: number | undefined;

  const cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
  const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);

  if (cpMatch) {
    scoreCp = parseInt(cpMatch[1], 10);
  } else if (mateMatch) {
    mateIn = parseInt(mateMatch[1], 10);
  } else {
    return null; // No score info — skip this line
  }

  // PV (principal variation) — everything after " pv "
  const pv: string[] = [];
  const pvIndex = line.indexOf(" pv ");
  if (pvIndex !== -1) {
    const pvStr = line.slice(pvIndex + 4).trim();
    pv.push(...pvStr.split(/\s+/).filter(Boolean));
  }

  return { depth, scoreCp, mateIn, pv };
}

/**
 * Parse a UCI `bestmove` line.
 * Returns the best move string, or null if not a bestmove line.
 *
 * Example input:
 *   "bestmove e2e4 ponder e7e5"
 */
export function parseBestMove(line: string): string | null {
  const match = line.match(/^bestmove\s+(\S+)/);
  return match ? match[1] : null;
}

/**
 * Given all collected UCI output lines from a `go depth` command,
 * extract the final analysis result.
 *
 * Takes the deepest info line and the bestmove line.
 */
export function extractAnalysis(lines: string[]): {
  bestMove: string;
  scoreCp?: number;
  mateIn?: number;
  depth: number;
  pv: string[];
} {
  let deepestInfo: ParsedUciInfo | null = null;
  let bestMove: string | null = null;

  for (const line of lines) {
    const info = parseInfoLine(line);
    if (info && (!deepestInfo || info.depth >= deepestInfo.depth)) {
      deepestInfo = info;
    }

    const bm = parseBestMove(line);
    if (bm) bestMove = bm;
  }

  if (!bestMove) {
    throw new Error("[engine] UCI output contained no bestmove line.");
  }

  return {
    bestMove,
    scoreCp: deepestInfo?.scoreCp,
    mateIn: deepestInfo?.mateIn,
    depth: deepestInfo?.depth ?? 0,
    pv: deepestInfo?.pv ?? [],
  };
}
