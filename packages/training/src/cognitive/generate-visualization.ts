/**
 * Generate visualization exercises from the training corpus.
 *
 * Visualization exercises present a position and move sequence,
 * then ask the user to answer a question about the resulting position
 * without seeing the board.
 *
 * Questions are generated deterministically from the PV (principal variation).
 */

import { Chess, type Square } from "chess.js";
import type { TrainingExercise } from "../exercises/types";
import type {
  CognitiveSessionExercise,
  VisualizationQuestion,
  VisualizationQuestionType,
} from "./types";

const sq = (s: string) => s as Square;

const QUESTION_TYPES: VisualizationQuestionType[] = [
  "final_square",
  "piece_count",
  "check_status",
  "king_location",
  "material_balance",
];

/**
 * Simple deterministic hash of a string to select question type.
 */
function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Apply a sequence of SAN moves to a position and return the resulting Chess.
 * Returns null if any move is invalid.
 */
function applyMoves(fen: string, moves: string[]): Chess | null {
  try {
    const chess = new Chess(fen);
    for (const move of moves) {
      const result = chess.move(move);
      if (!result) return null;
    }
    return chess;
  } catch {
    return null;
  }
}

/**
 * Count pieces of a specific type and color on the board.
 */
function countPiecesOfType(
  chess: Chess,
  color: "w" | "b",
  type: string
): number {
  let count = 0;
  const board = chess.board();
  for (const row of board) {
    for (const cell of row) {
      if (cell && cell.color === color && cell.type === type) count++;
    }
  }
  return count;
}

/**
 * Get total material value for a color.
 */
function materialValue(chess: Chess, color: "w" | "b"): number {
  const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  let total = 0;
  const board = chess.board();
  for (const row of board) {
    for (const cell of row) {
      if (cell && cell.color === color && values[cell.type]) {
        total += values[cell.type];
      }
    }
  }
  return total;
}

/**
 * Find the king's square for a given color.
 */
function findKing(chess: Chess, color: "w" | "b"): string | null {
  const board = chess.board();
  const files = "abcdefgh";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = board[row][col];
      if (cell && cell.color === color && cell.type === "k") {
        return files[col] + (8 - row);
      }
    }
  }
  return null;
}

/**
 * Generate adjacent squares for multiple-choice options.
 */
function adjacentSquares(square: string): string[] {
  const f = "abcdefgh".indexOf(square[0]);
  const r = parseInt(square[1], 10);
  const result: string[] = [];

  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      const nf = f + df;
      const nr = r + dr;
      if (nf >= 0 && nf < 8 && nr >= 1 && nr <= 8) {
        result.push("abcdefgh"[nf] + nr);
      }
    }
  }
  return result;
}

/**
 * Build a visualization question about the position after the move sequence.
 */
export function buildVisualizationQuestion(
  startFen: string,
  moveSequence: string[],
  exerciseId: string
): VisualizationQuestion | null {
  const resultChess = applyMoves(startFen, moveSequence);
  if (!resultChess) return null;

  // Deterministic question type selection
  const questionIdx = hashString(exerciseId) % QUESTION_TYPES.length;
  const questionType = QUESTION_TYPES[questionIdx];

  // Determine colors
  const startTurn = startFen.split(" ")[1] === "w" ? "white" : "black";
  const opponentColor = startTurn === "white" ? "b" : "w";
  const ourColor = startTurn === "white" ? "w" : "b";

  switch (questionType) {
    case "final_square": {
      // What square is the last moved piece on?
      const lastMove = moveSequence[moveSequence.length - 1];
      const tempChess = applyMoves(startFen, moveSequence.slice(0, -1));
      if (!tempChess) return null;
      const moveResult = tempChess.move(lastMove);
      if (!moveResult) return null;

      const correctSquare = moveResult.to;
      const pieceName = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" }[moveResult.piece] ?? "piece";
      const options = [correctSquare, ...adjacentSquares(correctSquare).slice(0, 3)];

      return {
        type: "final_square",
        prompt: `After these moves, what square is the ${pieceName} on?`,
        correctAnswer: correctSquare,
        options,
      };
    }

    case "piece_count": {
      // How many of a piece type remain?
      const pieceTypes = ["n", "b", "r", "q", "p"];
      const selectedType = pieceTypes[hashString(exerciseId + "pc") % pieceTypes.length];
      const count = countPiecesOfType(resultChess, ourColor, selectedType);
      const pieceName = { p: "pawns", n: "knights", b: "bishops", r: "rooks", q: "queens" }[selectedType] ?? "pieces";
      const colorName = ourColor === "w" ? "white" : "black";

      return {
        type: "piece_count",
        prompt: `How many ${colorName} ${pieceName} are on the board?`,
        correctAnswer: String(count),
        options: [String(count), String(Math.max(0, count - 1)), String(count + 1), String(Math.max(0, count - 2))].filter((v, i, a) => a.indexOf(v) === i),
      };
    }

    case "check_status": {
      const inCheck = resultChess.inCheck();
      return {
        type: "check_status",
        prompt: "Is the king in check after these moves?",
        correctAnswer: inCheck ? "yes" : "no",
        options: ["yes", "no"],
      };
    }

    case "king_location": {
      const targetColor = opponentColor;
      const colorName = targetColor === "w" ? "white" : "black";
      const kingSquare = findKing(resultChess, targetColor);
      if (!kingSquare) return null;

      const options = [kingSquare, ...adjacentSquares(kingSquare).slice(0, 3)];
      return {
        type: "king_location",
        prompt: `What square is the ${colorName} king on?`,
        correctAnswer: kingSquare,
        options,
      };
    }

    case "material_balance": {
      const whiteMat = materialValue(resultChess, "w");
      const blackMat = materialValue(resultChess, "b");
      const advantage = ourColor === "w" ? whiteMat - blackMat : blackMat - whiteMat;
      const colorName = ourColor === "w" ? "white" : "black";

      return {
        type: "material_balance",
        prompt: `What is ${colorName}'s material advantage in pawns?`,
        correctAnswer: String(advantage),
        options: [String(advantage), String(advantage + 1), String(advantage - 1), String(advantage + 2)].filter((v, i, a) => a.indexOf(v) === i),
      };
    }
  }
}

/**
 * Generate visualization exercises from the training corpus.
 *
 * @param exercises  Available training exercises
 * @param count      Number of visualization exercises to generate
 * @returns Array of CognitiveSessionExercise with exerciseType "visualization"
 */
export function generateVisualizationExercises(
  exercises: TrainingExercise[],
  count: number
): CognitiveSessionExercise[] {
  if (count <= 0) return [];

  // Filter: need PV with at least 3 moves
  const candidates = exercises.filter(
    (ex) => ex.engineAnswer.pv && ex.engineAnswer.pv.length >= 3
  );

  const result: CognitiveSessionExercise[] = [];

  for (const ex of candidates) {
    if (result.length >= count) break;

    // Extract 2-4 move sub-sequence from PV
    const pvLength = ex.engineAnswer.pv.length;
    const seqLength = Math.min(2 + (hashString(ex.positionId) % 3), pvLength);
    const moveSequence = ex.engineAnswer.pv.slice(0, seqLength);

    const question = buildVisualizationQuestion(
      ex.fen,
      moveSequence,
      ex.positionId
    );
    if (!question) continue;

    result.push({
      exerciseId: ex.positionId,
      exerciseType: "visualization",
      gameId: ex.gameId,
      ply: ex.ply,
      fen: ex.fen,
      sideToMove: ex.sideToMove,
      heroColor: ex.heroColor,
      perspective: ex.perspective,
      phase: ex.phase,
      lessonCategory: ex.explanation.lessonCategory,
      difficultyEstimate: ex.explanation.difficultyEstimate,
      difficultyScore: ex.explanation.difficultyScore,
      targetPriority: ex.targetPriority,
      visualizationData: { moveSequence, question },
    });
  }

  return result;
}
