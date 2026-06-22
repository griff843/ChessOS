# Chess OS

Single-user world-class chess improvement system for Griff.

## Repo Workflow

- `main` stays clean and merge-ready.
- Work happens on short-lived branches like `codex/m15-runtime-complete`.
- Generated artifacts stay local by default (`out/`, caches, test outputs).
- Each milestone should land as a vertical slice with compile and runtime proof.

Agent-OS validation: CHESS-101 validates the first README-only Agent-OS lane in ChessOS.

## Verification Gates

For local setup, Agent-OS lane checks, and issue queue examples, see [Local Verification](./docs/runbooks/LOCAL_VERIFICATION.md).

Before committing a milestone slice:

```bash
pnpm typecheck
pnpm --filter web build
```

Then run the real runtime path for that slice. For M15, that means triggering the Next runtime generation flow so `out/learning/learning-model.json` and `out/learning/learning-model.md` are materialized by the app, not by an ad hoc script.

## Repo Layout

- `apps/web`: read-only product surfaces and server actions
- `apps/worker`: explicit generation and pipeline entrypoints
- `packages/*`: domain logic, derivation, canonical types
- `docs/runbooks`: operational guides and deeper workflows

## Contributor Guide

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the day-to-day branch, commit, and verification workflow.

## Current milestone
M15 - Learning Model runtime-complete

## Goal
Turn real game mistakes into daily adaptive training.
