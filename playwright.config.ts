import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = Number(process.env.CHESS_OS_E2E_PORT ?? "3401");
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  timeout: 30_000,

  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "node scripts/dev-web-e2e.mjs",
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
