"use client";

import { Chessboard } from "react-chessboard";
import type { ChessboardOptions } from "react-chessboard";

interface StaticBoardProps {
  fen: string;
  orientation?: "white" | "black";
  size?: number;
  highlightSquares?: Record<string, React.CSSProperties>;
}

export function StaticBoard({
  fen,
  orientation = "white",
  size = 360,
  highlightSquares,
}: StaticBoardProps) {
  const options: ChessboardOptions = {
    position: fen,
    boardOrientation: orientation,
    animationDurationInMs: 0,
    allowDragging: false,
    boardStyle: {
      borderRadius: "8px",
      overflow: "hidden",
    },
    darkSquareStyle: { backgroundColor: "#4a4a5e" },
    lightSquareStyle: { backgroundColor: "#7a7a8e" },
    squareStyles: highlightSquares,
  };

  return (
    <div
      className="rounded-xl border border-border bg-surface-elevated p-3"
      style={{ width: size + 24 }}
    >
      <Chessboard options={options} />
    </div>
  );
}
