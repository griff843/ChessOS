import { Chess } from "chess.js";
import { test, expect } from "../fixtures";

const SESSION_ID = "session-175c3f4f";

function findWrongMove(fen: string, bestMoveSan?: string) {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  const wrongMove = moves.find((move) => move.san !== bestMoveSan);

  if (!wrongMove) {
    throw new Error("Unable to find a legal non-best move for the coaching test.");
  }

  return {
    from: wrongMove.from,
    to: wrongMove.to,
  };
}

test.describe("Coaching insight", () => {
  test("shows coaching panel and progressive hints after a mistake", async ({
    api,
    page,
  }) => {
    const loaded = (await api.call("loadSessionData", {
      sessionId: SESSION_ID,
    })) as {
      exercises: Array<{
        fen: string;
        bestMoveSan?: string;
      }>;
      error: string | null;
    };

    expect(loaded.error).toBeNull();
    expect(loaded.exercises.length).toBeGreaterThan(0);

    const wrongMove = findWrongMove(
      loaded.exercises[0]!.fen,
      loaded.exercises[0]!.bestMoveSan
    );

    await page.goto(`/study/${SESSION_ID}`);
    await expect(page.locator("h1")).toHaveText("Study Session");

    await page.locator(`[data-square="${wrongMove.from}"]`).click();
    await page.locator(`[data-square="${wrongMove.to}"]`).click();

    await expect(page.getByText("Coaching Insight")).toBeVisible();
    await expect(page.getByText("Improvement tip")).toBeVisible();

    await page.getByRole("button", { name: "Reveal Hint 1" }).click();
    await expect(
      page.getByRole("button", { name: "Reveal Hint 2" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Reveal Hint 2" }).click();
    await expect(
      page.getByRole("button", { name: "All hints shown" })
    ).toBeVisible();
  });
});

