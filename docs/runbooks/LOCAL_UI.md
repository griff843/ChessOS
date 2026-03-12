# Local UI Runbook

## Quick Start

```bash
# From monorepo root
pnpm --filter web dev
# Open http://localhost:3000
```

## Prerequisites

1. **Install dependencies**: `pnpm install`
2. **Generate artifacts**: Run the pipeline to populate `out/` directory

## Artifact Generation Commands

Run these from the monorepo root to populate all pages:

```bash
# Full pipeline (batch processing 30 games)
ENGINE_MODE=stockfish PGN_DIR=C:/dev/chess-os/data/pgn pnpm --filter worker dev

# Train model
pnpm --filter worker run train-model

# Generate targets + exercises
pnpm --filter worker run generate-targets
pnpm --filter worker run generate-exercises

# Generate sessions
pnpm --filter worker run generate-session

# Solve sessions (CLI interactive)
pnpm --filter worker run solve-session

# Generate analytics artifacts
pnpm --filter worker run generate-dashboard
pnpm --filter worker run generate-coach-report
pnpm --filter worker run generate-curriculum
```

## Pages

| Route | Data Source | Purpose |
|-------|-----------|---------|
| `/` | `out/dashboard/*.json` | Learner overview, mastery, trends, focus |
| `/coach` | `out/coach/*.json` | Coaching insights, study plan, mistake patterns |
| `/review` | `out/progress/review-queue.json` | Urgency-ranked review items |
| `/curriculum` | `out/curriculum/*.json` | Multi-session roadmap, progression gates |
| `/sessions` | `out/sessions/*`, `out/results/*` | Session list, launcher, results |
| `/sessions/[id]` | `out/sessions/[id]/*.json` | Session detail, exercise list |
| `/settings` | All artifacts | Diagnostics, artifact health, commands |

## Architecture

- **Data access**: `src/lib/artifacts.ts` — typed loaders reading JSON from disk
- **Types**: `src/lib/types.ts` — mirrors canonical pipeline schemas
- **Components**: `src/components/` — reusable premium UI design system
- **Pages**: `src/app/` — Next.js App Router server components
- **Rendering**: Server-side only (no client state needed for read-only views)
- **Charts**: Recharts client components (`src/components/charts/`)

## Graceful Degradation

All pages handle missing artifacts gracefully:
- Empty state panels with generation instructions when artifacts don't exist
- Individual artifact failures don't crash the app
- Settings page shows full artifact health status

## Build & Typecheck

```bash
pnpm --filter web typecheck  # TypeScript validation
pnpm --filter web build      # Production build
```

## Tech Stack

- Next.js 16 (App Router, Server Components)
- React 19
- TypeScript (strict mode)
- Tailwind CSS v4
- Recharts (charts)
- Lucide React (icons)
- clsx + tailwind-merge (class utilities)
