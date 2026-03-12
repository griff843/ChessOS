import { rename } from "fs/promises";
import { join } from "path";
import { test, expect } from "../fixtures";

const PGN_DIR = join(__dirname, "..", "..", "data", "pgn");
const PGN_BAK_DIR = `${PGN_DIR}.test-bak`;

test.describe("Empty state tests", () => {
  test("dashboard shows welcome when learner-overview missing", async ({ page, artifacts }) => {
    await artifacts.backupAndRemove("dashboard/learner-overview.json");

    await page.goto("/");
    await expect(page.locator("h1")).toHaveText("Welcome to Chess OS", { timeout: 10_000 });
    await expect(page.locator("text=Getting Started")).toBeVisible();
  });

  test("import shows no-data state when no PGNs exist", async ({ page }) => {
    await rename(PGN_DIR, PGN_BAK_DIR);
    try {
      await page.goto("/import");
      await expect(page.locator("text=No PGN files found")).toBeVisible({ timeout: 10_000 });
    } finally {
      await rename(PGN_BAK_DIR, PGN_DIR);
    }
  });

  test("coach shows empty state when coaching-summary missing", async ({ page, artifacts }) => {
    await artifacts.backupAndRemove("coach/coaching-summary.json");

    await page.goto("/coach");
    await expect(page.locator("text=No coaching data yet")).toBeVisible({ timeout: 10_000 });
  });

  test("review shows empty state when review-queue missing", async ({ page, artifacts }) => {
    await artifacts.backupAndRemove("progress/review-queue.json");

    await page.goto("/review");
    await expect(page.locator("text=No review queue yet")).toBeVisible({ timeout: 10_000 });
  });

  test("curriculum shows empty state when curriculum-plan missing", async ({ page, artifacts }) => {
    await artifacts.backupAndRemove("curriculum/curriculum-plan.json");

    await page.goto("/curriculum");
    await expect(page.locator("text=No curriculum plan yet")).toBeVisible({ timeout: 10_000 });
  });

  test("history shows empty state when session-history missing", async ({ page, artifacts }) => {
    await artifacts.backupAndRemove("progress/session-history.jsonl");

    await page.goto("/history");
    await expect(page.locator("text=No completed sessions yet")).toBeVisible({ timeout: 10_000 });
  });
});

