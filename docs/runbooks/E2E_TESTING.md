# E2E Testing Runbook

## Prerequisites

- Node.js 20+, pnpm 10+
- Chromium installed: `npx playwright install chromium`
- All pipeline artifacts present in `out/` (run pipeline first)

## Running Tests

```bash
# Full suite (45 tests)
pnpm test:e2e

# Smoke tests only (routes + empty states)
pnpm test:e2e:smoke

# With browser visible
pnpm test:e2e:headed

# Single file
npx playwright test tests/e2e/study-flow.spec.ts
```

## How It Works

Tests run against a dev server on port 3001. Playwright auto-starts the server unless one is already running.

Server actions are tested via `/api/test` — a POST endpoint that dispatches to the real server action functions. This route is guarded and returns 404 in production.

Empty state tests temporarily rename artifact files (`.test-bak`), then auto-restore them in fixture teardown.

## Adding New Tests

1. **Route test**: Add to the `routes` array in `tests/smoke/routes.spec.ts`
2. **Server action test**: Add the action to `apps/web/src/app/api/test/route.ts`, then write tests in `tests/e2e/actions.spec.ts`
3. **Artifact test**: Add to the `jsonArtifacts` or `jsonlArtifacts` array in `tests/e2e/artifacts.spec.ts`

Use the shared fixtures:

```typescript
import { test, expect } from "../fixtures";

test("my test", async ({ api, artifacts }) => {
  // Call server actions
  const result = await api.call("checkReadiness");

  // Read artifacts
  const data = await artifacts.readJson("dashboard/learner-overview.json");

  // Test empty states
  await artifacts.backupAndRemove("coach/coaching-summary.json");
  // ... test empty state ...
  // Auto-restored on teardown
});
```

## Debugging Failures

```bash
# Run with trace
npx playwright test --trace on

# View trace
npx playwright show-trace test-results/*/trace.zip

# Run specific test
npx playwright test -g "study page renders"
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Timeout on first run | Dev server cold start; increase `webServer.timeout` in `playwright.config.ts` |
| Port 3001 in use | Stop existing server or set a different port |
| `.test-bak` files left behind | Test crashed mid-run; manually rename back (remove `.test-bak` suffix) |
| "Exercise corpus not found" | Run the full pipeline to generate `out/datasets/training-exercises.jsonl` |
