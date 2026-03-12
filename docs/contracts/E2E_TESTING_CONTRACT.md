# E2E Testing Contract (M12A)

## Overview

Playwright-based test suite covering all routes, server actions, the full study loop, empty states, and artifact integrity. 45 tests total, serial execution against real artifacts.

## Test API Route

`apps/web/src/app/api/test/route.ts` — POST endpoint wrapping server actions for programmatic testing.

Production guard: returns 404 when `NODE_ENV === "production"`.

| Action | Delegates To | Source |
|--------|-------------|--------|
| `generateNewSession` | `generateNewSession()` | `actions/generation.ts` |
| `refreshInsights` | `refreshInsights()` | `actions/generation.ts` |
| `loadSessionData` | `loadSessionData(sessionId)` | `study/actions.ts` |
| `submitMove` | `submitMove(sessionId, exerciseIndex, moveInput)` | `study/actions.ts` |
| `completeSession` | `completeSession(sessionId, rawAttempts, startedAt)` | `study/actions.ts` |
| `checkReadiness` | `checkReadiness()` | `lib/artifacts.ts` |
| `checkArtifactHealth` | `checkArtifactHealth()` | `lib/artifacts.ts` |

## Shared Fixtures

`tests/fixtures.ts` exports extended `test` with:

- **`api.call(action, params?)`** — POST to `/api/test`, asserts 200, returns parsed JSON
- **`artifacts.readJson(path)`** — Reads and parses JSON from `out/`
- **`artifacts.exists(path)`** — Checks file existence in `out/`
- **`artifacts.backupAndRemove(path)`** — Renames file to `.test-bak` (auto-restored on teardown)
- **`artifacts.restore(path)`** — Manually restores a backed-up file

## Test Suites

| Suite | File | Tests | Description |
|-------|------|-------|-------------|
| Route Smoke | `tests/smoke/routes.spec.ts` | 11 | All 7 routes load with headings, 404 page, session detail, study error |
| Empty States | `tests/smoke/empty-states.spec.ts` | 5 | Dashboard, Coach, Review, Curriculum, History empty states |
| Server Actions | `tests/e2e/actions.spec.ts` | 9 | Readiness, health, generate, refresh, load, submit, grade |
| Study Flow | `tests/e2e/study-flow.spec.ts` | 4 | Generate → verify artifact → render → submit all + complete |
| Artifact Integrity | `tests/e2e/artifacts.spec.ts` | 16 | All 16 canonical artifacts exist and parse correctly |

## Design Decisions

- **Test API route** over direct imports — server actions (`"use server"`) can't be imported into Node.js test files
- **Serial workers** (`workers: 1`) — tests share `out/` state; parallel would corrupt artifacts
- **Backup/restore** for empty states — temporary renames with auto-cleanup in fixture teardown
- **Real data, not mocks** — tests validate actual data flows against real artifacts
- **API-based study flow** — avoids fragile chessboard drag-and-drop interaction

## Configuration

`playwright.config.ts`:
- `webServer.command`: `pnpm --filter web dev -- --port 3001`
- `webServer.timeout`: 60s (webpack cold start)
- `baseURL`: `http://localhost:3001`
- Chromium only, serial execution
