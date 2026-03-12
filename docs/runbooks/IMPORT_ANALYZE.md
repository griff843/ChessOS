# Import & Analyze Runbook

## Front Door

Open `/import` in the web app.

The page shows:

- the configured PGN source folder
- whether Stockfish is ready
- detected `.pgn` files
- the last analysis status
- the canonical pipeline stages
- links into Sessions, Dashboard, and Coach

## PGN Intake

Default folder:

- `data/pgn`

Behavior:

- any `.pgn` file in the configured folder is listed on the page
- if `PGN_DIR` points inside the workspace, the page can import files directly into that folder
- if `PGN_DIR` points outside the workspace, the page explains that files must be placed there manually

## In-App Analysis

Use the `Analyze PGNs` button on `/import`.

The app runs these worker scripts locally:

1. `apps/worker/src/index.ts`
2. `apps/worker/src/train.ts`
3. `apps/worker/src/generate-training-targets.ts`
4. `apps/worker/src/generate-exercises.ts`

Output artifacts to watch:

- `out/import/analysis-status.json`
- `out/import/analysis.log`
- `out/datasets/all-games.jsonl`
- `out/models/tree-model.json`
- `out/datasets/training-targets.jsonl`
- `out/datasets/training-exercises.jsonl`

## Empty-State Expectations

If no PGNs exist, `/import` should clearly explain:

- where the folder is
- that only `.pgn` files are accepted
- how to import files from the browser when possible
- that analysis cannot start until at least one file is present

## After Analysis

Use the CTAs on `/import` to continue into:

- Sessions for study generation
- Dashboard for the current training picture
- Coach for explanation and intervention guidance

