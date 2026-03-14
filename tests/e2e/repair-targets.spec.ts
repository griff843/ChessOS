import { test, expect, OUT } from "../fixtures";
import { writeFile, unlink, readFile } from "fs/promises";
import { join } from "path";

const LOST_GAME_ID = "griff843_vs_Dinernur_2026.03.11";
const NOT_LOST_GAME_ID = "game1";
const SCREENSHOT_DIR = join(__dirname, "..", "..", "out", "audit-screenshots");

test.describe("Repair Targets — UI Audit", () => {
  // ── 1. Repair target section appears in coaching review ───────────

  test("repair target renders in unified coaching review for lost game", async ({ page }) => {
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Category badge should appear (unified coaching review)
    const categoryBadge = page.getByText("Tactical Blunder").first();
    await expect(categoryBadge).toBeVisible({ timeout: 5_000 });

    // Target name should appear in flowing verdict
    const repairTarget = page.getByText("Tactical Pattern Recognition").first();
    await expect(repairTarget).toBeVisible({ timeout: 5_000 });

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "07-repair-targets-full.png"),
      fullPage: true,
    });
  });

  // ── 2. Primary target readable ──────────────────────────────────────

  test("primary target badge and reason are readable", async ({ page }) => {
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Target name in flowing verdict
    const primaryLabel = page.getByText("Tactical Pattern Recognition").first();
    await expect(primaryLabel).toBeVisible({ timeout: 5_000 });

    // Badge: Tactical Pattern Recognition (from tactical_blunder)
    const badge = page.getByText("Tactical Pattern Recognition");
    await expect(badge.first()).toBeVisible();

    // Reason text
    const reason = page.getByText(/tactical oversight was the primary cause/);
    await expect(reason).toBeVisible();
  });

  // ── 3. Rationale is understandable and not generic ──────────────────

  test("primary reason contains specific actionable language", async ({ page }) => {
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Reason should mention pattern recognition drills
    const reason = page.getByText(/pattern recognition drills are recommended/);
    await expect(reason).toBeVisible({ timeout: 5_000 });
  });

  // ── 4. Secondary targets readable and not noisy ─────────────────────

  test("secondary targets are listed with source tracing", async ({ page }) => {
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Secondary target badges should appear
    // (no "Also Consider" label — badges are directly visible)

    // Secondary targets from contributing factors:
    // practical_collapse -> Practical Stabilization
    await expect(page.getByText("Practical Stabilization", { exact: true })).toBeVisible();

    // calculation_failure -> Calculation Discipline
    await expect(page.getByText("Calculation Discipline", { exact: true })).toBeVisible();

    // Auto-injected from tactical_blunder -> Candidate Move Generation
    await expect(page.getByText("Candidate Move Generation", { exact: true })).toBeVisible();

    // Source tracing arrows should exist
    await expect(page.getByText(/Practical Collapse/).first()).toBeVisible();
    await expect(page.getByText(/Calculation Failure/).first()).toBeVisible();
  });

  // ── 5. Summary text is coherent ─────────────────────────────────────

  test("summary mentions primary and secondary focus areas", async ({ page }) => {
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Summary should mention "tactical pattern recognition" as primary focus
    const summary = page.getByText(/Focus primarily on tactical pattern recognition/);
    await expect(summary).toBeVisible({ timeout: 5_000 });
  });

  // ── 6. No-loss state shows no confusing repair guidance ─────────────

  test("no-loss game shows no repair section", async ({ page }) => {
    await page.goto(`/games/${NOT_LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Should show "No Critical Errors Found"
    const noLoss = page.getByText("No Critical Errors Found");
    await expect(noLoss).toBeVisible({ timeout: 5_000 });

    // Should NOT show repair target content
    await expect(page.getByText("Tactical Pattern Recognition")).not.toBeVisible();

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "08-repair-targets-no-loss.png"),
      fullPage: true,
    });
  });

  // ── 7. Empty state (no diagnosis) remains intact ────────────────────

  test("game without diagnosis shows generate button, no repair section", async ({ page }) => {
    const diagPath = join(
      OUT,
      "games",
      LOST_GAME_ID,
      "diagnosis.json"
    );
    const backup = await readFile(diagPath, "utf-8");

    try {
      await unlink(diagPath);

      await page.goto(`/games/${LOST_GAME_ID}`);
      await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

      // Diagnose button should be visible
      const diagnoseBtn = page.getByRole("button", { name: /Diagnose Game/ });
      await expect(diagnoseBtn).toBeVisible({ timeout: 5_000 });

      // Repair targets should NOT be visible (no diagnosis = no repair)
      await expect(page.getByText("Tactical Pattern Recognition")).not.toBeVisible();
    } finally {
      await writeFile(diagPath, backup, "utf-8");
    }
  });

  // ── 8. Game not found state intact ──────────────────────────────────

  test("nonexistent game shows empty state, no repair section", async ({ page }) => {
    await page.goto("/games/nonexistent-game-id");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText("Game not found")).toBeVisible();
    await expect(page.getByText("Tactical Pattern Recognition")).not.toBeVisible();
  });

  // ── 9. Diagnosis + repair form coherent coaching flow ───────────────

  test("diagnosis and repair form coherent coaching flow", async ({ page }) => {
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Category badge and target visible in unified review
    await expect(page.getByText("Tactical Blunder").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Tactical Pattern Recognition").first()).toBeVisible();

    // Diagnosis mentions tactical oversight
    await expect(page.getByText(/tactical oversight/).first()).toBeVisible();

    // Repair targets references tactical pattern recognition
    await expect(page.getByText("Tactical Pattern Recognition").first()).toBeVisible();

    // CTA should be visible
    await expect(page.getByRole("button", { name: /Train This Weakness/ })).toBeVisible();

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "09-repair-targets-coaching-flow.png"),
      fullPage: true,
    });
  });

  // ── 10. No layout overflow on desktop ───────────────────────────────

  test("no layout overflow or breakage at 1280px", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/games/${LOST_GAME_ID}`);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Coaching review visible
    await expect(page.getByText("Tactical Pattern Recognition").first()).toBeVisible({ timeout: 5_000 });

    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(
      () => document.body.scrollWidth
    );
    expect(bodyWidth).toBeLessThanOrEqual(1280);

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "10-repair-targets-desktop-1280.png"),
      fullPage: true,
    });
  });

  // ── 11. Existing pages remain functional ────────────────────────────

  test("import page still loads without breakage", async ({ page }) => {
    const res = await page.goto("/import");
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    const errorBoundary = page.locator("text=Something went wrong");
    await expect(errorBoundary).not.toBeVisible();
  });
});
