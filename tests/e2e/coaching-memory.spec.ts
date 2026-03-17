/**
 * E2E tests for M006: Cross-Game Coaching Memory / Pattern Persistence v1.
 *
 * Validates that coaching memory renders correctly on the game review page
 * with different persistence states.
 */

import { test, expect, OUT } from "../fixtures";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

const TEST_GAME_ID = "test-coaching-memory";
const TEST_GAME_DIR = join(OUT, "games", TEST_GAME_ID);

// ── Synthetic data helpers ────────────────────────────────────────────

function makeSyntheticDataset() {
  const moves = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5", "d5"];
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
  return {
    gameId: TEST_GAME_ID,
    rowCount: rows.length,
    rows,
    createdAt: new Date().toISOString(),
  };
}

function makeSyntheticDiagnosis() {
  return {
    gameId: TEST_GAME_ID,
    heroColor: "white",
    gameLost: true,
    primaryCategory: "tactical_blunder",
    losingMove: {
      positionId: `${TEST_GAME_ID}:7`,
      ply: 7,
      moveSan: "Ng5",
      fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
      phase: "middlegame",
      label: "blunder",
      evalBefore: 30,
      evalAfter: -280,
      swingCp: 310,
    },
    contributingFactors: [],
    explanation: "A tactical blunder in the middlegame cost material.",
    finalEvalCp: -400,
    totalCpLoss: 480,
    mistakeCount: 1,
    blunderCount: 1,
    diagnosedAt: new Date().toISOString(),
  };
}

// ── Setup / Teardown ──────────────────────────────────────────────────

async function writeSyntheticGame() {
  await mkdir(TEST_GAME_DIR, { recursive: true });
  await writeFile(
    join(TEST_GAME_DIR, "training-dataset.json"),
    JSON.stringify(makeSyntheticDataset(), null, 2),
    "utf-8"
  );
  await writeFile(
    join(TEST_GAME_DIR, "diagnosis.json"),
    JSON.stringify(makeSyntheticDiagnosis(), null, 2),
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

// ── Tests ─────────────────────────────────────────────────────────────

test.describe("M006 Coaching Memory", () => {
  test.describe("first occurrence — single game, no prior diagnoses", () => {
    test.beforeAll(async () => {
      await writeSyntheticGame();
    });

    test.afterAll(async () => {
      await cleanupSyntheticGame();
    });

    test("game review page loads with coaching memory", async ({ page }) => {
      await page.goto(`/games/${TEST_GAME_ID}`);
      await expect(page.locator("h1")).toHaveText("Game Review", { timeout: 10_000 });
      await expect(page.getByText("Something went wrong")).not.toBeVisible();
    });

    test("shows coaching memory persistence badge", async ({ page }) => {
      await page.goto(`/games/${TEST_GAME_ID}`);
      await expect(page.locator("h1")).toHaveText("Game Review", { timeout: 10_000 });

      // The coaching memory should show a persistence state badge
      // Exact state depends on whether other game data exists in the test environment
      const badge = page.getByText(/First Occurrence|Emerging Pattern|Recurring/);
      await expect(badge.first()).toBeVisible({ timeout: 5_000 });
    });

    test("coaching review renders coherently with memory", async ({ page }) => {
      await page.goto(`/games/${TEST_GAME_ID}`);
      await expect(page.locator("h1")).toHaveText("Game Review", { timeout: 10_000 });

      // Verify the diagnosis badge is present
      await expect(page.getByText("Tactical Blunder").first()).toBeVisible({ timeout: 5_000 });

      // Verify the Train This Weakness CTA is present
      await expect(page.getByRole("button", { name: /targeted training session/ })).toBeVisible();
    });

    test("layout does not overflow at 1280px", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`/games/${TEST_GAME_ID}`);
      await expect(page.locator("h1")).toHaveText("Game Review", { timeout: 10_000 });

      // Verify no horizontal scrollbar
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // 1px tolerance
    });
  });
});
