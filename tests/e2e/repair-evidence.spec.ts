import { test, expect, OUT } from "../fixtures";
import { writeFile, unlink, readFile, mkdir } from "fs/promises";
import { join } from "path";

const LOST_GAME_ID = "griff843_vs_Dinernur_2026.03.11";
const NOT_LOST_GAME_ID = "game1";
const SCREENSHOT_DIR = join(__dirname, "..", "..", "out", "audit-screenshots");

test.describe("Repair Evidence — UI Audit", () => {
  // ── 1. Evidence section appears in coaching review ────────────────

  test("evidence section renders in coaching review for lost game", async ({ page }) => {
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Unified coaching review sections
    await expect(page.getByText("Primary Cause")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Primary Training Target")).toBeVisible();
    await expect(page.getByText("Pattern History")).toBeVisible();

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "11-evidence-full-flow.png"),
      fullPage: true,
    });
  });

  // ── 2. Evidence status badge is readable ────────────────────────────

  test("evidence status badge is visible and styled", async ({ page }) => {
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Pattern History label
    await expect(page.getByText("Pattern History")).toBeVisible({ timeout: 5_000 });

    // With only 1 lost game (itself excluded), status should be "First Occurrence"
    const badge = page.getByText("First Occurrence");
    await expect(badge).toBeVisible();
  });

  // ── 3. Rationale is understandable and not overstated ───────────────

  test("explanation text is clear and appropriate for isolated status", async ({ page }) => {
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Should say this is the first time for the target
    const explanation = page.getByText(/first time.*tactical pattern recognition/);
    await expect(explanation).toBeVisible({ timeout: 5_000 });
  });

  // ── 4. Emerging status with synthetic history ───────────────────────

  test("emerging status renders when prior match exists", async ({ page }) => {
    // Create a synthetic second game diagnosis that also has tactical_blunder
    const syntheticGameId = "synthetic_emerging_test";
    const syntheticDir = join(OUT, "games", syntheticGameId);
    await mkdir(syntheticDir, { recursive: true });

    const syntheticDiagnosis = {
      gameId: syntheticGameId,
      heroColor: "white",
      gameLost: true,
      primaryCategory: "tactical_blunder",
      losingMove: {
        positionId: `${syntheticGameId}:10`,
        ply: 10,
        moveSan: "e5",
        fen: "",
        phase: "middlegame",
        label: "blunder",
        evalBefore: 100,
        evalAfter: -200,
        swingCp: 300,
      },
      contributingFactors: [],
      explanation: "Synthetic test game.",
      finalEvalCp: -300,
      totalCpLoss: 500,
      mistakeCount: 1,
      blunderCount: 1,
      diagnosedAt: "2026-03-13T12:00:00.000Z",
    };

    try {
      await writeFile(
        join(syntheticDir, "diagnosis.json"),
        JSON.stringify(syntheticDiagnosis, null, 2),
        "utf-8"
      );

      // Also needs a training-dataset.json for the page to load
      await writeFile(
        join(syntheticDir, "training-dataset.json"),
        JSON.stringify({ gameId: syntheticGameId, rowCount: 10, createdAt: "2026-03-13T12:00:00.000Z" }),
        "utf-8"
      );

      // Now visit the lost game — it should see the synthetic game as a prior match
      await page.goto(`/games/${LOST_GAME_ID}`);
      await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

      // With 1 prior lost game matching the same target → emerging
      await expect(page.getByText("Emerging Pattern")).toBeVisible({ timeout: 5_000 });

      // Stats should show occurrence count
      await expect(page.getByText(/Seen in/).first()).toBeVisible();

      await page.screenshot({
        path: join(SCREENSHOT_DIR, "12-evidence-emerging.png"),
        fullPage: true,
      });
    } finally {
      // Cleanup synthetic game
      try {
        await unlink(join(syntheticDir, "diagnosis.json"));
        await unlink(join(syntheticDir, "training-dataset.json"));
        const { rmdir } = await import("fs/promises");
        await rmdir(syntheticDir);
      } catch {
        // Best effort cleanup
      }
    }
  });

  // ── 5. No-loss game shows no evidence section ─────────────────────

  test("no-loss game does not show evidence section", async ({ page }) => {
    await page.goto(`/games/${NOT_LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Should show "No Critical Errors Found"
    await expect(page.getByText("No Critical Errors Found")).toBeVisible({ timeout: 5_000 });

    // Evidence should NOT be visible
    await expect(page.getByText("Pattern History")).not.toBeVisible();
  });

  // ── 6. Empty state (no diagnosis) remains intact ────────────────────

  test("game without diagnosis shows generate button, no evidence section", async ({ page }) => {
    const diagPath = join(OUT, "games", LOST_GAME_ID, "diagnosis.json");
    const backup = await readFile(diagPath, "utf-8");

    try {
      await unlink(diagPath);

      await page.goto(`/games/${LOST_GAME_ID}`);
      await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

      const diagnoseBtn = page.getByRole("button", { name: /Diagnose Game/ });
      await expect(diagnoseBtn).toBeVisible({ timeout: 5_000 });

      await expect(page.getByText("Pattern History")).not.toBeVisible();
    } finally {
      await writeFile(diagPath, backup, "utf-8");
    }
  });

  // ── 7. Game not found state intact ──────────────────────────────────

  test("nonexistent game shows empty state, no evidence section", async ({ page }) => {
    await page.goto("/games/nonexistent-game-id");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText("Game not found")).toBeVisible();
    await expect(page.getByText("Pattern History")).not.toBeVisible();
  });

  // ── 8. Full coaching flow is coherent ───────────────────────────────

  test("unified coaching review reads as coherent flow", async ({ page }) => {
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Unified sections in sequence
    await expect(page.getByText("Primary Cause")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Primary Training Target")).toBeVisible();
    await expect(page.getByText("Pattern History")).toBeVisible();

    // Diagnosis: tactical blunder
    await expect(page.getByText("Tactical Blunder").first()).toBeVisible();

    // Repair target: tactical pattern recognition
    await expect(page.getByText("Tactical Pattern Recognition").first()).toBeVisible();

    // Evidence: isolated (first occurrence of this target)
    await expect(page.getByText("First Occurrence")).toBeVisible();

    // CTA: Train This Weakness
    await expect(page.getByRole("button", { name: /Train This Weakness/ })).toBeVisible();

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "13-evidence-coaching-flow.png"),
      fullPage: true,
    });
  });

  // ── 9. No layout overflow on desktop ────────────────────────────────

  test("no layout overflow or breakage at 1280px", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText("Pattern History")).toBeVisible({ timeout: 5_000 });

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(1280);

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "14-evidence-desktop-1280.png"),
      fullPage: true,
    });
  });
});
