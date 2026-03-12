import { test, expect } from "../fixtures";

test.describe("Route smoke tests", () => {
  const routes = [
    { path: "/", heading: /Dashboard|Welcome to Chess OS/ },
    { path: "/import", heading: "Import & Analyze" },
    { path: "/coach", heading: "Coach" },
    { path: "/review", heading: "Review Queue" },
    { path: "/curriculum", heading: "Curriculum" },
    { path: "/sessions", heading: "Study Sessions" },
    { path: "/history", heading: "History" },
    { path: "/settings", heading: "Settings" },
  ];

  for (const { path, heading } of routes) {
    test(`${path} loads and shows heading`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);

      const h1 = page.locator("h1");
      await expect(h1).toBeVisible({ timeout: 10_000 });

      if (heading instanceof RegExp) {
        await expect(h1).toHaveText(heading);
      } else {
        await expect(h1).toHaveText(heading);
      }
    });
  }

  test("no error boundary on main routes", async ({ page }) => {
    for (const { path } of routes) {
      await page.goto(path);
      const errorBoundary = page.locator("text=Something went wrong");
      await expect(errorBoundary).not.toBeVisible();
    }
  });

  test("/nonexistent returns 404 with custom page", async ({ page }) => {
    const res = await page.goto("/nonexistent");
    expect(res?.status()).toBe(404);
    await expect(page.locator("text=404 — Not found")).toBeVisible();
  });

  test("session detail page loads for existing session", async ({ page }) => {
    const res = await page.goto("/sessions/session-175c3f4f");
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
  });

  test("study page shows error for nonexistent session", async ({ page }) => {
    await page.goto("/study/session-does-not-exist");
    await expect(page.locator("text=Unable to load session")).toBeVisible({ timeout: 10_000 });
  });
});

