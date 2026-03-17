import { test, expect } from "../fixtures";

function piecesFromFen(fen: string): Array<{ square: string; piece: string }> {
  const board = fen.split(" ")[0];
  const rows = board.split("/");
  const files = "abcdefgh";
  const pieces: Array<{ square: string; piece: string }> = [];

  for (let rankIdx = 0; rankIdx < rows.length; rankIdx++) {
    let fileIdx = 0;
    const rank = 8 - rankIdx;
    for (const ch of rows[rankIdx]) {
      if (/\d/.test(ch)) {
        fileIdx += Number(ch);
        continue;
      }
      const color = ch === ch.toUpperCase() ? "w" : "b";
      const piece = ch.toLowerCase();
      pieces.push({
        square: `${files[fileIdx]}${rank}`,
        piece: `${color}${piece}`,
      });
      fileIdx++;
    }
  }

  return pieces;
}

async function completeGeneratedSession(api: {
  call: (action: string, params?: Record<string, unknown>) => Promise<unknown>;
}) {
  const generated = (await api.call("generateNewSession")) as {
    success: boolean;
    sessionId: string;
  };

  expect(generated.success).toBe(true);

  const loaded = (await api.call("loadSessionData", {
    sessionId: generated.sessionId,
  })) as {
    exercises: Array<{
      exerciseId: string;
      exerciseType: "tactical" | "recall" | "visualization" | "reconstruction";
      fen: string;
      sideToMove: string;
      lessonCategory: string;
      difficultyEstimate: string;
      playedMoveSan: string;
      bestMoveSan?: string;
      index: number;
      visualizationData?: { question: { correctAnswer: string } };
    }>;
    error: string | null;
  };

  expect(loaded.error).toBeNull();

  const rawAttempts: Array<Record<string, unknown>> = [];
  const startedAt = new Date().toISOString();

  for (const exercise of loaded.exercises) {
    if (exercise.exerciseType === "recall") {
      const recall = (await api.call("submitRecallAttempt", {
        sessionId: generated.sessionId,
        exerciseId: exercise.exerciseId,
        originalFen: exercise.fen,
        reconstructedPieces: piecesFromFen(exercise.fen),
        timeTakenMs: 4000,
      })) as {
        isCorrect: boolean;
        gradingTier: string;
        correctPieces: number;
        totalPieces: number;
      };

      rawAttempts.push({
        exerciseId: exercise.exerciseId,
        exerciseIndex: exercise.index,
        fen: exercise.fen,
        sideToMove: exercise.sideToMove,
        lessonCategory: exercise.lessonCategory,
        difficultyEstimate: exercise.difficultyEstimate,
        playedMoveSan: "",
        userMove: `recall:${recall.correctPieces}/${recall.totalPieces}`,
        userMoveUci: "",
        engineMove: "recall",
        engineMoveUci: "",
        isCorrect: recall.isCorrect,
        gradingTier: recall.gradingTier,
        evalLossCp: null,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    if (exercise.exerciseType === "visualization") {
      const viz = (await api.call("submitVisualizationAnswer", {
        sessionId: generated.sessionId,
        exerciseId: exercise.exerciseId,
        answer: exercise.visualizationData?.question.correctAnswer,
        timeTakenMs: 3000,
        question: exercise.visualizationData?.question,
      })) as {
        isCorrect: boolean;
        gradingTier: string;
        userAnswer: string;
        correctAnswer: string;
      };

      rawAttempts.push({
        exerciseId: exercise.exerciseId,
        exerciseIndex: exercise.index,
        fen: exercise.fen,
        sideToMove: exercise.sideToMove,
        lessonCategory: exercise.lessonCategory,
        difficultyEstimate: exercise.difficultyEstimate,
        playedMoveSan: "",
        userMove: viz.userAnswer,
        userMoveUci: "",
        engineMove: viz.correctAnswer,
        engineMoveUci: "",
        isCorrect: viz.isCorrect,
        gradingTier: viz.gradingTier,
        evalLossCp: null,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    const action =
      exercise.exerciseType === "reconstruction"
        ? "submitReconstructionMove"
        : "submitMove";
    const grade = (await api.call(action, {
      sessionId: generated.sessionId,
      exerciseIndex: exercise.index,
      moveInput: exercise.bestMoveSan,
    })) as {
      valid: boolean;
      attempt: {
        userMove: string;
        userMoveUci: string;
        engineMove: string;
        engineMoveUci: string;
        isCorrect: boolean;
        gradingTier: string;
        evalLossCp: number | null;
      };
    };

    expect(grade.valid).toBe(true);

    rawAttempts.push({
      exerciseId: exercise.exerciseId,
      exerciseIndex: exercise.index,
      fen: exercise.fen,
      sideToMove: exercise.sideToMove,
      lessonCategory: exercise.lessonCategory,
      difficultyEstimate: exercise.difficultyEstimate,
      playedMoveSan: exercise.playedMoveSan,
      userMove: grade.attempt.userMove,
      userMoveUci: grade.attempt.userMoveUci,
      engineMove: grade.attempt.engineMove,
      engineMoveUci: grade.attempt.engineMoveUci,
      isCorrect: grade.attempt.isCorrect,
      gradingTier: grade.attempt.gradingTier,
      evalLossCp: grade.attempt.evalLossCp,
      timestamp: new Date().toISOString(),
    });
  }

  await api.call("completeSession", {
    sessionId: generated.sessionId,
    rawAttempts,
    startedAt,
  });

  return generated.sessionId;
}

test.describe("History", () => {
  test("completed sessions appear in history and replay", async ({ api, page }) => {
    const sessionId = await completeGeneratedSession(api);

    await page.goto("/history");
    await expect(page.locator("h1")).toHaveText("History");
    await expect(page.locator(`a[href="/history/session/${sessionId}"]`).first()).toBeVisible();

    await page.goto(`/history/session/${sessionId}`);
    await expect(page.locator("h1")).toHaveText("Session Replay");
    await expect(page.getByText("Coaching Explanation")).toBeVisible();
    await expect(page.getByRole("button", { name: "Next", exact: true })).toBeVisible();
  });
});


