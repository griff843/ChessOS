import { test, expect } from "../fixtures";

test.describe("Cognitive exercise tests", () => {
  // â”€â”€ Recall Grading â”€â”€

  test("submitRecallAttempt with perfect recall grades exact", async ({
    api,
  }) => {
    // Starting position: 32 pieces
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const allPieces = [
      // White pieces (rank 1 and 2)
      { square: "a1", piece: "wr" }, { square: "b1", piece: "wn" },
      { square: "c1", piece: "wb" }, { square: "d1", piece: "wq" },
      { square: "e1", piece: "wk" }, { square: "f1", piece: "wb" },
      { square: "g1", piece: "wn" }, { square: "h1", piece: "wr" },
      { square: "a2", piece: "wp" }, { square: "b2", piece: "wp" },
      { square: "c2", piece: "wp" }, { square: "d2", piece: "wp" },
      { square: "e2", piece: "wp" }, { square: "f2", piece: "wp" },
      { square: "g2", piece: "wp" }, { square: "h2", piece: "wp" },
      // Black pieces (rank 7 and 8)
      { square: "a8", piece: "br" }, { square: "b8", piece: "bn" },
      { square: "c8", piece: "bb" }, { square: "d8", piece: "bq" },
      { square: "e8", piece: "bk" }, { square: "f8", piece: "bb" },
      { square: "g8", piece: "bn" }, { square: "h8", piece: "br" },
      { square: "a7", piece: "bp" }, { square: "b7", piece: "bp" },
      { square: "c7", piece: "bp" }, { square: "d7", piece: "bp" },
      { square: "e7", piece: "bp" }, { square: "f7", piece: "bp" },
      { square: "g7", piece: "bp" }, { square: "h7", piece: "bp" },
    ];

    const result = (await api.call("submitRecallAttempt", {
      sessionId: "test-recall",
      exerciseId: "recall-test-1",
      originalFen: fen,
      reconstructedPieces: allPieces,
      timeTakenMs: 5000,
    })) as {
      totalPieces: number;
      correctPieces: number;
      incorrectPieces: number;
      missingPieces: number;
      extraPieces: number;
      accuracy: number;
      gradingTier: string;
      isCorrect: boolean;
    };

    expect(result.totalPieces).toBe(32);
    expect(result.correctPieces).toBe(32);
    expect(result.incorrectPieces).toBe(0);
    expect(result.missingPieces).toBe(0);
    expect(result.extraPieces).toBe(0);
    expect(result.accuracy).toBe(1.0);
    expect(result.gradingTier).toBe("exact");
    expect(result.isCorrect).toBe(true);
  });

  test("submitRecallAttempt with imperfect recall grades correctly", async ({
    api,
  }) => {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    // Only place 28 of 32 pieces (missing 4 black pawns)
    const partialPieces = [
      { square: "a1", piece: "wr" }, { square: "b1", piece: "wn" },
      { square: "c1", piece: "wb" }, { square: "d1", piece: "wq" },
      { square: "e1", piece: "wk" }, { square: "f1", piece: "wb" },
      { square: "g1", piece: "wn" }, { square: "h1", piece: "wr" },
      { square: "a2", piece: "wp" }, { square: "b2", piece: "wp" },
      { square: "c2", piece: "wp" }, { square: "d2", piece: "wp" },
      { square: "e2", piece: "wp" }, { square: "f2", piece: "wp" },
      { square: "g2", piece: "wp" }, { square: "h2", piece: "wp" },
      { square: "a8", piece: "br" }, { square: "b8", piece: "bn" },
      { square: "c8", piece: "bb" }, { square: "d8", piece: "bq" },
      { square: "e8", piece: "bk" }, { square: "f8", piece: "bb" },
      { square: "g8", piece: "bn" }, { square: "h8", piece: "br" },
      { square: "a7", piece: "bp" }, { square: "b7", piece: "bp" },
      { square: "c7", piece: "bp" }, { square: "d7", piece: "bp" },
      // Missing: e7, f7, g7, h7
    ];

    const result = (await api.call("submitRecallAttempt", {
      sessionId: "test-recall",
      exerciseId: "recall-test-2",
      originalFen: fen,
      reconstructedPieces: partialPieces,
      timeTakenMs: 8000,
    })) as {
      totalPieces: number;
      correctPieces: number;
      missingPieces: number;
      accuracy: number;
      gradingTier: string;
      isCorrect: boolean;
    };

    expect(result.totalPieces).toBe(32);
    expect(result.correctPieces).toBe(28);
    expect(result.missingPieces).toBe(4);
    // 28/32 = 0.875 â†’ inaccuracy tier (>= 0.7, < 0.9)
    expect(result.accuracy).toBeCloseTo(0.875, 2);
    expect(result.gradingTier).toBe("inaccuracy");
    expect(result.isCorrect).toBe(false);
  });

  // â”€â”€ Visualization Grading â”€â”€

  test("submitVisualizationAnswer with correct answer grades exact", async ({
    api,
  }) => {
    const question = {
      type: "king_location",
      prompt: "What square is the white king on?",
      correctAnswer: "e1",
      options: ["e1", "d1", "f1", "g1"],
    };

    const result = (await api.call("submitVisualizationAnswer", {
      sessionId: "test-viz",
      exerciseId: "viz-test-1",
      answer: "e1",
      timeTakenMs: 3000,
      question,
    })) as {
      isCorrect: boolean;
      userAnswer: string;
      correctAnswer: string;
      questionType: string;
      gradingTier: string;
    };

    expect(result.isCorrect).toBe(true);
    expect(result.userAnswer).toBe("e1");
    expect(result.correctAnswer).toBe("e1");
    expect(result.questionType).toBe("king_location");
    expect(result.gradingTier).toBe("exact");
  });

  test("submitVisualizationAnswer with wrong answer grades blunder", async ({
    api,
  }) => {
    const question = {
      type: "check_status",
      prompt: "Is the black king in check?",
      correctAnswer: "no",
      options: ["yes", "no"],
    };

    const result = (await api.call("submitVisualizationAnswer", {
      sessionId: "test-viz",
      exerciseId: "viz-test-2",
      answer: "yes",
      timeTakenMs: 4000,
      question,
    })) as {
      isCorrect: boolean;
      gradingTier: string;
    };

    expect(result.isCorrect).toBe(false);
    expect(result.gradingTier).toBe("blunder");
  });

  // â”€â”€ Reconstruction Grading â”€â”€

  test("submitReconstructionMove with correct move grades exact", async ({
    api,
  }) => {
    // Load a known session to get exercises
    const load = (await api.call("loadSessionData", {
      sessionId: "session-175c3f4f",
    })) as {
      exercises: Array<{ bestMoveSan: string; index: number }>;
    };

    const bestMove = load.exercises[0].bestMoveSan;

    const result = (await api.call("submitReconstructionMove", {
      sessionId: "session-175c3f4f",
      exerciseIndex: 0,
      moveInput: bestMove,
    })) as {
      valid: boolean;
      attempt: { isCorrect: boolean; gradingTier: string } | null;
    };

    expect(result.valid).toBe(true);
    expect(result.attempt).not.toBeNull();
    expect(result.attempt!.isCorrect).toBe(true);
    expect(result.attempt!.gradingTier).toBe("exact");
  });

  test("submitReconstructionMove with illegal move returns invalid", async ({
    api,
  }) => {
    // Ensure cache populated
    await api.call("loadSessionData", {
      sessionId: "session-175c3f4f",
    });

    const result = (await api.call("submitReconstructionMove", {
      sessionId: "session-175c3f4f",
      exerciseIndex: 0,
      moveInput: "z9z9",
    })) as {
      valid: boolean;
      attempt: null;
    };

    expect(result.valid).toBe(false);
    expect(result.attempt).toBeNull();
  });

  // â”€â”€ Backward Compatibility â”€â”€

  test("existing tactical session loads with exerciseType tactical", async ({
    api,
  }) => {
    const load = (await api.call("loadSessionData", {
      sessionId: "session-175c3f4f",
    })) as {
      exercises: Array<{
        exerciseType: string;
        recallData?: unknown;
        visualizationData?: unknown;
        reconstructionData?: unknown;
      }>;
      error: string | null;
    };

    expect(load.error).toBeNull();
    expect(load.exercises.length).toBeGreaterThan(0);

    // All exercises should default to "tactical" (no cognitive sidecar)
    for (const ex of load.exercises) {
      expect(ex.exerciseType).toBe("tactical");
      expect(ex.recallData).toBeUndefined();
      expect(ex.visualizationData).toBeUndefined();
      expect(ex.reconstructionData).toBeUndefined();
    }
  });

  // â”€â”€ Grade Result Shape Validation â”€â”€

  test("recall grade result has all required fields", async ({ api }) => {
    const fen = "4k3/8/8/8/8/8/8/4K3 w - - 0 1"; // Minimal: 2 pieces
    const result = (await api.call("submitRecallAttempt", {
      sessionId: "test-shape",
      exerciseId: "shape-test",
      originalFen: fen,
      reconstructedPieces: [
        { square: "e1", piece: "wk" },
        { square: "e8", piece: "bk" },
      ],
      timeTakenMs: 1000,
    })) as Record<string, unknown>;

    // Verify all fields exist
    expect(typeof result.totalPieces).toBe("number");
    expect(typeof result.correctPieces).toBe("number");
    expect(typeof result.incorrectPieces).toBe("number");
    expect(typeof result.missingPieces).toBe("number");
    expect(typeof result.extraPieces).toBe("number");
    expect(typeof result.accuracy).toBe("number");
    expect(typeof result.gradingTier).toBe("string");
    expect(typeof result.isCorrect).toBe("boolean");
  });

  test("visualization grade result has all required fields", async ({
    api,
  }) => {
    const result = (await api.call("submitVisualizationAnswer", {
      sessionId: "test-shape",
      exerciseId: "shape-test",
      answer: "e4",
      timeTakenMs: 2000,
      question: {
        type: "final_square",
        prompt: "Where is the pawn?",
        correctAnswer: "e4",
      },
    })) as Record<string, unknown>;

    expect(typeof result.isCorrect).toBe("boolean");
    expect(typeof result.userAnswer).toBe("string");
    expect(typeof result.correctAnswer).toBe("string");
    expect(typeof result.questionType).toBe("string");
    expect(typeof result.gradingTier).toBe("string");
  });
  test("generateNewSession produces deterministic mixed exercise types", async ({ api }) => {
    const generated = (await api.call("generateNewSession")) as {
      success: boolean;
      sessionId: string;
    };

    expect(generated.success).toBe(true);

    const load = (await api.call("loadSessionData", {
      sessionId: generated.sessionId,
    })) as {
      exercises: Array<{ exerciseType: string }>;
      error: string | null;
    };

    expect(load.error).toBeNull();
    expect(load.exercises.length).toBe(10);

    const typeCounts = load.exercises.reduce<Record<string, number>>((acc, ex) => {
      acc[ex.exerciseType] = (acc[ex.exerciseType] ?? 0) + 1;
      return acc;
    }, {});

    expect(typeCounts.tactical ?? 0).toBeGreaterThan(0);
    expect(typeCounts.recall ?? 0).toBeGreaterThan(0);
    expect(typeCounts.visualization ?? 0).toBeGreaterThan(0);
    expect(typeCounts.reconstruction ?? 0).toBeGreaterThan(0);
  });
});
