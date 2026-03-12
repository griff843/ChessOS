/**
 * Grade a recall exercise attempt.
 *
 * Compares the user's reconstructed piece placements against the
 * original position piece-by-piece.
 *
 * Grading tiers:
 *   exact:       100% accuracy
 *   acceptable:  >= 90% accuracy
 *   inaccuracy:  >= 70% accuracy
 *   mistake:     >= 50% accuracy
 *   blunder:     < 50% accuracy
 */

import type { GradingTier } from "../grading/eval-loss-bands";
import type { RecallGradeInput, RecallGradeResult } from "./types";

/**
 * Parse a FEN string into a map of square → piece.
 *
 * Piece format: color + type (e.g., "wK", "bq", "wp").
 */
export function fenToPieceMap(fen: string): Map<string, string> {
  const map = new Map<string, string>();
  const boardPart = fen.split(" ")[0];
  const ranks = boardPart.split("/");

  for (let rankIdx = 0; rankIdx < ranks.length; rankIdx++) {
    let fileIdx = 0;
    for (const ch of ranks[rankIdx]) {
      if (/\d/.test(ch)) {
        fileIdx += parseInt(ch, 10);
      } else {
        const color = ch === ch.toUpperCase() ? "w" : "b";
        const type = ch.toLowerCase();
        const square = "abcdefgh"[fileIdx] + (8 - rankIdx);
        map.set(square, color + type);
        fileIdx++;
      }
    }
  }

  return map;
}

/**
 * Grade a recall attempt by comparing reconstructed pieces to the original.
 */
export function gradeRecall(input: RecallGradeInput): RecallGradeResult {
  const originalPieces = fenToPieceMap(input.originalFen);
  const totalPieces = originalPieces.size;

  // Build user placement map
  const userPieces = new Map<string, string>();
  for (const { square, piece } of input.reconstructedPieces) {
    userPieces.set(square, piece);
  }

  let correctPieces = 0;
  let incorrectPieces = 0;
  let missingPieces = 0;
  let extraPieces = 0;

  // Check each original piece
  for (const [square, piece] of originalPieces) {
    const userPiece = userPieces.get(square);
    if (!userPiece) {
      missingPieces++;
    } else if (userPiece === piece) {
      correctPieces++;
    } else {
      incorrectPieces++;
    }
  }

  // Check for extra pieces placed by user that aren't in the original
  for (const [square] of userPieces) {
    if (!originalPieces.has(square)) {
      extraPieces++;
    }
  }

  const accuracy = totalPieces > 0 ? correctPieces / totalPieces : 0;

  let gradingTier: GradingTier;
  if (accuracy >= 1.0) {
    gradingTier = "exact";
  } else if (accuracy >= 0.9) {
    gradingTier = "acceptable";
  } else if (accuracy >= 0.7) {
    gradingTier = "inaccuracy";
  } else if (accuracy >= 0.5) {
    gradingTier = "mistake";
  } else {
    gradingTier = "blunder";
  }

  return {
    totalPieces,
    correctPieces,
    incorrectPieces,
    missingPieces,
    extraPieces,
    accuracy,
    gradingTier,
    isCorrect: accuracy >= 0.9,
  };
}
