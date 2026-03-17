import { test, expect } from "../fixtures";

test.describe("Objective UI integration", () => {
  test("dashboard, coach, and curriculum render objective state", async ({ api, page }) => {
    const refreshed = (await api.call("refreshInsights")) as { success: boolean };
    expect(refreshed.success).toBe(true);

    await page.goto("/");
    await expect(page.getByText("Current Objective", { exact: true })).toBeVisible();
    await expect(page.getByText(/Recommended Intervention/i)).toBeVisible();
    await expect(page.getByText(/Intervention Reason/i)).toBeVisible();
    await expect(page.getByText(/Objective Escalation/i)).toBeVisible();
    await expect(page.getByText(/Escalation Verdict:/i)).toBeVisible();
    await expect(page.getByText(/Objective Portfolio/i)).toBeVisible();
    await expect(page.getByText(/Rotation Decision:/i).first()).toBeVisible();
    await expect(page.getByText("Intervention Memory", { exact: true })).toBeVisible();
    await expect(page.getByText(/Next action:/i)).toBeVisible();

    await page.goto("/coach");
    await expect(page.getByText("Training Objective")).toBeVisible();
    await expect(page.getByText("Intervention", { exact: true })).toBeVisible();
    await expect(page.getByText(/Objective Escalation/i)).toBeVisible();
    await expect(page.getByText(/Escalation Verdict:/i)).toBeVisible();
    await expect(page.getByText(/Next Session Adjustment/i)).toBeVisible();
    await expect(page.getByText("Intervention Memory", { exact: true })).toBeVisible();
    await expect(page.getByText(/Next Action Recommendation:/i).first()).toBeVisible();

    await page.goto("/curriculum");
    await expect(page.getByText("Objective Progression")).toBeVisible();
    await expect(page.getByText(/^intervention /i).first()).toBeVisible();
    await expect(page.getByText(/Compare Window:/i)).toBeVisible();
    await expect(page.getByText(/Escalation Verdict:/i)).toBeVisible();
    await expect(page.getByText(/Objective Portfolio:/i)).toBeVisible();
    await expect(page.getByText(/Rotation Decision:/i).first()).toBeVisible();
    await expect(page.getByText(/Recent intervention episodes:|Next-action recommendation:/i).first()).toBeVisible();
  });
});



