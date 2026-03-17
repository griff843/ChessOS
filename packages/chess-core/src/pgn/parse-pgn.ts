import { Chess } from "chess.js";

export interface ParsedMove {
  ply: number;
  move: string;
  fen: string;
}

export function parsePgnMoves(pgn: string): ParsedMove[] {
  const chess = new Chess();

  chess.loadPgn(pgn);

  const history = chess.history({ verbose: true });

  const positions: ParsedMove[] = [];

  const replay = new Chess();

  history.forEach((m, index) => {
    replay.move(m);
    positions.push({
      ply: index + 1,
      move: m.san,
      fen: replay.fen()
    });
  });

  return positions;
}