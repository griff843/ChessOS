import { test, expect } from "../fixtures";
import { join } from "path";

const SCREENSHOT_DIR = join(__dirname, "..", "..", "out", "audit-screenshots");

test.describe("M-NAV-01 Navigation / Discoverability", () => {
  // ── 1. Games in sidebar + route loads ────────────────────────────

  test("sidebar has Games link and /games loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    const gamesLink = page.locator("nav a[href='/games']");
    await expect(gamesLink).toBeVisible();
    await expect(gamesLink).toHaveText("Games");

    await gamesLink.click();
    await expect(page).toHaveURL(/\/games$/);
    await expect(page.locator("h1")).toHaveText("Games");

    await page.screenshot({ path: join(SCREENSHOT_DIR, "nav-01-games-list.png"), fullPage: true });
  });

  // ── 2. Repertoire in sidebar + route loads ────────────────────────

  test("sidebar has Repertoire link and /repertoire loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    const repLink = page.locator("nav a[href='/repertoire']");
    await expect(repLink).toBeVisible();
    await expect(repLink).toHaveText("Repertoire");

    await repLink.click();
    await expect(page).toHaveURL(/\/repertoire$/);
    await expect(page.locator("h1")).toHaveText("Repertoire");

    await page.screenshot({ path: join(SCREENSHOT_DIR, "nav-02-repertoire.png"), fullPage: true });
  });

  // ── 3. /games renders correctly (with or without data) ───────────

  test("/games renders a valid page with correct heading", async ({ page }) => {
    await page.goto("/games");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("h1")).toHaveText("Games");

    // Either shows game rows or empty state — both are valid
    const hasRows = await page.locator("a[href^='/games/']").count() > 0;
    const hasEmptyState = await page.getByText("No games analyzed yet").isVisible();
    expect(hasRows || hasEmptyState).toBe(true);

    await page.screenshot({ path: join(SCREENSHOT_DIR, "nav-03-games-list.png"), fullPage: true });
  });

  // ── 4. Empty state links back to import ──────────────────────────

  test("/games empty state links to import when no games exist", async ({ page }) => {
    await page.goto("/games");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    const hasRows = await page.locator("a[href^='/games/']").count() > 0;

    if (!hasRows) {
      // Empty state should show link to import
      await expect(page.getByText("No games analyzed yet")).toBeVisible();
      const importLink = page.locator("main a[href='/import']");
      await expect(importLink).toBeVisible();
    } else {
      // Has rows — verify they link to /games/[gameId]
      const firstHref = await page.locator("a[href^='/games/']").first().getAttribute("href");
      expect(firstHref).toMatch(/^\/games\/.+/);
    }
  });

  // ── 5. Import results still link into game detail ─────────────────

  test("import results panel links still reach game detail", async ({ page }) => {
    await page.goto("/import");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("h1")).toHaveText("Import & Analyze");

    // No error boundary
    await expect(page.locator("text=Something went wrong")).not.toBeVisible();

    // Any game detail links on the page go to /games/[gameId]
    const diagLinks = page.locator("a[href^='/games/']");
    if (await diagLinks.count() > 0) {
      const href = await diagLinks.first().getAttribute("href");
      expect(href).toMatch(/^\/games\/.+/);
    }

    await page.screenshot({ path: join(SCREENSHOT_DIR, "nav-05-import-intact.png"), fullPage: true });
  });

  // ── 6. Command palette opens with Ctrl+K and has correct entries ──

  test("command palette opens and shows Games and Repertoire", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Open command palette
    await page.keyboard.press("Control+k");

    // Palette input uses placeholder "Type a command..."
    const paletteInput = page.getByRole("textbox", { name: /command/i });
    await expect(paletteInput).toBeVisible({ timeout: 3_000 });

    // Games entry appears in Navigate group
    await expect(page.getByRole("button", { name: /Games/ })).toBeVisible();

    // Repertoire entry appears in Navigate group
    await expect(page.getByRole("button", { name: /Repertoire/ })).toBeVisible();

    await page.screenshot({ path: join(SCREENSHOT_DIR, "nav-06-command-palette.png"), fullPage: true });
  });

  // ── 7. Command palette Games entry navigates to /games ───────────

  test("command palette Games entry navigates to /games", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    await page.keyboard.press("Control+k");
    await expect(page.getByRole("textbox", { name: /command/i })).toBeVisible({ timeout: 3_000 });

    await page.getByRole("button", { name: /^Games$/ }).click();
    await expect(page).toHaveURL(/\/games$/);
    await expect(page.locator("h1")).toHaveText("Games");
  });

  // ── 8. No layout overflow at 1280px ──────────────────────────────

  test("no layout overflow at 1280px on /games", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/games");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(1280);

    await page.screenshot({ path: join(SCREENSHOT_DIR, "nav-07-games-desktop.png"), fullPage: true });
  });
});
