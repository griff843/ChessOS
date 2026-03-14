import { test, expect, OUT } from "../fixtures";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

const TEST_GAME_ID = "test-opening-branch-repair";
const TEST_GAME_DIR = join(OUT, "games", TEST_GAME_ID);
const SCREENSHOT_DIR = join(OUT, "audit-screenshots");

// ── Synthetic scotch game data ────────────────────────────────────────

// scotch_main canonical: ["e4","e5","Nf3","Nc6","d4","exd4","Nxd4"]
// The game follows these moves then deviates at move 8 (ply 14) with Bd3
const SCOTCH_MOVES = ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Nxd4", "Bd3"];

function makeSyntheticDataset(moves: string[]) {
  const rows = moves.map((moveSan, i) => ({
    positionId: `${TEST_GAME_ID}:${i + 1}`,
    moveSan,
    evalCp: 20 - i * 15,
    swingCp: 30,
    phase: i < 12 ? "opening" : "middlegame",
    moverIsBlack: i % 2 === 1,
    isMistake: false,
    isBlunder: false,
    label: "acceptable",
  }));
  // Real training-dataset.json format: { gameId, rowCount, rows, createdAt }
  return {
    gameId: TEST_GAME_ID,
    rowCount: rows.length,
    rows,
    createdAt: new Date().toISOString(),
  };
}

function makeSyntheticDiagnosis(primaryCategory: string) {
  return {
    gameId: TEST_GAME_ID,
    heroColor: "white",
    gameLost: true,
    primaryCategory,
    losingMove: {
      positionId: `${TEST_GAME_ID}:8`,
      ply: 8,
      moveSan: "Bd3",
      fen: "r1bqkb1r/pppp1ppp/2n2n2/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq - 1 5",
      phase: "opening",
      label: "blunder",
      evalBefore: 25,
      evalAfter: -310,
      swingCp: 335,
    },
    contributingFactors: [],
    explanation: "A critical opening deviation caused the loss.",
    finalEvalCp: -420,
    totalCpLoss: 520,
    mistakeCount: 2,
    blunderCount: 1,
    diagnosedAt: new Date().toISOString(),
  };
}

// ── Setup / Teardown ──────────────────────────────────────────────────

async function writeSyntheticGame(moves: string[], category: string) {
  await mkdir(TEST_GAME_DIR, { recursive: true });
  await writeFile(
    join(TEST_GAME_DIR, "training-dataset.json"),
    JSON.stringify(makeSyntheticDataset(moves), null, 2),
    "utf-8"
  );
  await writeFile(
    join(TEST_GAME_DIR, "diagnosis.json"),
    JSON.stringify(makeSyntheticDiagnosis(category), null, 2),
    "utf-8"
  );
}

async function cleanupSyntheticGame() {
  try {
    await rm(TEST_GAME_DIR, { recursive: true, force: true });
  } catch {
    // Already removed — safe to ignore
  }
}

test.describe("M004 Opening Branch Repair", () => {
  // ── 1. Smoke: pages render without error ────────────────────────────

  test("smoke — /games renders without error boundary", async ({ page }) => {
    await page.goto("/games");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("h1")).toHaveText("Games");
    await expect(page.getByText("Something went wrong")).not.toBeVisible();
  });

  test("smoke — /import renders without error boundary", async ({ page }) => {
    await page.goto("/import");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("h1")).toHaveText("Import & Analyze");
    await expect(page.getByText("Something went wrong")).not.toBeVisible();
  });

  // ── 2. Opening memory failure shows Repertoire Branch section ────────

  test.describe("opening_memory_failure — scotch game", () => {
    test.beforeAll(async () => {
      await writeSyntheticGame(SCOTCH_MOVES, "opening_memory_failure");
    });

    test.afterAll(async () => {
      await cleanupSyntheticGame();
    });

    test("game review page loads for opening diagnosis", async ({ page }) => {
      await page.goto(`/games/${TEST_GAME_ID}`);
      await expect(page.locator("h1")).toHaveText("Game Review", { timeout: 10_000 });
      await expect(page.getByText("Something went wrong")).not.toBeVisible();
    });

    test("Repertoire Branch section is visible for opening memory failure", async ({ page }) => {
      await page.goto(`/games/${TEST_GAME_ID}`);
      await expect(page.locator("h1")).toHaveText("Game Review", { timeout: 10_000 });

      // Section header
      const branchLabel = page.getByText("Repertoire Branch");
      await expect(branchLabel).toBeVisible({ timeout: 5_000 });

      await page.screenshot({
        path: join(SCREENSHOT_DIR, "m004-01-opening-branch-matched.png"),
        fullPage: true,
      });
    });

    test("branch repair shows the matched line name", async ({ page }) => {
      await page.goto(`/games/${TEST_GAME_ID}`);
      await expect(page.locator("h1")).toHaveText("Game Review", { timeout: 10_000 });

      // Scotch Game Mainline should be identified (exact match avoids substring in explanation)
      const lineName = page.getByText("Scotch Game Mainline", { exact: true });
      await expect(lineName).toBeVisible({ timeout: 5_000 });
    });

    test("branch repair shows Strong Match confidence badge", async ({ page }) => {
      await page.goto(`/games/${TEST_GAME_ID}`);
      await expect(page.locator("h1")).toHaveText("Game Review", { timeout: 10_000 });

      // 7 moves matched → high confidence
      const badge = page.getByText("Strong Match");
      await expect(badge).toBeVisible({ timeout: 5_000 });
    });

    test("branch repair shows Drill this line link to /repertoire", async ({ page }) => {
      await page.goto(`/games/${TEST_GAME_ID}`);
      await expect(page.locator("h1")).toHaveText("Game Review", { timeout: 10_000 });

      const drillLink = page.getByText("Drill this line");
      await expect(drillLink).toBeVisible({ timeout: 5_000 });

      const href = await drillLink.getAttribute("href");
      expect(href).toMatch(/\/repertoire/);
      expect(href).toContain("preferredLineId=scotch_main");
    });

    test("branch repair shows 'followed the line' when all canonical moves matched", async ({ page }) => {
      await page.goto(`/games/${TEST_GAME_ID}`);
      await expect(page.locator("h1")).toHaveText("Game Review", { timeout: 10_000 });

      // SCOTCH_MOVES plays all 7 canonical moves → exactMatch=true → firstDeviationPly=null
      // The deviation at move 8 (Bd3) is beyond the modelled depth, so the component
      // shows the success state: "Followed the seeded line through its full modelled depth"
      await expect(
        page.getByText(/Followed the seeded line/)
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  // ── 3. Opening concept failure also shows section ────────────────────

  test.describe("opening_concept_failure — scotch game", () => {
    test.beforeAll(async () => {
      await writeSyntheticGame(SCOTCH_MOVES, "opening_concept_failure");
    });

    test.afterAll(async () => {
      await cleanupSyntheticGame();
    });

    test("Repertoire Branch section appears for opening concept failure", async ({ page }) => {
      await page.goto(`/games/${TEST_GAME_ID}`);
      await expect(page.locator("h1")).toHaveText("Game Review", { timeout: 10_000 });

      const branchLabel = page.getByText("Repertoire Branch");
      await expect(branchLabel).toBeVisible({ timeout: 5_000 });
    });

    test("concept failure shows 'Review the concepts' repair mode", async ({ page }) => {
      await page.goto(`/games/${TEST_GAME_ID}`);
      await expect(page.locator("h1")).toHaveText("Game Review", { timeout: 10_000 });

      await expect(page.getByText("Review the concepts")).toBeVisible({ timeout: 5_000 });

      await page.screenshot({
        path: join(SCREENSHOT_DIR, "m004-02-opening-concept-failure.png"),
        fullPage: true,
      });
    });
  });

  // ── 4. Non-opening diagnosis — section absent ────────────────────────

  test.describe("tactical_blunder — no branch repair section", () => {
    test.beforeAll(async () => {
      await writeSyntheticGame(SCOTCH_MOVES, "tactical_blunder");
    });

    test.afterAll(async () => {
      await cleanupSyntheticGame();
    });

    test("Repertoire Branch section is absent for non-opening diagnosis", async ({ page }) => {
      await page.goto(`/games/${TEST_GAME_ID}`);
      await expect(page.locator("h1")).toHaveText("Game Review", { timeout: 10_000 });
      await expect(page.locator("h1")).toBeVisible();

      // Section must not appear
      await expect(page.getByText("Repertoire Branch")).not.toBeVisible();

      await page.screenshot({
        path: join(SCREENSHOT_DIR, "m004-03-non-opening-no-branch.png"),
        fullPage: true,
      });
    });
  });

  // ── 5. Unrecognized moves — graceful fallback ────────────────────────

  test.describe("opening_memory_failure — unrecognized moves", () => {
    test.beforeAll(async () => {
      await writeSyntheticGame(["a3", "a6", "b3", "b6", "c3", "c6"], "opening_memory_failure");
    });

    test.afterAll(async () => {
      await cleanupSyntheticGame();
    });

    test("graceful fallback: section shows No Branch Match badge", async ({ page }) => {
      await page.goto(`/games/${TEST_GAME_ID}`);
      await expect(page.locator("h1")).toHaveText("Game Review", { timeout: 10_000 });

      // Section appears but with no-match state
      await expect(page.getByText("Repertoire Branch")).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText("No Branch Match")).toBeVisible({ timeout: 5_000 });

      // No drill link (no matched line)
      await expect(page.getByText("Drill this line")).not.toBeVisible();

      await page.screenshot({
        path: join(SCREENSHOT_DIR, "m004-04-graceful-fallback.png"),
        fullPage: true,
      });
    });
  });

  // ── 6. No layout overflow ────────────────────────────────────────────

  test.describe("layout at 1280px — opening diagnosis", () => {
    test.beforeAll(async () => {
      await writeSyntheticGame(SCOTCH_MOVES, "opening_memory_failure");
    });

    test.afterAll(async () => {
      await cleanupSyntheticGame();
    });

    test("no layout overflow at 1280px with branch repair section visible", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`/games/${TEST_GAME_ID}`);
      await expect(page.locator("h1")).toHaveText("Game Review", { timeout: 10_000 });

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(1280);
    });
  });
});
