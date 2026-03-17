"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Chessboard } from "react-chessboard";
import type { ChessboardOptions } from "react-chessboard";
import { PiecePalette } from "./piece-palette";
import { Eye, EyeOff, Send, Trash2 } from "lucide-react";

type RecallPhase = "memorize" | "reconstruct" | "submitted";

interface RecallBoardProps {
  fen: string;
  sideToMove: "white" | "black";
  viewingWindowMs: number;
  onSubmit: (
    placedPieces: Array<{ square: string; piece: string }>,
    timeTakenMs: number
  ) => void;
  disabled?: boolean;
  size?: number;
}

/**
 * Convert piece palette ID (e.g. "wK") to FEN position object format.
 * react-chessboard v5 position object uses keys like "wK", "bQ", etc.
 */
function buildPositionObject(
  pieces: Map<string, string>
): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [square, piece] of pieces) {
    obj[square] = piece;
  }
  return obj;
}

export function RecallBoard({
  fen,
  sideToMove,
  viewingWindowMs,
  onSubmit,
  disabled = false,
  size = 480,
}: RecallBoardProps) {
  const [phase, setPhase] = useState<RecallPhase>("memorize");
  const [remainingMs, setRemainingMs] = useState(viewingWindowMs);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [placedPieces, setPlacedPieces] = useState<Map<string, string>>(
    new Map()
  );
  const startTimeRef = useRef<number>(0);

  // Countdown timer for memorize phase
  useEffect(() => {
    if (phase !== "memorize") return;

    const timer = setInterval(() => {
      setRemainingMs((prev) => {
        if (prev <= 100) {
          clearInterval(timer);
          setPhase("reconstruct");
          startTimeRef.current = Date.now();
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [phase]);

  const handleSquareClick = useCallback(
    ({ square }: { piece: unknown; square: string }) => {
      if (phase !== "reconstruct" || disabled) return;

      if (selectedPiece) {
        // Place the selected piece
        setPlacedPieces((prev) => {
          const next = new Map(prev);
          next.set(square, selectedPiece);
          return next;
        });
      } else {
        // Remove piece if clicking on occupied square
        setPlacedPieces((prev) => {
          if (prev.has(square)) {
            const next = new Map(prev);
            next.delete(square);
            return next;
          }
          return prev;
        });
      }
    },
    [phase, disabled, selectedPiece]
  );

  const handleSubmit = useCallback(() => {
    const timeTakenMs = Date.now() - startTimeRef.current;
    const pieces = Array.from(placedPieces.entries()).map(([square, piece]) => ({
      square,
      piece,
    }));
    setPhase("submitted");
    onSubmit(pieces, timeTakenMs);
  }, [placedPieces, onSubmit]);

  const handleClear = useCallback(() => {
    setPlacedPieces(new Map());
  }, []);

  // Progress percentage
  const progress = ((viewingWindowMs - remainingMs) / viewingWindowMs) * 100;

  if (phase === "memorize") {
    const options: ChessboardOptions = {
      position: fen,
      boardOrientation: sideToMove,
      animationDurationInMs: 0,
      allowDragging: false,
      boardStyle: { borderRadius: "8px", overflow: "hidden" },
      darkSquareStyle: { backgroundColor: "#4a4a5e" },
      lightSquareStyle: { backgroundColor: "#7a7a8e" },
    };

    return (
      <div>
        <div
          className="relative rounded-xl border border-border bg-surface-elevated p-3"
          style={{ width: size + 24 }}
        >
          <Chessboard options={options} />
          {/* Timer overlay */}
          <div className="absolute inset-3 flex items-start justify-center">
            <div className="rounded-lg bg-black/70 px-4 py-2 text-center backdrop-blur-sm">
              <Eye className="mx-auto h-4 w-4 text-accent" />
              <p className="mt-1 text-lg font-bold tabular-nums text-white">
                {Math.ceil(remainingMs / 1000)}s
              </p>
              <p className="text-[10px] text-gray-300">Memorize this position</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="absolute bottom-3 left-3 right-3 h-1 overflow-hidden rounded-full bg-gray-600">
            <div
              className="h-full bg-accent transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Reconstruct phase
  const positionObj = buildPositionObject(placedPieces);
  const reconstructOptions: ChessboardOptions = {
    position: positionObj as any,
    boardOrientation: sideToMove,
    animationDurationInMs: 0,
    allowDragging: false,
    boardStyle: { borderRadius: "8px", overflow: "hidden" },
    darkSquareStyle: { backgroundColor: "#4a4a5e" },
    lightSquareStyle: { backgroundColor: "#7a7a8e" },
    onSquareClick: handleSquareClick,
  };

  return (
    <div>
      <div
        className="rounded-xl border border-border bg-surface-elevated p-3"
        style={{ width: size + 24 }}
      >
        <Chessboard options={reconstructOptions} />
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <PiecePalette
          selectedPiece={selectedPiece}
          onSelectPiece={setSelectedPiece}
        />

        <div className="flex gap-2">
          <button
            onClick={handleClear}
            disabled={disabled || phase === "submitted"}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text-muted transition-colors hover:bg-surface-hover disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
          <button
            onClick={handleSubmit}
            disabled={disabled || phase === "submitted" || placedPieces.size === 0}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            Submit ({placedPieces.size} pieces)
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-muted">
          <EyeOff className="h-3.5 w-3.5" />
          Reconstruct the position from memory
        </div>
      </div>
    </div>
  );
}
