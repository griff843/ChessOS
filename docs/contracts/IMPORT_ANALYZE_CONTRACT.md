# Import & Analyze Contract

## Goal

Provide a local-first user-facing workflow that takes PGN files from disk, runs the canonical analysis pipeline, and hands the user into Chess-OS training surfaces without requiring CLI or source-code knowledge.

## Invariants

1. The engine and worker pipeline remain canonical truth.
2. The web app may upload PGNs into the configured local folder, but it must not duplicate parsing, evaluation, targeting, or exercise-generation logic.
3. The web app may only orchestrate worker scripts through thin local wrappers.
4. Analysis status must be persisted as a deterministic artifact under `out/import/analysis-status.json`.
5. Missing PGNs, missing Stockfish, stale inputs, and pipeline failures must surface as first-class UI states.

## User-Facing Route

- Route: `/import`
- Primary responsibilities:
  - explain accepted PGN format (`.pgn`)
  - show the configured PGN folder
  - list detected PGN files
  - show whether analysis artifacts are current or stale
  - trigger canonical analysis
  - show post-analysis CTAs into Sessions, Dashboard, and Coach

## Canonical Pipeline Sequence

The browser-triggered analysis flow must execute the existing worker scripts in this order:

1. `apps/worker/src/index.ts`
2. `apps/worker/src/train.ts`
3. `apps/worker/src/generate-training-targets.ts`
4. `apps/worker/src/generate-exercises.ts`

The engine mode is `stockfish`, resolved through existing engine helpers.

## Status Artifact

`out/import/analysis-status.json` must record:

- overall workflow status: `idle | ready | running | complete | failed`
- source directory and engine metadata
- timestamps for started/completed/failed states
- step-level pipeline visibility
- summarized counts for detected games, positions, targets, and exercises
- generated artifact paths
- last error message when a run fails

## Diagnostics Integration

Settings must surface:

- PGN intake folder and readiness
- latest analysis status
- health of `Import Analysis Status`
- quick link into `/import`

## Post-Analysis Handoff

When training artifacts are ready, the workflow must offer direct links to:

- `/sessions`
- `/`
- `/coach`

