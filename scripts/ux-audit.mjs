/**
 * Chess OS - UX Audit Script
 * Navigates key routes, captures screenshots, checks console and network issues,
 * and reports basic layout health.
 */

import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const AUDIT_PORT = Number(process.env.CHESS_OS_AUDIT_PORT ?? process.env.CHESS_OS_PORT ?? "3402");
const BASE = `http://localhost:${AUDIT_PORT}`;
const OUT = "out/ux-audit";

mkdirSync(OUT, { recursive: true });

const ROUTES = [
  { name: "home", path: "/" },
  { name: "games-list", path: "/games" },
  { name: "import", path: "/import" },
  { name: "repertoire", path: "/repertoire" },
  { name: "coach", path: "/coach" },
  { name: "settings", path: "/settings" },
  { name: "history", path: "/history" },
];

async function capture(page, name, fullPage = true) {
  await page.screenshot({
    path: join(OUT, name),
    fullPage,
  });
}

async function auditPage(page, name, path) {
  const errors = [];
  const warnings = [];
  const networkFails = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
    if (msg.type() === "warning") warnings.push(msg.text());
  });
  page.on("requestfailed", (req) => {
    networkFails.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });

  const startedAt = Date.now();
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 20_000 });
  const loadMs = Date.now() - startedAt;

  await capture(page, `${name}-full.png`, true);
  await capture(page, `${name}-viewport.png`, false);

  const bodyText = await page.evaluate(() => document.body.innerText);
  const buttons = await page.locator("button").count();
  const links = await page.locator("a").count();
  const inputs = await page.locator("input, textarea, select").count();
  const h1Texts = await page.locator("h1").allTextContents();

  const brokenImgs = await page.evaluate(() =>
    Array.from(document.images)
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.src)
  );

  return {
    name,
    path,
    loadMs,
    errors,
    warnings: warnings.slice(0, 5),
    networkFails: networkFails.slice(0, 5),
    buttons,
    links,
    inputs,
    h1Texts,
    brokenImgs,
    hasErrorText: /error/i.test(bodyText),
    hasEmptyText: /\b(no|empty|yet)\b/i.test(bodyText),
    hasLoadingText: /loading/i.test(bodyText),
    bodyTextSnippet: bodyText.slice(0, 500).replace(/\n+/g, " "),
  };
}

async function auditStudySession(page, sessionId) {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(`${BASE}/study/${sessionId}`, {
    waitUntil: "networkidle",
    timeout: 20_000,
  });

  await capture(page, "study-session-full.png", true);
  await capture(page, "study-session-viewport.png", false);

  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasBoard = await page
    .locator("[data-testid='chessboard'], .board-container, canvas, [class*='board']")
    .count();

  return {
    name: "study-session",
    path: `/study/${sessionId}`,
    errors,
    hasBoard,
    hasExercise: /exercise|position/i.test(bodyText),
    buttons: await page.locator("button").count(),
    bodyTextSnippet: bodyText.slice(0, 600).replace(/\n+/g, " "),
  };
}

async function auditGameDetail(page, gameId) {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(`${BASE}/games/${gameId}`, {
    waitUntil: "networkidle",
    timeout: 20_000,
  });

  await capture(page, "game-detail-full.png", true);

  const bodyText = await page.evaluate(() => document.body.innerText);
  return {
    name: "game-detail",
    path: `/games/${gameId}`,
    errors,
    buttons: await page.locator("button").count(),
    bodyTextSnippet: bodyText.slice(0, 600).replace(/\n+/g, " "),
  };
}

async function auditNavigation(page) {
  await page.goto(BASE, { waitUntil: "networkidle" });

  const navLinks = await page.locator("nav a, aside a, [role='navigation'] a").allTextContents();
  const navHrefs = await page
    .locator("nav a, aside a, [role='navigation'] a")
    .evaluateAll((els) => els.map((el) => el.href));

  await capture(page, "nav-open.png", false);

  return { navLinks, navHrefs };
}

async function auditMobileViewport(page) {
  await page.setViewportSize({ width: 375, height: 812 });
  const results = {};

  for (const { name, path } of ROUTES.slice(0, 4)) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 15_000 });
    await capture(page, `mobile-${name}.png`, false);
    results[name] = await page.evaluate(() => ({
      horizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
  }

  await page.setViewportSize({ width: 1280, height: 800 });
  return results;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  console.log("=== Chess OS UX Audit ===");
  console.log(`Base URL: ${BASE}\n`);

  const pageResults = [];
  for (const route of ROUTES) {
    console.log(`Auditing ${route.path}...`);
    try {
      const result = await auditPage(page, route.name, route.path);
      pageResults.push(result);
      console.log(
        `  OK ${route.name} - ${result.loadMs}ms, ${result.buttons} buttons, ${result.errors.length} console errors`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pageResults.push({ name: route.name, path: route.path, failed: message });
      console.log(`  FAIL ${route.name} - ${message}`);
    }
  }

  console.log("\nAuditing study session...");
  let sessionResult;
  try {
    sessionResult = await auditStudySession(page, "session-054cd81e");
    console.log(
      `  OK session - ${sessionResult.errors.length} errors, hasBoard=${sessionResult.hasBoard}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sessionResult = { failed: message };
    console.log(`  FAIL session - ${message}`);
  }

  console.log("Auditing game detail...");
  let gameResult;
  try {
    await page.goto(`${BASE}/games`, { waitUntil: "networkidle" });
    const gameLinks = await page
      .locator("a[href*='/games/']")
      .evaluateAll((els) => els.map((el) => el.href).filter((href) => !href.endsWith("/games/")));
    const gameId = gameLinks[0]?.split("/games/")[1] ?? "griff843_vs_Dinernur_2026.03.11";
    gameResult = await auditGameDetail(page, gameId);
    console.log(`  OK game detail - ${gameResult.errors.length} errors`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    gameResult = { failed: message };
    console.log(`  FAIL game detail - ${message}`);
  }

  console.log("Auditing navigation...");
  const navResult = await auditNavigation(page);
  console.log(`  OK nav - ${navResult.navLinks.length} nav links`);

  console.log("Auditing mobile viewports...");
  const mobileResults = await auditMobileViewport(page);
  const overflowPages = Object.entries(mobileResults)
    .filter(([, value]) => value.horizontalOverflow)
    .map(([routeName]) => routeName);
  console.log(`  OK mobile - ${overflowPages.length} pages with horizontal overflow`);

  await browser.close();

  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE,
    pages: pageResults,
    session: sessionResult,
    game: gameResult,
    navigation: navResult,
    mobile: {
      overflowPages,
      details: mobileResults,
    },
  };

  writeFileSync(join(OUT, "audit-report.json"), JSON.stringify(report, null, 2));
  console.log(`\nOK report written to ${OUT}/audit-report.json`);
  console.log(`OK screenshots written to ${OUT}/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
