"use client";

import { useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import type { ChessboardOptions } from "react-chessboard";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { formatCategory } from "@/lib/utils";

interface ReplayAttempt {
  exerciseId: string;
  fen: string;
  sideToMove: "white" | "black";
  lessonCategory: string;
  difficultyEstimate: string;
  userMove: string;
  bestMove: string;
  coachingExplanation: string;
  gradingTier: string;
}

interface SessionReplayProps {
  attempts: ReplayAttempt[];
}

export function SessionReplay({ attempts }: SessionReplayProps) {
  const [index, setIndex] = useState(0);
  const current = attempts[index];

  const progressLabel = useMemo(
    () => `Attempt ${index + 1} of ${attempts.length}`,
    [index, attempts.length]
  );

  if (!current) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[520px_minmax(0,1fr)]">
      <div>
        <div className="rounded-xl border border-border bg-surface-elevated p-3">
          <Chessboard
            options={{
              position: current.fen,
              boardOrientation: current.sideToMove,
              allowDragging: false,
              animationDurationInMs: 0,
              darkSquareStyle: { backgroundColor: "#4a4a5e" },
              lightSquareStyle: { backgroundColor: "#7a7a8e" },
            } as ChessboardOptions}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndex((value) => Math.max(value - 1, 0))}
            disabled={index === 0}
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-xs text-text-muted">{progressLabel}</span>
          <button
            type="button"
            onClick={() => setIndex((value) => Math.min(value + 1, attempts.length - 1))}
            disabled={index === attempts.length - 1}
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <SectionCard title="Replay Detail" subtitle={progressLabel}>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="accent">{formatCategory(current.lessonCategory)}</Badge>
              <Badge variant="muted">{current.difficultyEstimate}</Badge>
              <Badge variant="warning">{current.gradingTier}</Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-surface px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-text-muted">
                  User move
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-text-primary">
                  {current.userMove}
                </p>
              </div>
              <div className="rounded-lg bg-surface px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-text-muted">
                  Best move
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-success">
                  {current.bestMove}
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Coaching Explanation">
          <p className="text-sm leading-6 text-text-primary">
            {current.coachingExplanation}
          </p>
        </SectionCard>
      </div>
    </div>
  );
}

