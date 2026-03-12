import { test, expect } from "../fixtures";
import { join } from "path";

const EXISTING_PGN = join(process.cwd(), "data", "pgn", "game1.pgn");

test.describe("Import to session flow", () => {
  test("user can import, analyze, generate a session, and open training", async ({ page }) => {
    test.setTimeout(180_000);

    await page.goto("/import");
    await expect(page.locator("h1")).toHaveText("Import & Analyze");

    const fileInput = page.locator('input[type="file"][name="files"]');
    await fileInput.setInputFiles(EXISTING_PGN);
    await expect(page.locator("text=game1.pgn").first()).toBeVisible();

    await page.getByRole("button", { name: "Import selected PGNs" }).click();
    await expect(page.getByText(/saved to|already present/i)).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Analyze PGNs" }).click();
    await expect(page.getByText(/Analysis complete|already up to date/i)).toBeVisible({ timeout: 30_000 });

    await expect(page.locator("text=Import Results")).toBeVisible();
    await expect(page.locator("text=Top detected weaknesses")).toBeVisible();
    await expect(page.locator("text=Generate Training Session")).toBeVisible();

    await page.getByRole("button", { name: "Mixed improvement session" }).click();
    await page.waitForURL(/\/training\/session\//, { timeout: 30_000 });
    await expect(page.locator("h1")).toHaveText("Study Session");
    await expect(page.locator("text=Click or drag a piece to make your move")).toBeVisible({ timeout: 15_000 });
  });
});
