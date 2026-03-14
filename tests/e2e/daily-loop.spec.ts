import { test, expect } from "../fixtures";

test.describe("Daily Loop Tightening — M-DL-01", () => {
  // ─── Review Queue Action ─────────────────────────────

  test("review page renders Start Session button when queue exists", async ({
    page,
  }) => {
    await page.goto("/review");
    await page.waitForLoadState("networkidle");

    // The page should either show the queue (with action button) or the empty state
    const button = page.getByRole("button", { name: /start session/i });
    const emptyState = page.getByText(/no review queue yet/i);

    const hasButton = await button.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    // One of these must be true
    expect(hasButton || hasEmpty).toBe(true);

    if (hasButton) {
      // The button should be enabled when there are queue items
      await expect(button).toBeEnabled();
    }
  });

  test("review page has no layout overflow at 1280px", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/review");
    await page.waitForLoadState("networkidle");

    const body = page.locator("body");
    const scrollWidth = await body.evaluate((el) => el.scrollWidth);
    const clientWidth = await body.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  // ─── Session Identity ────────────────────────────────

  test("sessions page shows human-readable labels, not raw session IDs", async ({
    page,
  }) => {
    await page.goto("/sessions");
    await page.waitForLoadState("networkidle");

    const noSessions = page.getByText(/no sessions generated yet/i);
    const hasNoSessions = await noSessions.isVisible().catch(() => false);

    if (!hasNoSessions) {
      // Check that session cards exist and contain readable labels
      const sessionLinks = page.locator('a[href^="/study/"], a[href^="/sessions/"]');
      const count = await sessionLinks.count();

      if (count > 0) {
        // Get the first session card's text
        const firstCardText = await sessionLinks.first().textContent();

        // It should contain a date reference (e.g., "ago", a month name, or exercise count)
        const hasReadableContent =
          firstCardText?.includes("exercises") ||
          firstCardText?.includes("ago") ||
          false;
        expect(hasReadableContent).toBe(true);

        // Session labels should NOT start with a hash-like session ID pattern
        // The raw session ID format is a hex string — labels should be human words
        const titleEl = sessionLinks
          .first()
          .locator(".text-sm.font-medium.text-text-primary")
          .first();
        const titleExists = (await titleEl.count()) > 0;
        if (titleExists) {
          const titleText = await titleEl.textContent();
          // Should contain spaces (human-readable label) rather than
          // being a single continuous hex/hash string
          const looksLikeLabel =
            titleText !== null &&
            titleText.length > 0 &&
            (titleText.includes(" ") || titleText.length < 30);
          expect(looksLikeLabel).toBe(true);
        }
      }
    }
  });

  test("history page shows session labels in the table", async ({ page }) => {
    await page.goto("/history");
    await page.waitForLoadState("networkidle");

    const noHistory = page.getByText(/no completed sessions yet/i);
    const hasNoHistory = await noHistory.isVisible().catch(() => false);

    if (!hasNoHistory) {
      // Check that the table header says "Session" instead of just "Date"
      const sessionHeader = page.getByRole("columnheader", {
        name: /session/i,
      });
      const hasSessionHeader = await sessionHeader.isVisible().catch(() => false);
      expect(hasSessionHeader).toBe(true);
    }
  });

  test("session detail page shows derived label as title", async ({ page }) => {
    await page.goto("/sessions");
    await page.waitForLoadState("networkidle");

    // Try to find a session link to its detail page
    const detailLink = page.locator('a[href^="/sessions/"]').first();
    const hasDetail = (await detailLink.count()) > 0;

    if (hasDetail) {
      const href = await detailLink.getAttribute("href");
      if (href && href.startsWith("/sessions/")) {
        await page.goto(href);
        await page.waitForLoadState("networkidle");

        // The page title should not be a raw hash ID
        const pageTitle = page.locator("h1").first();
        const titleText = await pageTitle.textContent();

        // Should be a readable label, not a raw session ID hash
        const looksReadable =
          titleText !== null &&
          titleText.length > 0 &&
          (titleText.includes(" ") || titleText.length < 30);
        expect(looksReadable).toBe(true);
      }
    }
  });

  // ─── Session Resume (localStorage-based, limited E2E coverage) ───

  test("study page renders without console errors", async ({ page }) => {
    await page.goto("/sessions");
    await page.waitForLoadState("networkidle");

    // Find a pending session to study
    const studyLink = page.locator('a[href^="/study/"]').first();
    const hasStudy = (await studyLink.count()) > 0;

    if (hasStudy) {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await studyLink.click();
      await page.waitForLoadState("networkidle");
      // Allow time for React hydration
      await page.waitForTimeout(1000);

      // No uncaught errors should have occurred
      expect(errors).toEqual([]);

      // The page should have some content (not blank)
      const bodyText = await page.locator("body").textContent();
      expect(bodyText?.length).toBeGreaterThan(0);
    }
  });
});
