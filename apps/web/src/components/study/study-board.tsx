"use client";

import { Chessboard } from "react-chessboard";
import type { ChessboardOptions } from "react-chessboard";
import { Chess } from "chess.js";
import { useState, useMemo, useCallback } from "react";
import { RotateCcw } from "lucide-react";

interface StudyBoardProps {
  fen: string;
  sideToMove: "white" | "black";
  /** Player's color — sets default board orientation. Falls back to sideToMove. */
  heroColor?: "white" | "black" | null;
  onMove: (move: string) => void;
  disabled?: boolean;
  highlightSquares?: { from?: string; to?: string };
  size?: number;
}

export function StudyBoard({
  fen,
  sideToMove,
  heroColor,
  onMove,
  disabled = false,
  highlightSquares,
  size = 480,
}: StudyBoardProps) {
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);

  const game = useMemo(() => new Chess(fen), [fen]);

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (moveFrom) {
      styles[moveFrom] = { background: "rgba(99, 102, 241, 0.35)" };
      const moves = game.moves({ square: moveFrom as never, verbose: true });
      for (const m of moves) {
        const hasPiece = game.get(m.to as never);
        styles[m.to] = {
          background: hasPiece
            ? "radial-gradient(circle, rgba(99, 102, 241, 0.6) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(99, 102, 241, 0.35) 25%, transparent 25%)",
        };
      }
    }
    if (highlightSquares?.from) {
      styles[highlightSquares.from] = {
        ...styles[highlightSquares.from],
        background: "rgba(251, 191, 36, 0.4)",
      };
    }
    if (highlightSquares?.to) {
      styles[highlightSquares.to] = {
        ...styles[highlightSquares.to],
        background: "rgba(251, 191, 36, 0.4)",
      };
    }
    return styles;
  }, [moveFrom, highlightSquares, game]);

  const handleSquareClick = useCallback(
    ({ square }: { piece: unknown; square: string }) => {
      if (disabled) return;

      if (!moveFrom) {
        const piece = game.get(square as never);
        if (piece && piece.color === (sideToMove === "white" ? "w" : "b")) {
          setMoveFrom(square);
        }
        return;
      }

      const moveStr = moveFrom + square;
      setMoveFrom(null);

      // Check for promotion
      const piece = game.get(moveFrom as never);
      if (
        piece &&
        piece.type === "p" &&
        ((piece.color === "w" && square[1] === "8") ||
          (piece.color === "b" && square[1] === "1"))
      ) {
        onMove(moveStr + "q");
        return;
      }

      onMove(moveStr);
    },
    [disabled, moveFrom, game, sideToMove, onMove]
  );

  const handlePieceDrop = useCallback(
    ({
      piece,
      sourceSquare,
      targetSquare,
    }: {
      piece: { pieceType: string };
      sourceSquare: string;
      targetSquare: string;
    }): boolean => {
      if (disabled) return false;
      const moveStr = sourceSquare + targetSquare;

      // Check promotion
      const pType = piece.pieceType;
      const isWhitePawn = pType === "wP" || pType === "P";
      const isBlackPawn = pType === "bP" || pType === "p";
      if (
        (isWhitePawn && targetSquare[1] === "8") ||
        (isBlackPawn && targetSquare[1] === "1")
      ) {
        onMove(moveStr + "q");
        return true;
      }

      onMove(moveStr);
      return true;
    },
    [disabled, onMove]
  );

  const defaultOrientation = heroColor ?? sideToMove;
  const options: ChessboardOptions = {
    position: fen,
    boardOrientation: flipped ? (defaultOrientation === "white" ? "black" : "white") : defaultOrientation,
    animationDurationInMs: 200,
    allowDragging: !disabled,
    boardStyle: {
      borderRadius: "8px",
      overflow: "hidden",
    },
    darkSquareStyle: { backgroundColor: "#4a4a5e" },
    lightSquareStyle: { backgroundColor: "#7a7a8e" },
    squareStyles,
    onSquareClick: handleSquareClick,
    onPieceDrop: handlePieceDrop as never,
  };

  return (
    <div>
      <div className="rounded-xl border border-border bg-surface-elevated p-3" style={{ width: size + 24 }}>
        <Chessboard options={options} />
      </div>
      <div className="mt-2 flex justify-center">
        <button
          onClick={() => setFlipped((f) => !f)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
          title="Flip board"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Flip
        </button>
      </div>
    </div>
  );
}
