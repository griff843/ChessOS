# Rule 04 — Testing and Verification

> **Authority:** This rule defines test categories, verification requirements, and test discipline for Chess OS.

---

## Test Categories

| Category | Tool | Location | When Required |
|---|---|---|---|
| E2E — full suite | Playwright | `tests/e2e/` | Major feature changes, pre-closeout |
| E2E — smoke | Playwright | `tests/smoke/` | Quick sanity, faster turnaround |
| Unit tests | Vitest (planned) | `packages/*/src/**/*.test.ts` | Pure function logic |
| Typecheck | TypeScript | Whole monorepo | Always |
| Build | Next.js | `apps/web/` | All web changes |

---

## Test Commands

```bash
# Full E2E (requires E2E dev server on port 3401)
pnpm test:e2e

# Smoke tests only
pnpm test:e2e:smoke

# Typecheck all packages
pnpm -r run typecheck

# Build web app
pnpm --filter web run build
```

---

## E2E Infrastructure

- Playwright config: `playwright.config.ts` (root)
- E2E dev server: port **3401** (via `scripts/dev-web-e2e.mjs`)
- Dev server for manual testing: port **3001**
- Test API route: `apps/web/src/app/api/test/route.ts` (production-guarded)
- Fixtures: `tests/fixtures.ts` (`api.call`, `artifacts.readJson`, etc.)

**Do not mix ports.** E2E tests that point to 3001 will fail against the E2E server.

---

## Test File Naming

| Type | Pattern |
|---|---|
| E2E feature tests | `tests/e2e/<feature>.spec.ts` |
| Smoke tests | `tests/smoke/<topic>.spec.ts` |
| Unit tests | `packages/<pkg>/src/<module>.test.ts` |

---

## New Feature Test Requirements

When adding a new feature or surface:
1. Add at minimum one E2E smoke test (happy path)
2. If the feature is user-facing: add full E2E coverage (edge cases)
3. If the feature is a pure function: add unit tests

---

## Verification Checklist Before Closeout

- [ ] `pnpm -r run typecheck` passes (no new errors)
- [ ] `pnpm --filter web run build` passes (if web changes)
- [ ] `pnpm test:e2e` (or subset) passes
- [ ] Any pre-existing failures are documented (not newly introduced)
- [ ] Sprint-specific behavioral verification performed (named, not implied)

---

## What Not to Do

- Do not skip typecheck because "the types look fine"
- Do not skip build because "it's just a component change"
- Do not write tests after claiming the sprint is done — write them as part of the sprint
- Do not assume the E2E suite covers a new feature unless you added the test
