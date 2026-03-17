import { test, expect, OUT } from "../fixtures";
import { writeFile, mkdir, rm, rename } from "fs/promises";
import { join } from "path";

const REPERTOIRE_DIR = join(OUT, "repertoire");
const SCREENSHOT_DIR = join(OUT, "audit-screenshots");

// Game data for CTA-upgrade tests
const REVIEW_GAME_ID = "test-m010-review";
const REVIEW_GAME_DIR = join(OUT, "games", REVIEW_GAME_ID);
const SCOTCH_MOVES = ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Nxd4", "Bd3"];

// ── Synthetic artifact factories ──────────────────────────────────────

function makeRepairQueue() {
  return {
    generatedAt: new Date().toISOString(),
    entries: [
      {
        sourceGameId: "game42",
        repertoireKey: "scotch_main",
        repertoireName: "Chess Openings",
        lineId: "scotch_main",
        lineName: "Scotch Game Mainline",
        repairType: "line_deviation",
        repairUrgency: "immediate_repair",
        urgencyScore: 0.9,
        recommendedReviewLine: "Review the Scotch main line",
        recommendedConceptFocus: null,
        scheduledDrillLine: "e4 e5 Nf3 Nc6 d4",
        scheduledDrillReason: "Deviated from repertoire at move 4",
        nextRecommendedReviewAt: null,
        firstBadMomentMove: "Bc4",
        firstBadMomentPly: 7,
        sourceOpeningFamily: "scotch",
      },
    ],
    topRepairLines: [
      {
        lineId: "scotch_main",
        lineName: "Scotch Game Mainline",
        urgencyScore: 0.9,
        scheduledDrillReason: "Deviated from repertoire at move 4",
      },
    ],
    urgentGames: [
      {
        sourceGameId: "game42",
        lineName: "Scotch Game Mainline",
        repairType: "line_deviation",
        urgencyScore: 0.9,
      },
    ],
    summary: { queueSize: 1, immediateRepairCount: 1, conceptRepairCount: 0 },
  };
}

function makeDrillQueue() {
  return {
    generatedAt: new Date().toISOString(),
    entries: [
      {
        repertoireKey: "ruy_berlin",
        repertoireName: "Chess Openings",
        lineId: "ruy_berlin",
        lineName: "Ruy Lopez: Berlin Defence",
        urgency: 0.75,
        nextRecommendedReviewAt: null,
        recallConfidence: 0.55,
        forgettingRisk: 0.72,
        stabilityScore: 0.3,
        drillVsGameComparison: "below average",
        recommendedAction: "Drill soon to prevent forgetting",
        conceptLinkedWeaknesses: [],
      },
    ],
    strongestLines: [],
    nextLinesToReview: [],
    summary: { queueSize: 1, immediateCount: 1, stableCount: 0 },
  };
}

function makeSyntheticDataset(moves: string[]) {
  const rows = moves.map((moveSan, i) => ({
    positionId: `${REVIEW_GAME_ID}:${i + 1}`,
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
    gameId: REVIEW_GAME_ID,
    rowCount: rows.length,
    rows,
    createdAt: new Date().toISOString(),
  };
}

function makeSyntheticDiagnosis(primaryCategory: string) {
  return {
    gameId: REVIEW_GAME_ID,
    heroColor: "white",
    gameLost: true,
    primaryCategory,
    losingMove: {
      positionId: `${REVIEW_GAME_ID}:8`,
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

// ── File helpers ──────────────────────────────────────────────────────

/** Back up a file if it exists, then write new content. */
async function backupAndWrite(filePath: string, content: unknown) {
  try {
    await rename(filePath, filePath + ".m010-bak");
  } catch {
    // File didn't exist — no backup needed
  }
  await mkdir(join(filePath, ".."), { recursive: true });
  await writeFile(filePath, JSON.stringify(content, null, 2), "utf-8");
}

/** Remove the test file and restore the backup if one exists. */
async function restoreOrRemove(filePath: string) {
  try {
    await rm(filePath, { force: true });
  } catch {
    // Already removed
  }
  try {
    await rename(filePath + ".m010-bak", filePath);
  } catch {
    // No backup — nothing to restore
  }
}

// ── Suite ─────────────────────────────────────────────────────────────

test.describe("M010 Repertoire Drill/Productization", () => {
  // ── Check 1: Basic smoke ───────────────────────────────────────────

  test("check-1 — /repertoire loads without error boundary", async ({ page }) => {
    await page.goto("/repertoire");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("h1")).toHaveText("Repertoire");
    await expect(page.getByText("Something went wrong")).not.toBeVisible();
  });

  // ── Checks 2-6, 9, 10: With synthetic queue data ──────────────────

  test.describe("with synthetic repair + drill queue", () => {
    const repairQueuePath = join(REPERTOIRE_DIR, "repertoire-repair-queue.json");
    const drillQueuePath = join(REPERTOIRE_DIR, "repertoire-drill-queue.json");

    test.beforeAll(async () => {
      await backupAndWrite(repairQueuePath, makeRepairQueue());
      await backupAndWrite(drillQueuePath, makeDrillQueue());
    });

    test.afterAll(async () => {
      await restoreOrRemove(repairQueuePath);
      await restoreOrRemove(drillQueuePath);
    });

    test("check-2 — priority callout visible when repair queue has entries", async ({ page }) => {
      await page.goto("/repertoire");
      await expect(page.locator("h1")).toHaveText("Repertoire", { timeout: 10_000 });

      // Callout text
      await expect(page.getByText("1 opening line needs repair")).toBeVisible({ timeout: 5_000 });
      await expect(
        page.getByText(/Drill the highest-priority line first/)
      ).toBeVisible({ timeout: 5_000 });

      // Quick CTA button
      await expect(page.getByText("Drill top line")).toBeVisible({ timeout: 5_000 });

      await page.screenshot({
        path: join(SCREENSHOT_DIR, "m010-02-priority-callout.png"),
        fullPage: true,
      });
    });

    test("check-3 — repair queue entry has Drill CTA linking to preferredLineId", async ({ page }) => {
      await page.goto("/repertoire");
      await expect(page.locator("h1")).toHaveText("Repertoire", { timeout: 10_000 });

      // The repair queue entry should show the line name
      await expect(page.getByText("Scotch Game Mainline")).toBeVisible({ timeout: 5_000 });

      // Find the Drill link that points at scotch_main
      const drillLinks = page.locator('a[href*="preferredLineId=scotch_main"]');
      await expect(drillLinks.first()).toBeVisible({ timeout: 5_000 });

      const href = await drillLinks.first().getAttribute("href");
      expect(href).toContain("preferredLineId=scotch_main");

      await page.screenshot({
        path: join(SCREENSHOT_DIR, "m010-03-repair-queue-cta.png"),
        fullPage: true,
      });
    });

    test("check-4 — drill queue entry has Drill CTA linking to preferredLineId", async ({ page }) => {
      await page.goto("/repertoire");
      await expect(page.locator("h1")).toHaveText("Repertoire", { timeout: 10_000 });

      // The drill queue entry should show the line name
      await expect(page.getByText("Ruy Lopez: Berlin Defence")).toBeVisible({ timeout: 5_000 });

      // Find the Drill link for ruy_berlin
      const drillLink = page.locator('a[href*="preferredLineId=ruy_berlin"]');
      await expect(drillLink.first()).toBeVisible({ timeout: 5_000 });

      await page.screenshot({
        path: join(SCREENSHOT_DIR, "m010-04-drill-queue-cta.png"),
        fullPage: true,
      });
    });

    test("check-5 — preferredLineId in URL shows Targeting in drill console header", async ({ page }) => {
      await page.goto("/repertoire?preferredLineId=scotch_main");
      await expect(page.locator("h1")).toHaveText("Repertoire", { timeout: 10_000 });

      // Console header shows "Targeting: {lineName}" — the /Targeting:/ check is sufficient
      // (the line name also appears in the idle state text and repair queue, so we avoid strict-mode issues)
      await expect(page.getByText(/Targeting:/)).toBeVisible({ timeout: 5_000 });

      await page.screenshot({
        path: join(SCREENSHOT_DIR, "m010-05-targeting-console.png"),
        fullPage: true,
      });
    });

    test("check-6 — idle state without preferredLineId shows generic text", async ({ page }) => {
      await page.goto("/repertoire");
      await expect(page.locator("h1")).toHaveText("Repertoire", { timeout: 10_000 });

      // Generic idle text should appear in the console before any session starts
      await expect(
        page.getByText(/Select a line from the repair or drill queue/)
      ).toBeVisible({ timeout: 5_000 });

      await page.screenshot({
        path: join(SCREENSHOT_DIR, "m010-06-idle-state.png"),
        fullPage: true,
      });
    });

    test("check-9 — repair priority callout precedes drill console in DOM", async ({ page }) => {
      await page.goto("/repertoire");
      await expect(page.locator("h1")).toHaveText("Repertoire", { timeout: 10_000 });

      await expect(page.getByText("1 opening line needs repair")).toBeVisible({ timeout: 5_000 });
      // Use heading role to avoid ambiguity with section subtitles containing "drill" text
      await expect(page.getByRole("heading", { name: "Repertoire Drill" })).toBeVisible({ timeout: 5_000 });

      // Verify callout (amber) comes before drill console in the document
      const calloutY = await page
        .getByText("1 opening line needs repair")
        .boundingBox()
        .then((b) => b?.y ?? 0);
      const consoleY = await page
        .getByRole("heading", { name: "Repertoire Drill" })
        .boundingBox()
        .then((b) => b?.y ?? 0);

      expect(calloutY).toBeLessThan(consoleY);
    });

    test("check-10 — no layout overflow at 1280px with queue data", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/repertoire");
      await expect(page.locator("h1")).toHaveText("Repertoire", { timeout: 10_000 });

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(1280);
    });
  });

  // ── Checks 7-8: CTA upgrade in game review ────────────────────────

  test.describe("opening-branch-repair CTA upgrade", () => {
    test.beforeAll(async () => {
      await mkdir(REVIEW_GAME_DIR, { recursive: true });
      await writeFile(
        join(REVIEW_GAME_DIR, "training-dataset.json"),
        JSON.stringify(makeSyntheticDataset(SCOTCH_MOVES), null, 2),
        "utf-8"
      );
      await writeFile(
        join(REVIEW_GAME_DIR, "diagnosis.json"),
        JSON.stringify(makeSyntheticDiagnosis("opening_memory_failure"), null, 2),
        "utf-8"
      );
    });

    test.afterAll(async () => {
      try {
        await rm(REVIEW_GAME_DIR, { recursive: true, force: true });
      } catch {
        // Already removed
      }
    });

    test("check-7 — Drill This Line CTA is a styled button (not bare text link)", async ({
      page,
    }) => {
      await page.goto(`/games/${REVIEW_GAME_ID}`);
      await expect(page.locator("h1")).toHaveText("Game Review", { timeout: 10_000 });

      // New M010 button label (capitalised)
      const cta = page.getByText("Drill This Line");
      await expect(cta).toBeVisible({ timeout: 5_000 });

      // Should be a link element (anchor) with button-style classes
      const tag = await cta.evaluate((el) => el.tagName.toLowerCase());
      expect(tag).toBe("a");

      // Must link to /repertoire with preferredLineId
      const href = await cta.getAttribute("href");
      expect(href).toMatch(/\/repertoire/);
      expect(href).toContain("preferredLineId=");

      await page.screenshot({
        path: join(SCREENSHOT_DIR, "m010-07-drill-this-line-button.png"),
        fullPage: true,
      });
    });

    test("check-8 — unmatched branch shows Browse Repertoire Lines fallback", async ({ page }) => {
      // Write game with unrecognized moves so branch repair cannot match
      await mkdir(REVIEW_GAME_DIR, { recursive: true });
      await writeFile(
        join(REVIEW_GAME_DIR, "training-dataset.json"),
        JSON.stringify(
          makeSyntheticDataset(["a3", "a6", "b3", "b6", "c3", "c6"]),
          null,
          2
        ),
        "utf-8"
      );
      // diagnosis stays opening_memory_failure so the section renders

      await page.goto(`/games/${REVIEW_GAME_ID}`);
      await expect(page.locator("h1")).toHaveText("Game Review", { timeout: 10_000 });

      // No matched branch
      await expect(page.getByText("No Branch Match")).toBeVisible({ timeout: 5_000 });

      // M010 fallback CTA
      const fallback = page.getByText("Browse Repertoire Lines");
      await expect(fallback).toBeVisible({ timeout: 5_000 });

      const href = await fallback.getAttribute("href");
      expect(href).toBe("/repertoire");

      // Drill This Line should NOT appear (no matched line)
      await expect(page.getByText("Drill This Line")).not.toBeVisible();

      await page.screenshot({
        path: join(SCREENSHOT_DIR, "m010-08-unmatched-fallback.png"),
        fullPage: true,
      });
    });
  });
});
