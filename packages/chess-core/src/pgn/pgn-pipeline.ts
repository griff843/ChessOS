import type { ChessColor, PositionSnapshot } from "../domain/types";
import { parsePgnMoves } from "./parse-pgn";

export interface PgnPipelineResult {
  gameId: string;
  snapshots: PositionSnapshot[];
  totalPlies: number;
}

function sideToMoveFromFen(fen: string): ChessColor {
  const activeColor = fen.split(" ")[1];
  return activeColor === "w" ? "white" : "black";
}

export function pgnToSnapshots(
  pgn: string,
  gameId: string
): PgnPipelineResult {
  const moves = parsePgnMoves(pgn);

  const snapshots: PositionSnapshot[] = moves.map((m) => ({
    id: `${gameId}:${m.ply}`,
    gameId,
    ply: m.ply,
    fen: m.fen,
    sideToMove: sideToMoveFromFen(m.fen),
    playedMove: m.move,
  }));

  return {
    gameId,
    snapshots,
    totalPlies: moves.length,
  };
}
