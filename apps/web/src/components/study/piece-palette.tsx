"use client";

import { cn } from "@/lib/utils";

interface PiecePaletteProps {
  selectedPiece: string | null;
  onSelectPiece: (piece: string | null) => void;
}

const PIECES = [
  { id: "wK", label: "\u2654", color: "white" },
  { id: "wQ", label: "\u2655", color: "white" },
  { id: "wR", label: "\u2656", color: "white" },
  { id: "wB", label: "\u2657", color: "white" },
  { id: "wN", label: "\u2658", color: "white" },
  { id: "wP", label: "\u2659", color: "white" },
  { id: "bK", label: "\u265A", color: "black" },
  { id: "bQ", label: "\u265B", color: "black" },
  { id: "bR", label: "\u265C", color: "black" },
  { id: "bB", label: "\u265D", color: "black" },
  { id: "bN", label: "\u265E", color: "black" },
  { id: "bP", label: "\u265F", color: "black" },
];

export function PiecePalette({ selectedPiece, onSelectPiece }: PiecePaletteProps) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-3">
      <p className="mb-2 text-[10px] uppercase tracking-wider text-text-muted">
        Select a piece
      </p>
      <div className="grid grid-cols-6 gap-1">
        {PIECES.map((piece) => (
          <button
            key={piece.id}
            onClick={() =>
              onSelectPiece(selectedPiece === piece.id ? null : piece.id)
            }
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg text-2xl transition-all",
              selectedPiece === piece.id
                ? "border-2 border-accent bg-accent/10 shadow-sm"
                : "border border-border bg-surface hover:bg-surface-hover"
            )}
            title={piece.id}
          >
            {piece.label}
          </button>
        ))}
      </div>
      {selectedPiece && (
        <button
          onClick={() => onSelectPiece(null)}
          className="mt-2 w-full rounded-lg bg-surface px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          Clear selection (click to erase)
        </button>
      )}
    </div>
  );
}
