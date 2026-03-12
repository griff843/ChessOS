"use client";

import { useState, useCallback, useRef } from "react";
import { Chessboard } from "react-chessboard";
import type { ChessboardOptions } from "react-chessboard";
import { Brain, Eye, EyeOff, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type VizPhase = "study" | "answer" | "submitted";

interface VisualizationViewProps {
  fen: string;
  sideToMove: "white" | "black";
  moveSequence: string[];
  question: {
    type: string;
    prompt: string;
    correctAnswer: string;
    options?: string[];
  };
  onSubmit: (answer: string, timeTakenMs: number) => void;
  disabled?: boolean;
  size?: number;
}

export function VisualizationView({
  fen,
  sideToMove,
  moveSequence,
  question,
  onSubmit,
  disabled = false,
  size = 480,
}: VisualizationViewProps) {
  const [phase, setPhase] = useState<VizPhase>("study");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const startTimeRef = useRef<number>(0);

  const handleReady = useCallback(() => {
    setPhase("answer");
    startTimeRef.current = Date.now();
  }, []);

  const handleSubmit = useCallback(() => {
    const answer = question.options ? selectedAnswer ?? "" : textAnswer;
    const timeTakenMs = Date.now() - startTimeRef.current;
    setPhase("submitted");
    onSubmit(answer, timeTakenMs);
  }, [question.options, selectedAnswer, textAnswer, onSubmit]);

  if (phase === "study") {
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
      <div className="flex gap-6">
        <div className="shrink-0">
          <div
            className="rounded-xl border border-border bg-surface-elevated p-3"
            style={{ width: size + 24 }}
          >
            <Chessboard options={options} />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-accent" />
            <span className="text-sm font-semibold text-text-primary">
              Calculate Mentally
            </span>
          </div>

          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">
              Move sequence
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {moveSequence.map((move, i) => (
                <span
                  key={i}
                  className="rounded-md bg-surface px-2 py-1 font-mono text-sm text-text-primary"
                >
                  {i + 1}. {move}
                </span>
              ))}
            </div>
          </div>

          <p className="text-xs text-text-muted">
            Study the position and mentally calculate the given moves.
            When ready, the board will be hidden and you will be asked a question.
          </p>

          <button
            onClick={handleReady}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <Eye className="mr-1.5 inline h-4 w-4" />
            Ready to Answer
          </button>
        </div>
      </div>
    );
  }

  // Answer phase — board hidden
  return (
    <div className="flex gap-6">
      <div className="shrink-0">
        <div
          className="flex items-center justify-center rounded-xl border border-border bg-surface-elevated p-3"
          style={{ width: size + 24, height: size + 24 }}
        >
          <div className="text-center">
            <EyeOff className="mx-auto h-12 w-12 text-text-muted" />
            <p className="mt-3 text-sm text-text-muted">Board hidden</p>
            <p className="mt-1 text-xs text-text-muted">
              Answer from your calculation
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
          <p className="text-sm font-medium text-text-primary">
            {question.prompt}
          </p>
        </div>

        {question.options ? (
          <div className="space-y-2">
            {question.options.map((option) => (
              <button
                key={option}
                onClick={() => setSelectedAnswer(option)}
                disabled={disabled || phase === "submitted"}
                className={cn(
                  "w-full rounded-lg border px-4 py-3 text-left font-mono text-sm transition-all",
                  selectedAnswer === option
                    ? "border-accent bg-accent/10 text-text-primary"
                    : "border-border bg-surface text-text-secondary hover:bg-surface-hover"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <input
            type="text"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            disabled={disabled || phase === "submitted"}
            placeholder="Type your answer..."
            className="rounded-lg border border-border bg-surface px-4 py-3 font-mono text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && textAnswer) handleSubmit();
            }}
          />
        )}

        <button
          onClick={handleSubmit}
          disabled={
            disabled ||
            phase === "submitted" ||
            (question.options ? !selectedAnswer : !textAnswer)
          }
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          <Send className="mr-1.5 inline h-3.5 w-3.5" />
          Submit Answer
        </button>
      </div>
    </div>
  );
}
