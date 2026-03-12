# Contributing

## Branching

- Keep `main` clean.
- Create short-lived branches from `main`.
- Use the `codex/` prefix for implementation branches.
- Prefer one milestone or vertical slice per branch.

Examples:

- `codex/m15-runtime-complete`
- `codex/m16-concept-graph`
- `codex/m17-opening-intelligence`

## Commit Scope

- Commit vertical slices, not scattered file buckets.
- A slice should be compile-complete and runtime-proven before commit when possible.
- Do not mix generated output, docs churn, and product code in the same checkpoint unless they are part of the same deliverable.

## What Belongs In Git

Commit:

- source code under `apps/` and `packages/`
- stable config files
- intentional tests
- durable docs and runbooks

Do not commit by default:

- `out/`
- `.next/`
- `*.tsbuildinfo`
- `test-results/`
- `playwright-report/`
- local PGN imports and machine-specific runtime data

## Verification Before Commit

Minimum gate for milestone work:

```bash
pnpm typecheck
pnpm --filter web build
```

Then prove the slice through the real runtime path.

Examples:

- M15: trigger the actual app/server generation flow and confirm `out/learning/learning-model.json` and `out/learning/learning-model.md`
- M16: trigger the real concept graph generation path and confirm `out/concepts/*`
- M17: trigger the real opening intelligence generation path and confirm `out/openings/*`

## Runtime Rule

- Prefer real application/runtime entrypoints over ad hoc scripts when validating milestone completion.
- Server actions should be exercised through the real Next runtime path when runtime proof matters.
- Worker scripts are valid only when they are the canonical generation entrypoint for that artifact family.

## Recommended Daily Flow

1. Branch from clean `main`.
2. Implement one vertical slice.
3. Run compile checks.
4. Prove runtime artifact generation through the canonical path.
5. Commit source/config only.
6. Push branch.
7. Open PR.

## PR Expectations

- Small enough to review coherently.
- Clear milestone or slice name.
- Includes exact verification commands used.
- Avoid broad unrelated cleanup in the same PR.
