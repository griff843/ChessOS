"use client";

import { useState, useCallback, useEffect, useRef, useTransition } from "react";
import { StudyBoard } from "./study-board";
import { ExerciseInfo } from "./exercise-info";
import { CognitiveExerciseInfo } from "./cognitive-exercise-info";
import { FeedbackPanel, InvalidMoveBanner } from "./feedback-panel";
import { CognitiveFeedback } from "./cognitive-feedback";
import { RecallBoard } from "./recall-board";
import { VisualizationView } from "./visualization-view";
import { ProgressRail, GradeDistribution } from "./progress-rail";
import { CompletionRecap } from "./completion-recap";
import {
  submitMove,
  submitRecallAttempt,
  submitVisualizationAnswer,
  submitReconstructionMove,
  completeSession,
} from "@/app/study/actions";
import {
  buildAdaptiveDifficultyPlan,
  buildCoachingInsight,
  buildSessionCoachingFeedback,
} from "@/lib/coaching-engine";
import type {
  AdaptiveDifficultyPlan,
  CompletionResult,
  ExerciseView,
  GradeResult,
  MoveCoachingInsight,
  SessionAttemptSummary,
  StudyPhase,
} from "@/lib/study-types";
import {
  saveCheckpoint,
  loadCheckpoint,
  clearCheckpoint,
} from "@/lib/session-checkpoint";
import Link from "next/link";
import { Loader2, ArrowLeft, RotateCcw } from "lucide-react";

interface StudyPlayerProps {
  sessionId: string;
  exercises: ExerciseView[];
}

type RawAttempt = {
  exerciseId: string;
  exerciseIndex: number;
  fen: string;
  sideToMove: string;
  lessonCategory: string;
  difficultyEstimate: string;
  playedMoveSan: string;
  userMove: string;
  userMoveUci: string;
  engineMove: string;
  engineMoveUci: string;
  isCorrect: boolean;
  gradingTier: string;
  evalLossCp: number | null;
  timestamp: string;
};

function rebuildResults(
  rawAttempts: RawAttempt[],
  exerciseCount: number
): Array<GradeResult["attempt"]> {
  const results: Array<GradeResult["attempt"]> = new Array(exerciseCount).fill(null);
  for (const attempt of rawAttempts) {
    if (attempt.exerciseIndex >= 0 && attempt.exerciseIndex < exerciseCount) {
      results[attempt.exerciseIndex] = {
        exerciseId: attempt.exerciseId,
        exerciseIndex: attempt.exerciseIndex,
        userMove: attempt.userMove,
        userMoveUci: attempt.userMoveUci,
        engineMove: attempt.engineMove,
        engineMoveUci: attempt.engineMoveUci,
        isCorrect: attempt.isCorrect,
        gradingTier: attempt.gradingTier,
        evalLossCp: attempt.evalLossCp,
      };
    }
  }
  return results;
}

export function StudyPlayer({ sessionId, exercises }: StudyPlayerProps) {
  // Restore checkpoint on initial mount
  const restored = useRef(() => {
    const cp = loadCheckpoint(sessionId);
    if (cp && cp.currentIndex < exercises.length && cp.rawAttempts.length > 0) {
      return cp;
    }
    return null;
  });
  const checkpoint = restored.current();

  const [phase, setPhase] = useState<StudyPhase>("playing");
  const [currentIndex, setCurrentIndex] = useState(
    checkpoint ? checkpoint.currentIndex : 0
  );
  const [results, setResults] = useState<Array<GradeResult["attempt"]>>(
    checkpoint
      ? rebuildResults(checkpoint.rawAttempts, exercises.length)
      : new Array(exercises.length).fill(null)
  );
  const [rawAttempts, setRawAttempts] = useState<RawAttempt[]>(
    checkpoint ? checkpoint.rawAttempts : []
  );
  const [currentFeedback, setCurrentFeedback] = useState<GradeResult | null>(
    null
  );
  const [currentCoaching, setCurrentCoaching] =
    useState<MoveCoachingInsight | null>(null);
  const [adaptivePlan, setAdaptivePlan] =
    useState<AdaptiveDifficultyPlan | null>(null);
  const [cognitiveFeedback, setCognitiveFeedback] = useState<{
    type: "recall" | "visualization";
    recall?: {
      totalPieces: number;
      correctPieces: number;
      accuracy: number;
      gradingTier: string;
      isCorrect: boolean;
    };
    viz?: {
      isCorrect: boolean;
      userAnswer: string;
      correctAnswer: string;
      gradingTier: string;
    };
  } | null>(null);
  const [invalidError, setInvalidError] = useState<string | null>(null);
  const [completionResult, setCompletionResult] =
    useState<CompletionResult | null>(null);
  const [startedAt] = useState(
    () => checkpoint?.startedAt ?? new Date().toISOString()
  );
  const [isPending, startTransition] = useTransition();
  const [highlightSquares, setHighlightSquares] = useState<{
    from?: string;
    to?: string;
  }>({});

  // Save checkpoint after each exercise grading
  useEffect(() => {
    if (rawAttempts.length > 0 && phase !== "completed") {
      saveCheckpoint({
        sessionId,
        startedAt,
        currentIndex,
        rawAttempts,
      });
    }
  }, [rawAttempts, sessionId, startedAt, currentIndex, phase]);

  const currentExercise = exercises[currentIndex];
  const isMixedSession = exercises.some((e) => e.exerciseType !== "tactical");
  const exerciseType = currentExercise?.exerciseType ?? "tactical";

  const computeStreaks = useCallback(
    (nextIsCorrect: boolean) => {
      let correctStreak = nextIsCorrect ? 1 : 0;
      let failStreak = nextIsCorrect ? 0 : 1;

      for (let i = currentIndex - 1; i >= 0; i -= 1) {
        const previous = results[i];
        if (!previous) continue;

        if (nextIsCorrect) {
          if (!previous.isCorrect) break;
          correctStreak += 1;
        } else {
          if (previous.isCorrect) break;
          failStreak += 1;
        }
      }

      return { correctStreak, failStreak };
    },
    [currentIndex, results]
  );

  const resetSessionState = useCallback(() => {
    clearCheckpoint(sessionId);
    setCurrentIndex(0);
    setPhase("playing");
    setResults(new Array(exercises.length).fill(null));
    setRawAttempts([]);
    setCurrentFeedback(null);
    setCurrentCoaching(null);
    setAdaptivePlan(null);
    setCognitiveFeedback(null);
    setInvalidError(null);
    setHighlightSquares({});
    setCompletionResult(null);
  }, [exercises.length, sessionId]);

  const handleMove = useCallback(
    (moveInput: string) => {
      if (phase !== "playing" || isPending) return;

      setInvalidError(null);
      startTransition(async () => {
        const result =
          exerciseType === "reconstruction"
            ? await submitReconstructionMove(sessionId, currentIndex, moveInput)
            : await submitMove(sessionId, currentIndex, moveInput);

        if (!result.valid) {
          setInvalidError(result.error || "Invalid move");
          return;
        }

        setCurrentFeedback(result);
        setCurrentCoaching(null);
        setAdaptivePlan(null);
        setPhase("feedback");

        const newResults = [...results];
        newResults[currentIndex] = result.attempt;
        setResults(newResults);

        if (result.attempt) {
          const attempt = result.attempt;
          const streaks = computeStreaks(attempt.isCorrect);
          setCurrentCoaching(
            buildCoachingInsight({
              position: currentExercise.fen,
              engineEvaluation: currentExercise.engineEvaluation,
              bestMove: attempt.engineMove,
              userMove: attempt.userMove,
              theme:
                currentExercise.patternCategory ?? currentExercise.lessonCategory,
              reasonCodes: currentExercise.reasonCodes,
            })
          );
          setAdaptivePlan(
            buildAdaptiveDifficultyPlan({
              ...streaks,
              theme: currentExercise.lessonCategory,
            })
          );

          setRawAttempts((prev) => [
            ...prev,
            {
              exerciseId: attempt.exerciseId,
              exerciseIndex: attempt.exerciseIndex,
              fen: currentExercise.fen,
              sideToMove: currentExercise.sideToMove,
              lessonCategory: currentExercise.lessonCategory,
              difficultyEstimate: currentExercise.difficultyEstimate,
              playedMoveSan: currentExercise.playedMoveSan,
              userMove: attempt.userMove,
              userMoveUci: attempt.userMoveUci,
              engineMove: attempt.engineMove,
              engineMoveUci: attempt.engineMoveUci,
              isCorrect: attempt.isCorrect,
              gradingTier: attempt.gradingTier,
              evalLossCp: attempt.evalLossCp,
              timestamp: new Date().toISOString(),
            },
          ]);

          const uci = attempt.engineMoveUci;
          if (uci && uci.length >= 4) {
            setHighlightSquares({
              from: uci.slice(0, 2),
              to: uci.slice(2, 4),
            });
          }
        }
      });
    },
    [
      phase,
      isPending,
      exerciseType,
      sessionId,
      currentIndex,
      results,
      computeStreaks,
      currentExercise,
    ]
  );

  const handleRecallSubmit = useCallback(
    (pieces: Array<{ square: string; piece: string }>, timeTakenMs: number) => {
      if (phase !== "playing" || isPending) return;

      startTransition(async () => {
        const result = await submitRecallAttempt(
          sessionId,
          currentExercise.exerciseId,
          currentExercise.fen,
          pieces,
          timeTakenMs
        );

        setCurrentCoaching(null);
        setAdaptivePlan(null);
        setCognitiveFeedback({
          type: "recall",
          recall: {
            totalPieces: result.totalPieces,
            correctPieces: result.correctPieces,
            accuracy: result.accuracy,
            gradingTier: result.gradingTier,
            isCorrect: result.isCorrect,
          },
        });
        setPhase("feedback");

        const newResults = [...results];
        newResults[currentIndex] = {
          exerciseId: currentExercise.exerciseId,
          exerciseIndex: currentIndex,
          userMove: `${result.correctPieces}/${result.totalPieces} pieces`,
          userMoveUci: "",
          engineMove: "full position",
          engineMoveUci: "",
          isCorrect: result.isCorrect,
          gradingTier: result.gradingTier,
          evalLossCp: null,
        };
        setResults(newResults);

        setRawAttempts((prev) => [
          ...prev,
          {
            exerciseId: currentExercise.exerciseId,
            exerciseIndex: currentIndex,
            fen: currentExercise.fen,
            sideToMove: currentExercise.sideToMove,
            lessonCategory: currentExercise.lessonCategory,
            difficultyEstimate: currentExercise.difficultyEstimate,
            playedMoveSan: "",
            userMove: `recall:${result.correctPieces}/${result.totalPieces}`,
            userMoveUci: "",
            engineMove: "recall",
            engineMoveUci: "",
            isCorrect: result.isCorrect,
            gradingTier: result.gradingTier,
            evalLossCp: null,
            timestamp: new Date().toISOString(),
          },
        ]);
      });
    },
    [phase, isPending, sessionId, currentExercise, currentIndex, results]
  );

  const handleVisualizationSubmit = useCallback(
    (answer: string, timeTakenMs: number) => {
      if (phase !== "playing" || isPending) return;
      if (!currentExercise.visualizationData) return;

      startTransition(async () => {
        const result = await submitVisualizationAnswer(
          sessionId,
          currentExercise.exerciseId,
          answer,
          timeTakenMs,
          currentExercise.visualizationData!.question
        );

        setCurrentCoaching(null);
        setAdaptivePlan(null);
        setCognitiveFeedback({
          type: "visualization",
          viz: {
            isCorrect: result.isCorrect,
            userAnswer: result.userAnswer,
            correctAnswer: result.correctAnswer,
            gradingTier: result.gradingTier,
          },
        });
        setPhase("feedback");

        const newResults = [...results];
        newResults[currentIndex] = {
          exerciseId: currentExercise.exerciseId,
          exerciseIndex: currentIndex,
          userMove: result.userAnswer,
          userMoveUci: "",
          engineMove: result.correctAnswer,
          engineMoveUci: "",
          isCorrect: result.isCorrect,
          gradingTier: result.gradingTier,
          evalLossCp: null,
        };
        setResults(newResults);

        setRawAttempts((prev) => [
          ...prev,
          {
            exerciseId: currentExercise.exerciseId,
            exerciseIndex: currentIndex,
            fen: currentExercise.fen,
            sideToMove: currentExercise.sideToMove,
            lessonCategory: currentExercise.lessonCategory,
            difficultyEstimate: currentExercise.difficultyEstimate,
            playedMoveSan: "",
            userMove: result.userAnswer,
            userMoveUci: "",
            engineMove: result.correctAnswer,
            engineMoveUci: "",
            isCorrect: result.isCorrect,
            gradingTier: result.gradingTier,
            evalLossCp: null,
            timestamp: new Date().toISOString(),
          },
        ]);
      });
    },
    [phase, isPending, sessionId, currentExercise, currentIndex, results]
  );

  const handleContinue = useCallback(() => {
    setHighlightSquares({});
    setCurrentFeedback(null);
    setCurrentCoaching(null);
    setAdaptivePlan(null);
    setCognitiveFeedback(null);

    if (currentIndex + 1 >= exercises.length) {
      setPhase("loading");
      startTransition(async () => {
        const result = await completeSession(sessionId, rawAttempts, startedAt);
        clearCheckpoint(sessionId);
        setCompletionResult(result);
        setPhase("completed");
      });
    } else {
      setCurrentIndex((prev) => prev + 1);
      setPhase("playing");
    }
  }, [currentIndex, exercises.length, sessionId, rawAttempts, startedAt]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Enter" && phase === "feedback") {
        e.preventDefault();
        handleContinue();
      }
      if (e.key === "Escape" && invalidError) {
        setInvalidError(null);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, handleContinue, invalidError]);

  if (phase === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />
          <p className="mt-3 text-sm text-text-secondary">
            Saving results and updating progress...
          </p>
        </div>
      </div>
    );
  }

  if (phase === "completed" && completionResult) {
    const summaryAttempts: SessionAttemptSummary[] = rawAttempts.map((attempt) => ({
      lessonCategory: attempt.lessonCategory,
      difficultyEstimate: attempt.difficultyEstimate,
      isCorrect: attempt.isCorrect,
    }));

    return (
      <CompletionRecap
        result={completionResult}
        coachingSummary={buildSessionCoachingFeedback(summaryAttempts)}
      />
    );
  }

  if (!currentExercise) return null;

  if (exerciseType === "recall" && currentExercise.recallData) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-3 flex items-center justify-between">
          <Link
            href="/sessions"
            className="flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Sessions
          </Link>
          <button
            onClick={resetSessionState}
            className="flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restart
          </button>
        </div>

        <div className="mb-4">
          <ProgressRail total={exercises.length} current={currentIndex} results={results} />
        </div>

        <div className="flex gap-6">
          <div className="shrink-0">
            {phase === "playing" ? (
              <RecallBoard
                fen={currentExercise.fen}
                sideToMove={currentExercise.sideToMove}
                viewingWindowMs={currentExercise.recallData.viewingWindowMs}
                onSubmit={handleRecallSubmit}
                disabled={isPending}
                size={480}
              />
            ) : (
              <div style={{ width: 504 }} />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <CognitiveExerciseInfo exercise={currentExercise} />
            <GradeDistribution results={results} />

            {phase === "feedback" && cognitiveFeedback?.type === "recall" && (
              <CognitiveFeedback
                exerciseType="recall"
                onContinue={handleContinue}
                recallResult={cognitiveFeedback.recall}
                originalFen={currentExercise.fen}
                sideToMove={currentExercise.sideToMove}
              />
            )}

            {phase === "feedback" && (
              <div className="text-xs text-text-muted">
                Press <kbd className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono">Enter</kbd> to continue
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (exerciseType === "visualization" && currentExercise.visualizationData) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-3 flex items-center justify-between">
          <Link
            href="/sessions"
            className="flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Sessions
          </Link>
          <button
            onClick={resetSessionState}
            className="flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restart
          </button>
        </div>

        <div className="mb-4">
          <ProgressRail total={exercises.length} current={currentIndex} results={results} />
        </div>

        {phase === "playing" ? (
          <VisualizationView
            fen={currentExercise.fen}
            sideToMove={currentExercise.sideToMove}
            moveSequence={currentExercise.visualizationData.moveSequence}
            question={currentExercise.visualizationData.question}
            onSubmit={handleVisualizationSubmit}
            disabled={isPending}
            size={480}
          />
        ) : phase === "feedback" && cognitiveFeedback?.type === "visualization" ? (
          <div className="flex gap-6">
            <div style={{ width: 504 }} />
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <CognitiveExerciseInfo exercise={currentExercise} />
              <CognitiveFeedback
                exerciseType="visualization"
                onContinue={handleContinue}
                vizResult={cognitiveFeedback.viz}
              />
              <div className="text-xs text-text-muted">
                Press <kbd className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono">Enter</kbd> to continue
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-3 flex items-center justify-between">
        <Link
          href="/sessions"
          className="flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Sessions
        </Link>
        <button
          onClick={resetSessionState}
          className="flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text-primary"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restart
        </button>
      </div>

      <div className="mb-4">
        <ProgressRail
          total={exercises.length}
          current={currentIndex}
          results={results}
        />
      </div>

      <div className="flex gap-6">
        <div className="shrink-0">
          <StudyBoard
            fen={currentExercise.fen}
            sideToMove={currentExercise.sideToMove}
            heroColor={currentExercise.heroColor}
            onMove={handleMove}
            disabled={phase !== "playing" || isPending}
            highlightSquares={highlightSquares}
            size={480}
          />
          {isPending && phase === "playing" && (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-text-muted">
              <Loader2 className="h-3 w-3 animate-spin" />
              Evaluating...
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {isMixedSession ? (
            <CognitiveExerciseInfo exercise={currentExercise} />
          ) : (
            <ExerciseInfo exercise={currentExercise} />
          )}

          <GradeDistribution results={results} />

          {invalidError && (
            <InvalidMoveBanner
              error={invalidError}
              onDismiss={() => setInvalidError(null)}
            />
          )}

          {phase === "feedback" && currentFeedback && (
            isMixedSession ? (
              <CognitiveFeedback
                exerciseType={exerciseType}
                onContinue={handleContinue}
                gradeResult={currentFeedback}
                coaching={currentCoaching ?? undefined}
                adaptivePlan={adaptivePlan ?? undefined}
              />
            ) : (
              <FeedbackPanel
                result={currentFeedback}
                onContinue={handleContinue}
                coaching={currentCoaching ?? undefined}
                adaptivePlan={adaptivePlan ?? undefined}
              />
            )
          )}

          {phase === "playing" && !isPending && (
            <div className="mt-auto text-xs text-text-muted">
              {exerciseType === "reconstruction"
                ? "What move did the master play?"
                : "Click or drag a piece to make your move"}
            </div>
          )}
          {phase === "feedback" && (
            <div className="text-xs text-text-muted">
              Press <kbd className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono">Enter</kbd> to continue
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


