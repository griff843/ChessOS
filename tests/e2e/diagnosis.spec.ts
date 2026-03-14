import { test, expect, OUT } from "../fixtures";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";

const LOST_GAME_ID = "griff843_vs_Dinernur_2026.03.11";
const NOT_LOST_GAME_ID = "game1";
const SCREENSHOT_DIR = join(__dirname, "..", "..", "out", "audit-screenshots");

test.describe("Game Review — Coaching Review UI Audit", () => {
  // ── 1. Route loads successfully ───────────────────────────────────

  test("game review route loads with 200 for existing game", async ({ page }) => {
    const res = await page.goto(`/games/${LOST_GAME_ID}`);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("h1")).toHaveText("Game Review");
  });

  // ── 2. Unified coaching review visible for reviewed lost game ─────

  test("coaching review renders for a lost game", async ({ page }) => {
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Category badge visible (part of unified review)
    const categoryBadge = page.getByText("Tactical Blunder").first();
    await expect(categoryBadge).toBeVisible({ timeout: 5_000 });

    // Explanation text
    const explanation = page.getByText(/tactical oversight/);
    await expect(explanation).toBeVisible();

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "01-diagnosis-lost-game-full.png"),
      fullPage: true,
    });
  });

  // ── 3. Primary diagnosis label readable and clear ─────────────────

  test("primary diagnosis badge is readable", async ({ page }) => {
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Category badge appears at least once (primary + potentially contributing factors)
    const badges = page.getByText("Tactical Blunder");
    await expect(badges.first()).toBeVisible();

    // Badge should have visual styling (danger variant for tactical_blunder)
    const badgeEl = page.locator("span", { hasText: "Tactical Blunder" }).first();
    await expect(badgeEl).toHaveClass(/bg-danger-muted/);
  });

  // ── 4. Critical position board shown ────────────────────────────

  test("critical position board is visible", async ({ page }) => {
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Move notation with swing below the board
    await expect(page.getByText("11.g4")).toBeVisible();
    await expect(page.getByText("-212cp").first()).toBeVisible();

    // Eval transition
    await expect(page.getByText(/\+156cp/)).toBeVisible();
    await expect(page.getByText(/-56cp/)).toBeVisible();
  });

  // ── 5. Explanation is understandable ──────────────────────────────

  test("explanation text is human-readable", async ({ page }) => {
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Should contain actionable language
    const explanationText = page.getByText(
      /tactical oversight.*cost.*Practice pattern recognition/
    );
    await expect(explanationText).toBeVisible();
  });

  // ── 6. Contributing factors shown ─────────────────────────────────

  test("contributing factors are listed", async ({ page }) => {
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Contributing factors section (no label, check for move content)
    await expect(page.getByText("Tactical Blunder").first()).toBeVisible({ timeout: 5_000 });

    // Should show the contributing moves
    await expect(page.getByText("Qd4")).toBeVisible();
    await expect(page.getByText("Na4")).toBeVisible();
    await expect(page.getByText("Bxd5+")).toBeVisible();
  });

  // ── 7. Stats row visible ──────────────────────────────────────────

  test("stats row shows key metrics", async ({ page }) => {
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(/Mistakes:.*7/)).toBeVisible();
    await expect(page.getByText(/Blunders:.*21/)).toBeVisible();
    await expect(page.getByText(/Total CP loss:.*8420/)).toBeVisible();
  });

  // ── 8. No-loss state renders gracefully ───────────────────────────

  test("no-loss game shows appropriate message", async ({ page }) => {
    await page.goto(`/games/${NOT_LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    const noLoss = page.getByText("No Critical Errors Found");
    await expect(noLoss).toBeVisible({ timeout: 5_000 });

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "02-diagnosis-no-loss.png"),
      fullPage: true,
    });
  });

  // ── 9. Empty state with Diagnose button ───────────────────────────

  test("game without diagnosis shows generate button", async ({ page }) => {
    // Temporarily remove the diagnosis file for the lost game
    const diagPath = join(
      OUT,
      "games",
      LOST_GAME_ID,
      "diagnosis.json"
    );
    const { readFile } = await import("fs/promises");
    const backup = await readFile(diagPath, "utf-8");

    try {
      await unlink(diagPath);

      await page.goto(`/games/${LOST_GAME_ID}`);
      await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

      // Diagnose button should be visible
      const diagnoseBtn = page.getByRole("button", { name: /Diagnose Game/ });
      await expect(diagnoseBtn).toBeVisible({ timeout: 5_000 });

      // Description text
      await expect(
        page.getByText(/Run a diagnosis to identify/)
      ).toBeVisible();

      await page.screenshot({
        path: join(SCREENSHOT_DIR, "03-diagnosis-empty-state.png"),
        fullPage: true,
      });
    } finally {
      // Restore the diagnosis file
      await writeFile(diagPath, backup, "utf-8");
    }
  });

  // ── 10. Game not found state ──────────────────────────────────────

  test("nonexistent game shows empty state", async ({ page }) => {
    await page.goto("/games/nonexistent-game-id");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText("Game not found")).toBeVisible();
    await expect(
      page.getByText("No analyzed data found for this game")
    ).toBeVisible();

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "04-diagnosis-game-not-found.png"),
      fullPage: true,
    });
  });

  // ── 11. No layout breakage on desktop ─────────────────────────────

  test("no layout overflow or breakage at 1280px", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(
      () => document.body.scrollWidth
    );
    expect(bodyWidth).toBeLessThanOrEqual(1280);

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "05-diagnosis-desktop-1280.png"),
      fullPage: true,
    });
  });

  // ── 12. Import page remains functional ────────────────────────────

  test("import page still loads without breakage", async ({ page }) => {
    const res = await page.goto("/import");
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("h1")).toHaveText("Import & Analyze");

    // Just ensure no error boundary
    const errorBoundary = page.locator("text=Something went wrong");
    await expect(errorBoundary).not.toBeVisible();

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "06-import-page-intact.png"),
      fullPage: true,
    });
  });

  // ── 13. Review page still loads ───────────────────────────────────

  test("review page still loads without breakage", async ({ page }) => {
    const res = await page.goto("/review");
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("h1")).toHaveText("Review Queue");

    const errorBoundary = page.locator("text=Something went wrong");
    await expect(errorBoundary).not.toBeVisible();
  });

  // ── 14. Game context bar shows metadata ───────────────────────────

  test("game context bar shows player names and result", async ({ page }) => {
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Player names in context
    await expect(page.getByText(/griff843/)).toBeVisible();
    await expect(page.getByText(/Dinernur/)).toBeVisible();

    // Result badge
    const resultBadge = page.getByText("Lost");
    await expect(resultBadge).toBeVisible();
  });

  // ── 15. Training CTA visible for lost games ───────────────────────

  test("training CTA button is visible for diagnosed lost game", async ({ page }) => {
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    const ctaButton = page.getByRole("button", { name: /Train This Weakness/ });
    await expect(ctaButton).toBeVisible({ timeout: 5_000 });
  });

  // ── 16. Repair targets shown in unified view ──────────────────────

  test("repair target is shown in coaching review", async ({ page }) => {
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Target name appears in flowing verdict text
    const targetText = page.getByText("Tactical Pattern Recognition");
    await expect(targetText.first()).toBeVisible({ timeout: 5_000 });
  });
});
