/**
 * Heuristic tactical pattern detection.
 *
 * Analyzes a position + best move to identify tactical motifs.
 * Uses chess.js to apply the move and inspect the resulting position.
 *
 * Returns ["unclassified"] when no specific pattern is detected.
 */

import { Chess, type Square } from "chess.js";
import type { TacticalPattern } from "./types";

// Piece values for assessing targets
const PIECE_VALUE: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 99,
};

/** Cast a string to chess.js Square type */
const sq = (s: string) => s as Square;

/**
 * Get all squares attacked by a piece on a given square.
 *
 * Works by temporarily flipping the side to move so chess.js
 * generates moves for our piece, then filtering for the target squares.
 */
function getAttackedSquares(fen: string, square: string): string[] {
  // Flip the active color in the FEN so we can query our own pieces
  const parts = fen.split(" ");
  parts[1] = parts[1] === "w" ? "b" : "w";
  // Remove en passant to avoid false attacks
  parts[3] = "-";
  const flippedFen = parts.join(" ");

  try {
    const chess = new Chess(flippedFen);
    const moves = chess.moves({ square: sq(square), verbose: true });
    return moves.map((m: any) => m.to);
  } catch {
    return [];
  }
}

/**
 * Get opponent pieces on the board as { square, type, color }.
 */
function getOpponentPieces(
  chess: Chess,
  opponentColor: "w" | "b"
): Array<{ square: string; type: string; color: string }> {
  const pieces: Array<{ square: string; type: string; color: string }> = [];
  const board = chess.board();
  const files = "abcdefgh";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = board[row][col];
      if (cell && cell.color === opponentColor) {
        const square = files[col] + (8 - row);
        pieces.push({ square, type: cell.type, color: cell.color });
      }
    }
  }
  return pieces;
}

/**
 * Detect if the best move creates a fork.
 *
 * A fork occurs when the moved piece attacks 2+ opponent pieces
 * each worth at least a pawn.
 */
function detectFork(
  afterFen: string,
  toSquare: string,
  opponentColor: "w" | "b"
): boolean {
  const attacked = getAttackedSquares(afterFen, toSquare);

  try {
    const chess = new Chess(afterFen);
    const opponentPieces = getOpponentPieces(chess, opponentColor);
    const attackedPieces = opponentPieces.filter(
      (p) => attacked.includes(p.square) && PIECE_VALUE[p.type] >= 1
    );
    return attackedPieces.length >= 2;
  } catch {
    return false;
  }
}

/**
 * Detect a back-rank pattern.
 *
 * Checks if a rook or queen move targets the opponent's back rank
 * while the opponent king is on that rank with pawns blocking escape.
 */
function detectBackRank(
  afterFen: string,
  toSquare: string,
  movedPiece: string,
  opponentColor: "w" | "b"
): boolean {
  if (movedPiece !== "r" && movedPiece !== "q") return false;

  const backRank = opponentColor === "w" ? "1" : "8";
  const pawnRank = opponentColor === "w" ? "2" : "7";

  try {
    const chess = new Chess(afterFen);
    // Find opponent king
    const opponentPieces = getOpponentPieces(chess, opponentColor);
    const king = opponentPieces.find((p) => p.type === "k");
    if (!king || !king.square.endsWith(backRank)) return false;

    // Check if our piece attacks the back rank
    const attacked = getAttackedSquares(afterFen, toSquare);
    const attacksBackRank = attacked.some((sq) => sq.endsWith(backRank));
    if (!attacksBackRank) return false;

    // Check if pawns block king escape
    const kingFile = king.square[0];
    const fileIdx = "abcdefgh".indexOf(kingFile);
    const adjacentFiles = [fileIdx - 1, fileIdx, fileIdx + 1].filter(
      (i) => i >= 0 && i < 8
    );

    let blockedCount = 0;
    for (const fi of adjacentFiles) {
      const pawnSquare = "abcdefgh"[fi] + pawnRank;
      const piece = chess.get(sq(pawnSquare));
      if (piece && piece.color === opponentColor && piece.type === "p") {
        blockedCount++;
      }
    }

    return blockedCount >= 2;
  } catch {
    return false;
  }
}

/**
 * Detect a king attack pattern.
 *
 * Counts our pieces that attack squares adjacent to the opponent king.
 * Pattern detected when 2+ of our pieces attack the king zone.
 */
function detectKingAttack(
  afterFen: string,
  ourColor: "w" | "b",
  opponentColor: "w" | "b"
): boolean {
  try {
    const chess = new Chess(afterFen);

    // Find opponent king
    const opponentPieces = getOpponentPieces(chess, opponentColor);
    const king = opponentPieces.find((p) => p.type === "k");
    if (!king) return false;

    // Build king zone (adjacent squares + king square)
    const kf = "abcdefgh".indexOf(king.square[0]);
    const kr = parseInt(king.square[1], 10);
    const kingZone: string[] = [];
    for (let df = -1; df <= 1; df++) {
      for (let dr = -1; dr <= 1; dr++) {
        const f = kf + df;
        const r = kr + dr;
        if (f >= 0 && f < 8 && r >= 1 && r <= 8) {
          kingZone.push("abcdefgh"[f] + r);
        }
      }
    }

    // Count our pieces that attack the king zone
    const board = chess.board();
    const files = "abcdefgh";
    let attackerCount = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const cell = board[row][col];
        if (cell && cell.color === ourColor && cell.type !== "k") {
          const sq = files[col] + (8 - row);
          const attacks = getAttackedSquares(afterFen, sq);
          if (attacks.some((a) => kingZone.includes(a))) {
            attackerCount++;
          }
        }
      }
    }

    return attackerCount >= 2;
  } catch {
    return false;
  }
}

/**
 * Detect a pin pattern.
 *
 * Simplified: after the move, check if an opponent piece is aligned
 * on a ray between one of our sliding pieces and the opponent king.
 */
function detectPin(
  afterFen: string,
  ourColor: "w" | "b",
  opponentColor: "w" | "b"
): boolean {
  try {
    const chess = new Chess(afterFen);
    const opponentPieces = getOpponentPieces(chess, opponentColor);
    const king = opponentPieces.find((p) => p.type === "k");
    if (!king) return false;

    const board = chess.board();
    const files = "abcdefgh";
    const kf = "abcdefgh".indexOf(king.square[0]);
    const kr = parseInt(king.square[1], 10);

    // Check each of our sliding pieces (bishop, rook, queen)
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const cell = board[row][col];
        if (!cell || cell.color !== ourColor) continue;
        if (cell.type !== "b" && cell.type !== "r" && cell.type !== "q")
          continue;

        const pf = col;
        const pr = 8 - row;
        const df = Math.sign(kf - pf);
        const dr = Math.sign(kr - pr);

        // Must be on a valid ray (diagonal or straight)
        if (df === 0 && dr === 0) continue;
        if (
          Math.abs(kf - pf) !== Math.abs(kr - pr) &&
          kf !== pf &&
          kr !== pr
        )
          continue;

        // Verify piece type matches ray direction
        const isDiagonal = Math.abs(df) === 1 && Math.abs(dr) === 1;
        const isStraight = df === 0 || dr === 0;
        if (isDiagonal && cell.type === "r") continue;
        if (isStraight && cell.type === "b") continue;

        // Walk along ray from our piece toward king, look for exactly one opponent piece
        let cf = pf + df;
        let cr = pr + dr;
        let opponentOnRay: string | null = null;
        let blocked = false;

        while (cf !== kf || cr !== kr) {
          if (cf < 0 || cf >= 8 || cr < 1 || cr > 9) {
            blocked = true;
            break;
          }
          const raySq = files[cf] + cr;
          const piece = chess.get(sq(raySq));
          if (piece) {
            if (piece.color === ourColor) {
              blocked = true;
              break;
            }
            if (opponentOnRay) {
              blocked = true; // Two pieces in between
              break;
            }
            opponentOnRay = raySq;
          }
          cf += df;
          cr += dr;
        }

        if (!blocked && opponentOnRay) {
          // There's exactly one opponent piece between our slider and their king
          const pinnedPiece = chess.get(sq(opponentOnRay));
          if (pinnedPiece && pinnedPiece.type !== "p") {
            return true; // Pin on a non-pawn piece
          }
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Detect a skewer pattern.
 *
 * After the move, check if our sliding piece attacks through a
 * high-value opponent piece to a lower-value piece behind it.
 */
function detectSkewer(
  afterFen: string,
  toSquare: string,
  movedPiece: string,
  opponentColor: "w" | "b"
): boolean {
  if (movedPiece !== "b" && movedPiece !== "r" && movedPiece !== "q")
    return false;

  try {
    const chess = new Chess(afterFen);
    const pf = "abcdefgh".indexOf(toSquare[0]);
    const pr = parseInt(toSquare[1], 10);

    // Check all ray directions
    const directions = movedPiece === "b"
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      : movedPiece === "r"
      ? [[-1, 0], [1, 0], [0, -1], [0, 1]]
      : [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [df, dr] of directions) {
      let cf = pf + df;
      let cr = pr + dr;
      let firstPiece: { type: string; value: number } | null = null;

      while (cf >= 0 && cf < 8 && cr >= 1 && cr <= 8) {
        const skewerSq = "abcdefgh"[cf] + cr;
        const piece = chess.get(sq(skewerSq));

        if (piece) {
          if (piece.color !== opponentColor) break;

          if (!firstPiece) {
            firstPiece = { type: piece.type, value: PIECE_VALUE[piece.type] };
          } else {
            // Second piece found on the ray
            const secondValue = PIECE_VALUE[piece.type];
            if (firstPiece.value > secondValue && firstPiece.value >= 3) {
              return true; // High-value piece in front, lower behind
            }
            break;
          }
        }

        cf += df;
        cr += dr;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Detect tactical patterns in a position given the best move.
 *
 * @param fen          Position FEN before the best move
 * @param bestMoveUci  Engine's best move in UCI notation
 * @param phase        Game phase (for endgame_technique detection)
 * @returns Array of detected patterns, or ["unclassified"] if none found
 */
export function detectTacticalPatterns(
  fen: string,
  bestMoveUci: string,
  phase?: string
): TacticalPattern[] {
  if (!bestMoveUci || bestMoveUci.length < 4 || bestMoveUci === "0000") {
    return ["unclassified"];
  }

  const from = bestMoveUci.slice(0, 2);
  const to = bestMoveUci.slice(2, 4);
  const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;

  let afterFen: string;
  let movedPiece: string;
  let ourColor: "w" | "b";
  let opponentColor: "w" | "b";

  try {
    const chess = new Chess(fen);
    const piece = chess.get(sq(from));
    if (!piece) return ["unclassified"];

    movedPiece = piece.type;
    ourColor = piece.color;
    opponentColor = ourColor === "w" ? "b" : "w";

    const result = chess.move({ from, to, promotion });
    if (!result) return ["unclassified"];

    afterFen = chess.fen();
  } catch {
    return ["unclassified"];
  }

  const patterns: TacticalPattern[] = [];

  // Endgame technique — trivial phase check
  if (phase === "endgame") {
    patterns.push("endgame_technique");
  }

  // Fork detection
  if (detectFork(afterFen, to, opponentColor)) {
    patterns.push("fork");
  }

  // Back rank detection
  if (detectBackRank(afterFen, to, movedPiece, opponentColor)) {
    patterns.push("back_rank");
  }

  // King attack detection
  if (detectKingAttack(afterFen, ourColor, opponentColor)) {
    patterns.push("king_attack");
  }

  // Pin detection
  if (detectPin(afterFen, ourColor, opponentColor)) {
    patterns.push("pin");
  }

  // Skewer detection
  if (detectSkewer(afterFen, to, movedPiece, opponentColor)) {
    patterns.push("skewer");
  }

  return patterns.length > 0 ? patterns : ["unclassified"];
}
