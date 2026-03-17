import { mkdir } from "fs/promises";
import { join } from "path";
import { test, expect } from "./fixtures";

type ExerciseView = {
  exerciseId: string;
  fen: string;
  sideToMove: string;
  lessonCategory: string;
  difficultyEstimate: string;
  playedMoveSan: string;
  bestMoveSan?: string;
  exerciseType: string;
};

const SCREENSHOT_DIR = join(process.cwd(), "out", "screenshots", "product-audit");
const TACTICAL_CANDIDATES = [
  "session-33cecce1",
  "session-7a601d52",
  "session-cd9104a0",
  "session-35a7722b",
];

async function capture(page: Parameters<typeof test>[0]["page"], name: string) {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: join(SCREENSHOT_DIR, name), fullPage: true });
}

test.describe("Product audit", () => {
  test("dashboard is stable and explains the workflow", async ({ page }) => {
    const consoleIssues: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        consoleIssues.push(msg.text());
      }
    });
    page.on("pageerror", (error) => pageErrors.push(String(error)));

    await page.goto("/");
    await expect(page.locator("h1")).toHaveText(/Dashboard|Welcome to Chess OS/);
    await expect(page.locator("text=Games to Training")).toBeVisible();
    await expect(page.locator("text=Open Import & Analyze").first()).toBeVisible();
    await expect(page.locator("text=Import and analyze PGNs")).toBeVisible();

    expect(
      consoleIssues.filter((text) => /same key|unique key|Encountered two children/i.test(text))
    ).toEqual([]);
    expect(pageErrors).toEqual([]);

    await capture(page, "dashboard.png");
  });

  test("sessions flow can launch a study page and complete a deterministic pending session", async ({ page, api }) => {
    let chosenSessionId: string | null = null;
    let exercises: ExerciseView[] = [];

    for (const sessionId of TACTICAL_CANDIDATES) {
      const payload = (await api.call("loadSessionData", { sessionId })) as {
        exercises: ExerciseView[];
        error: string | null;
      };
      if (!payload.error && payload.exercises.length > 0 && payload.exercises.every((ex) => ex.exerciseType === "tactical" && !!ex.bestMoveSan)) {
        chosenSessionId = sessionId;
        exercises = payload.exercises;
        break;
      }
    }

    expect(chosenSessionId).not.toBeNull();

    await page.goto("/sessions");
    await expect(page.locator("h1")).toHaveText("Study Sessions");

    await page.goto(`/study/${chosenSessionId}`);
    await expect(page).toHaveURL(new RegExp(`/study/${chosenSessionId}$`));
    await expect(page.locator("text=Click or drag a piece to make your move")).toBeVisible();
    await capture(page, "study-launch.png");

    const startedAt = new Date().toISOString();
    const rawAttempts: Array<{
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
    }> = [];

    for (const [exerciseIndex, exercise] of exercises.entries()) {
      const result = (await api.call("submitMove", {
        sessionId: chosenSessionId,
        exerciseIndex,
        moveInput: exercise.bestMoveSan,
      })) as {
        valid: boolean;
        error: string | null;
        attempt: null | {
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

      expect(result.valid).toBe(true);
      expect(result.attempt).not.toBeNull();

      rawAttempts.push({
        exerciseId: result.attempt!.exerciseId,
        exerciseIndex: result.attempt!.exerciseIndex,
        fen: exercise.fen,
        sideToMove: exercise.sideToMove,
        lessonCategory: exercise.lessonCategory,
        difficultyEstimate: exercise.difficultyEstimate,
        playedMoveSan: exercise.playedMoveSan,
        userMove: result.attempt!.userMove,
        userMoveUci: result.attempt!.userMoveUci,
        engineMove: result.attempt!.engineMove,
        engineMoveUci: result.attempt!.engineMoveUci,
        isCorrect: result.attempt!.isCorrect,
        gradingTier: result.attempt!.gradingTier,
        evalLossCp: result.attempt!.evalLossCp,
        timestamp: new Date().toISOString(),
      });
    }

    const completion = (await api.call("completeSession", {
      sessionId: chosenSessionId,
      rawAttempts,
      startedAt,
    })) as {
      sessionId: string;
      accuracy: number;
      totalExercises: number;
    };

    expect(completion.sessionId).toBe(chosenSessionId);
    expect(completion.totalExercises).toBe(exercises.length);
    expect(completion.accuracy).toBeGreaterThan(0.9);

    await page.goto(`/sessions/${chosenSessionId}`);
    await expect(page.getByText("Completed", { exact: true })).toBeVisible();
    await expect(page.locator("text=Accuracy")).toBeVisible();
    await capture(page, "session-detail-complete.png");
  });

  test("coach, curriculum, review, and settings remain readable", async ({ page }) => {
    const routes = [
      { path: "/coach", heading: "Coach", screenshot: "coach.png" },
      { path: "/curriculum", heading: "Curriculum", screenshot: "curriculum.png" },
      { path: "/review", heading: "Review Queue", screenshot: "review.png" },
      { path: "/settings", heading: "Settings", screenshot: "settings.png" },
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.locator("h1")).toHaveText(route.heading);
      await capture(page, route.screenshot);
    }

    await expect(page.locator("text=Games to Training")).toBeVisible();
    await expect(page.locator("text=Import & Analyze").first()).toBeVisible();
    await expect(page.locator("text=data/pgn")).toBeVisible();
  });
});
