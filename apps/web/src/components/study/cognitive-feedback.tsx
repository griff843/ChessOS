"use client";

import { cn } from "@/lib/utils";
import { CoachingInsightPanel } from "./coaching-insight-panel";
import { Chessboard } from "react-chessboard";
import type { ChessboardOptions } from "react-chessboard";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Eye,
} from "lucide-react";
import type {
  AdaptiveDifficultyPlan,
  GradeResult,
  MoveCoachingInsight,
} from "@/lib/study-types";

interface CognitiveFeedbackProps {
  exerciseType: "tactical" | "recall" | "visualization" | "reconstruction";
  onContinue: () => void;
  gradeResult?: GradeResult;
  coaching?: MoveCoachingInsight;
  adaptivePlan?: AdaptiveDifficultyPlan;
  recallResult?: {
    totalPieces: number;
    correctPieces: number;
    accuracy: number;
    gradingTier: string;
    isCorrect: boolean;
  };
  originalFen?: string;
  sideToMove?: "white" | "black";
  vizResult?: {
    isCorrect: boolean;
    userAnswer: string;
    correctAnswer: string;
    gradingTier: string;
  };
}

const tierConfig: Record<
  string,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: "check" | "warn" | "x";
  }
> = {
  exact: {
    label: "Perfect",
    color: "text-success",
    bgColor: "bg-success-muted border-success/20",
    icon: "check",
  },
  acceptable: {
    label: "Good",
    color: "text-info",
    bgColor: "bg-info-muted border-info/20",
    icon: "check",
  },
  inaccuracy: {
    label: "Close",
    color: "text-warning",
    bgColor: "bg-warning-muted border-warning/20",
    icon: "warn",
  },
  mistake: {
    label: "Inaccurate",
    color: "text-danger",
    bgColor: "bg-danger-muted border-danger/20",
    icon: "x",
  },
  blunder: {
    label: "Incorrect",
    color: "text-danger",
    bgColor: "bg-danger-muted border-danger/20",
    icon: "x",
  },
};

export function CognitiveFeedback({
  exerciseType,
  onContinue,
  gradeResult,
  coaching,
  adaptivePlan,
  recallResult,
  originalFen,
  sideToMove,
  vizResult,
}: CognitiveFeedbackProps) {
  if (exerciseType === "recall" && recallResult) {
    const config = tierConfig[recallResult.gradingTier] ?? tierConfig.inaccuracy;
    const IconComponent =
      config.icon === "check"
        ? CheckCircle
        : config.icon === "warn"
          ? AlertTriangle
          : XCircle;

    return (
      <div className={cn("rounded-xl border p-5", config.bgColor)}>
        <div className="flex items-center gap-2">
          <IconComponent className={cn("h-5 w-5", config.color)} />
          <span className={cn("text-sm font-semibold", config.color)}>
            {config.label}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-surface px-3 py-2 text-center">
            <p className="text-2xl font-bold text-text-primary">
              {recallResult.correctPieces}/{recallResult.totalPieces}
            </p>
            <p className="text-[10px] text-text-muted">Pieces correct</p>
          </div>
          <div className="rounded-lg bg-surface px-3 py-2 text-center">
            <p className="text-2xl font-bold text-text-primary">
              {Math.round(recallResult.accuracy * 100)}%
            </p>
            <p className="text-[10px] text-text-muted">Accuracy</p>
          </div>
        </div>

        {originalFen && (
          <div className="mt-3">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Eye className="h-3 w-3" />
              Original position
            </div>
            <div className="mt-1.5 overflow-hidden rounded-lg" style={{ width: 200 }}>
              <Chessboard
                options={{
                  position: originalFen,
                  boardOrientation: sideToMove ?? "white",
                  allowDragging: false,
                  animationDurationInMs: 0,
                  darkSquareStyle: { backgroundColor: "#4a4a5e" },
                  lightSquareStyle: { backgroundColor: "#7a7a8e" },
                } as ChessboardOptions}
              />
            </div>
          </div>
        )}

        <button
          onClick={onContinue}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Continue
        </button>
      </div>
    );
  }

  if (exerciseType === "visualization" && vizResult) {
    const isCorrect = vizResult.isCorrect;
    const config = isCorrect ? tierConfig.exact : tierConfig.blunder;
    const IconComponent = isCorrect ? CheckCircle : XCircle;

    return (
      <div className={cn("rounded-xl border p-5", config.bgColor)}>
        <div className="flex items-center gap-2">
          <IconComponent className={cn("h-5 w-5", config.color)} />
          <span className={cn("text-sm font-semibold", config.color)}>
            {isCorrect ? "Correct!" : "Incorrect"}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="rounded-lg bg-surface px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">
              Your answer
            </p>
            <p
              className={cn(
                "mt-0.5 font-mono text-sm font-semibold",
                isCorrect ? "text-success" : "text-text-primary"
              )}
            >
              {vizResult.userAnswer || "(no answer)"}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-text-muted" />
          <div className="rounded-lg bg-surface px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">
              Correct answer
            </p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-success">
              {vizResult.correctAnswer}
            </p>
          </div>
        </div>

        <button
          onClick={onContinue}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Continue
        </button>
      </div>
    );
  }

  if (gradeResult?.attempt) {
    const { attempt } = gradeResult;
    const config = tierConfig[attempt.gradingTier] ?? tierConfig.inaccuracy;
    const IconComponent =
      config.icon === "check"
        ? CheckCircle
        : config.icon === "warn"
          ? AlertTriangle
          : XCircle;

    return (
      <div className={cn("rounded-xl border p-5", config.bgColor)}>
        <div className="flex items-center gap-2">
          <IconComponent className={cn("h-5 w-5", config.color)} />
          <span className={cn("text-sm font-semibold", config.color)}>
            {config.label}
          </span>
          {attempt.evalLossCp !== null && attempt.evalLossCp > 0 && (
            <span className="text-xs text-text-muted">
              ({attempt.evalLossCp}cp loss)
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="rounded-lg bg-surface px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">
              Your move
            </p>
            <p
              className={cn(
                "mt-0.5 font-mono text-sm font-semibold",
                attempt.isCorrect ? "text-success" : "text-text-primary"
              )}
            >
              {attempt.userMove}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-text-muted" />
          <div className="rounded-lg bg-surface px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">
              {exerciseType === "reconstruction" ? "Game move" : "Best move"}
            </p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-success">
              {attempt.engineMove}
            </p>
          </div>
        </div>

        {coaching && adaptivePlan && (
          <div className="mt-4">
            <CoachingInsightPanel coaching={coaching} adaptivePlan={adaptivePlan} />
          </div>
        )}

        <button
          onClick={onContinue}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Continue
        </button>
      </div>
    );
  }

  return null;
}

