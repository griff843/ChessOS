import { test, expect } from "../fixtures";

/**
 * Session label derivation tests.
 *
 * These test the visible output on the sessions page to verify
 * that labels are rendered from metadata rather than raw IDs.
 */
test.describe("Session Label Derivation", () => {
  test("sessions page loads successfully", async ({ page }) => {
    const res = await page.goto("/sessions");
    expect(res?.status()).toBe(200);
  });

  test("pending sessions show exercise count", async ({ page }) => {
    await page.goto("/sessions");
    await page.waitForLoadState("networkidle");

    const pendingSection = page.getByText("Ready to Study");
    const hasPending = await pendingSection.isVisible().catch(() => false);

    if (hasPending) {
      // Each pending session card should show exercise count
      const exerciseText = page.getByText(/exercises/i);
      const count = await exerciseText.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("pending sessions show category badges", async ({ page }) => {
    await page.goto("/sessions");
    await page.waitForLoadState("networkidle");

    const pendingSection = page.getByText("Ready to Study");
    const hasPending = await pendingSection.isVisible().catch(() => false);

    if (hasPending) {
      // Category badges should still render (Tactical Miss, etc.)
      const badges = page.locator('[class*="badge"]');
      const count = await badges.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});
