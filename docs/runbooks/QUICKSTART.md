# Quickstart

Getting Chess-OS running locally from zero to first study session.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Stockfish binary at `data/stockfish/stockfish.exe` (see `docs/runbooks/STOCKFISH_RUNTIME_SETUP.md`)
- PGN files in `data/pgn/` (at least one `.pgn` file)

## First-Time Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Run the full pipeline (PGN -> engine eval -> features -> classification -> dataset)
ENGINE_MODE=stockfish PGN_DIR=C:/dev/chess-os/data/pgn pnpm --filter worker dev

# 3. Train model + generate targets + generate exercises
pnpm --filter worker run train-model
pnpm --filter worker run run-ablation
pnpm --filter worker run generate-targets
pnpm --filter worker run generate-exercises
```

## Start the Web UI

```bash
pnpm start
```

Or equivalently: `pnpm --filter web dev`

Opens at `http://localhost:3000` (or the port shown in terminal output).

## First-Run Experience

On first launch, the Dashboard shows a **Getting Started** checklist:

1. **Pipeline Data** - green when `out/datasets/training-exercises.jsonl` exists (from setup step 2-3)
2. **Complete a Session** - green after you generate and complete your first study session
3. **Generate Insights** - click "Refresh Insights" to generate dashboard, coach, and curriculum

Other pages (Coach, Review, Curriculum) also show readiness-aware guidance instead of raw CLI commands. Each page detects what prerequisites exist and guides you to the next step.

## Daily Use

### Generate a Study Session

Three ways:

1. **Web UI**: Click "New Session" on the Sessions page, or "Generate Session" on Settings
2. **Command palette**: Press `Ctrl+K`, type "generate", select "Generate New Session"
3. **CLI**: `pnpm --filter worker run generate-session`

### Study a Session

Navigate to Sessions, click "Study Now" on any pending session, solve exercises interactively.

### Refresh Insights

After completing sessions, refresh dashboard/coach/curriculum:

1. **Post-session**: Click "Refresh Insights" on the completion recap screen
2. **Empty pages**: Coach, Review, and Curriculum pages offer "Refresh Insights" when prerequisites are met
3. **Settings page**: Click "Refresh Insights"
4. **Command palette**: Press `Ctrl+K`, type "refresh"
5. **CLI**: `pnpm --filter worker run generate-dashboard && pnpm --filter worker run generate-coach-report && pnpm --filter worker run generate-curriculum`

## Artifact Health

Visit Settings (`/settings`) to see the status of all 16 artifacts organized by group:

- **Pipeline Data**: Dataset, exercises, model, ablation
- **Progress**: Exercise progress, session history, trends, difficulty policy, review queue
- **Insights**: Dashboard, trends, review, coach, study plan, mistake patterns, curriculum

Each artifact shows its size and last-modified timestamp. Missing artifacts show contextual guidance for how to generate them.

## Environment Variables

Copy `.env.example` to `.env` to customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `ENGINE_MODE` | `stub` | `stub` for fake evals, `stockfish` for real engine |
| `PGN_DIR` | - | Absolute path to PGN game files |
| `PORT` | `3000` | Web UI port |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "No exercises found" | Run the full pipeline (step 2-3 above) |
| Settings shows missing Pipeline Data | Re-run `ENGINE_MODE=stockfish PGN_DIR=... pnpm --filter worker dev` |
| Settings shows missing Progress | Generate and complete at least one session |
| Settings shows missing Insights | Click "Refresh Insights" on any insights page or Settings |
| Turbopack errors | The `--webpack` flag is built into the dev script |
| Port conflict | Set `PORT=3002` in `.env` |
