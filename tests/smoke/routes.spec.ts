import { test, expect } from "../fixtures";

test.describe("Route smoke tests", () => {
  const routes = [
    { path: "/", heading: /Dashboard|Welcome to Chess OS/ },
    { path: "/import", heading: "Import & Analyze" },
    { path: "/coach", heading: "Coach" },
    { path: "/review", heading: "Review Queue" },
    { path: "/repertoire", heading: "Repertoire" },
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
    await expect(page.locator("text=/404.*Not found/")).toBeVisible();
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


test.describe("Concept UI surfaces", () => {
  test("dashboard shows concept section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Concept Pressure")).toBeVisible({ timeout: 10000 });
  });

  test("coach shows recommended concepts", async ({ page }) => {
    await page.goto("/coach");
    await expect(page.getByText("Recommended Concepts")).toBeVisible({ timeout: 10000 });
  });

  test("curriculum shows concept sequence", async ({ page }) => {
    await page.goto("/curriculum");
    await expect(page.getByRole("heading", { name: "Concept Sequence" })).toBeVisible({ timeout: 10000 });
  });
});



test.describe("Opening UI surfaces", () => {
  test("dashboard shows opening weaknesses", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Opening Weaknesses")).toBeVisible({ timeout: 10000 });
  });

  test("coach shows opening focus", async ({ page }) => {
    await page.goto("/coach");
    await expect(page.getByText("Opening Focus")).toBeVisible({ timeout: 10000 });
  });

  test("curriculum shows opening curriculum focus", async ({ page }) => {
    await page.goto("/curriculum");
    await expect(page.getByText("Opening Curriculum Focus")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Repertoire UI surfaces", () => {
  test("dashboard shows repertoire health", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Repertoire Health")).toBeVisible({ timeout: 10000 });
  });

  test("coach shows repertoire coaching", async ({ page }) => {
    await page.goto("/coach");
    await expect(page.getByText("Repertoire Coaching")).toBeVisible({ timeout: 10000 });
  });

  test("curriculum shows repertoire curriculum focus", async ({ page }) => {
    await page.goto("/curriculum");
    await expect(page.getByText("Repertoire Curriculum Focus")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Repertoire Transfer UI surfaces", () => {
  test("dashboard shows transfer coaching", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Transfer Coaching")).toBeVisible({ timeout: 10000 });
  });

  test("coach shows transfer repair", async ({ page }) => {
    await page.goto("/coach");
    await expect(page.getByText("Transfer Repair")).toBeVisible({ timeout: 10000 });
  });

  test("curriculum shows transfer repair plan", async ({ page }) => {
    await page.goto("/curriculum");
    await expect(page.getByText("Transfer Repair Plan")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Repertoire Drill UI surfaces", () => {
  test("dashboard shows drill memory", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Drill Memory")).toBeVisible({ timeout: 10000 });
  });

  test("coach shows drill memory coaching", async ({ page }) => {
    await page.goto("/coach");
    await expect(page.getByText("Drill Memory Coaching")).toBeVisible({ timeout: 10000 });
  });

  test("curriculum shows drill memory plan", async ({ page }) => {
    await page.goto("/curriculum");
    await expect(page.getByText("Drill Memory Plan")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Repertoire Repair UI surfaces", () => {
  test("dashboard shows repair queue", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Repair Queue")).toBeVisible({ timeout: 10000 });
  });

  test("coach shows import repair signals", async ({ page }) => {
    await page.goto("/coach");
    await expect(page.getByText("Import Repair Signals")).toBeVisible({ timeout: 10000 });
  });

  test("curriculum shows repair queue plan", async ({ page }) => {
    await page.goto("/curriculum");
    await expect(page.getByText("Repair Queue Plan")).toBeVisible({ timeout: 10000 });
  });

  test("import shows games needing repair", async ({ page }) => {
    await page.goto("/import");
    await expect(page.getByText("Games Needing Repair")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Repair Outcome UI surfaces", () => {
  test("dashboard shows repair outcomes", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Repair Outcomes")).toBeVisible({ timeout: 10000 });
  });

  test("coach shows transfer follow-up", async ({ page }) => {
    await page.goto("/coach");
    await expect(page.getByText("Transfer Follow-up")).toBeVisible({ timeout: 10000 });
  });

  test("curriculum shows repair outcome plan", async ({ page }) => {
    await page.goto("/curriculum");
    await expect(page.getByText("Repair Outcome Plan")).toBeVisible({ timeout: 10000 });
  });

  test("repertoire shows repair outcomes", async ({ page }) => {
    await page.goto("/repertoire");
    await expect(page.getByText("Repair Outcomes")).toBeVisible({ timeout: 10000 });
  });

  test("import shows repair outcomes", async ({ page }) => {
    await page.goto("/import");
    await expect(page.getByText("Repair Outcomes")).toBeVisible({ timeout: 10000 });
  });
});
