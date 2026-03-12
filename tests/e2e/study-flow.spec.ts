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

test.describe("Study flow (end-to-end)", () => {
  let sessionId: string;

  test("generate a new session", async ({ api }) => {
    const result = (await api.call("generateNewSession")) as {
      success: boolean;
      sessionId: string;
      exerciseCount: number;
    };

    expect(result.success).toBe(true);
    expect(result.sessionId).toBeTruthy();
    expect(result.exerciseCount).toBe(10);

    sessionId = result.sessionId;
  });

  test("session artifact exists with correct structure", async ({ artifacts }) => {
    expect(sessionId).toBeTruthy();

    const session = await artifacts.readJson<{
      sessionId: string;
      exerciseCount: number;
      exercises: unknown[];
      createdAt: string;
      metadata: {
        exerciseTypeMix?: Record<string, number>;
        trainingObjective?: string;
      };
    }>(`sessions/${sessionId}/study-session.json`);

    expect(session.sessionId).toBe(sessionId);
    expect(session.exerciseCount).toBe(10);
    expect(session.exercises).toHaveLength(10);
    expect(session.createdAt).toBeTruthy();
    expect(session.metadata.exerciseTypeMix).toBeTruthy();
    expect(session.metadata.trainingObjective).toBeTruthy();
  });

  test("study page renders for new session", async ({ page }) => {
    expect(sessionId).toBeTruthy();

    await page.goto(`/study/${sessionId}`);
    await expect(page.locator("h1")).toHaveText("Study Session", {
      timeout: 10_000,
    });
  });

  test("submit all exercise types and complete session", async ({ api, artifacts }) => {
    expect(sessionId).toBeTruthy();

    const load = (await api.call("loadSessionData", {
      sessionId,
    })) as {
      exercises: Array<{
        exerciseId: string;
        exerciseType: "tactical" | "recall" | "visualization" | "reconstruction";
        fen: string;
        sideToMove: string;
        lessonCategory: string;
        difficultyEstimate: string;
        playedMoveSan: string;
        bestMoveSan: string | undefined;
        index: number;
        visualizationData?: {
          question: {
            correctAnswer: string;
          };
        };
      }>;
      error: string | null;
    };

    expect(load.error).toBeNull();
    expect(load.exercises.length).toBe(10);

    const rawAttempts: Array<Record<string, unknown>> = [];
    const startedAt = new Date().toISOString();

    for (const ex of load.exercises) {
      if (ex.exerciseType === "recall") {
        const recallResult = (await api.call("submitRecallAttempt", {
          sessionId,
          exerciseId: ex.exerciseId,
          originalFen: ex.fen,
          reconstructedPieces: piecesFromFen(ex.fen),
          timeTakenMs: 5000,
        })) as {
          isCorrect: boolean;
          gradingTier: string;
          correctPieces: number;
          totalPieces: number;
        };

        expect(recallResult.isCorrect).toBe(true);

        rawAttempts.push({
          exerciseId: ex.exerciseId,
          exerciseIndex: ex.index,
          fen: ex.fen,
          sideToMove: ex.sideToMove,
          lessonCategory: ex.lessonCategory,
          difficultyEstimate: ex.difficultyEstimate,
          playedMoveSan: "",
          userMove: `recall:${recallResult.correctPieces}/${recallResult.totalPieces}`,
          userMoveUci: "",
          engineMove: "recall",
          engineMoveUci: "",
          isCorrect: recallResult.isCorrect,
          gradingTier: recallResult.gradingTier,
          evalLossCp: null,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      if (ex.exerciseType === "visualization") {
        const answer = ex.visualizationData?.question.correctAnswer;
        const vizResult = (await api.call("submitVisualizationAnswer", {
          sessionId,
          exerciseId: ex.exerciseId,
          answer,
          timeTakenMs: 4000,
          question: ex.visualizationData?.question,
        })) as {
          isCorrect: boolean;
          gradingTier: string;
          userAnswer: string;
          correctAnswer: string;
        };

        expect(vizResult.isCorrect).toBe(true);

        rawAttempts.push({
          exerciseId: ex.exerciseId,
          exerciseIndex: ex.index,
          fen: ex.fen,
          sideToMove: ex.sideToMove,
          lessonCategory: ex.lessonCategory,
          difficultyEstimate: ex.difficultyEstimate,
          playedMoveSan: "",
          userMove: vizResult.userAnswer,
          userMoveUci: "",
          engineMove: vizResult.correctAnswer,
          engineMoveUci: "",
          isCorrect: vizResult.isCorrect,
          gradingTier: vizResult.gradingTier,
          evalLossCp: null,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      const moveInput = ex.bestMoveSan;
      expect(moveInput).toBeTruthy();
      const action = ex.exerciseType === "reconstruction" ? "submitReconstructionMove" : "submitMove";

      const grade = (await api.call(action, {
        sessionId,
        exerciseIndex: ex.index,
        moveInput,
      })) as {
        valid: boolean;
        attempt: {
          exerciseId: string;
          exerciseIndex: number;
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
      expect(grade.attempt).not.toBeNull();
      expect(grade.attempt.isCorrect).toBe(true);

      rawAttempts.push({
        exerciseId: ex.exerciseId,
        exerciseIndex: ex.index,
        fen: ex.fen,
        sideToMove: ex.sideToMove,
        lessonCategory: ex.lessonCategory,
        difficultyEstimate: ex.difficultyEstimate,
        playedMoveSan: ex.playedMoveSan,
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

    const completion = (await api.call("completeSession", {
      sessionId,
      rawAttempts,
      startedAt,
    })) as {
      sessionId: string;
      totalExercises: number;
      correctCount: number;
      accuracy: number;
    };

    expect(completion.sessionId).toBe(sessionId);
    expect(completion.totalExercises).toBe(10);
    expect(completion.correctCount).toBe(10);
    expect(completion.accuracy).toBe(1.0);

    const resultsExist = await artifacts.exists(`results/${sessionId}/session-results.json`);
    expect(resultsExist).toBe(true);

    const results = await artifacts.readJson<{
      sessionId: string;
      results: Array<{ exerciseId: string; result: string }>;
    }>(`results/${sessionId}/session-results.json`);

    expect(results.sessionId).toBe(sessionId);
    expect(results.results).toHaveLength(10);
    for (const r of results.results) {
      expect(r.result).toBe("correct");
    }
  });
});
