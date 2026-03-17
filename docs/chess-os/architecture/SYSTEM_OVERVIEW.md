# Chess OS — System Overview

> **Authority:** Architectural truth reference. Update when system structure changes.
> **Last updated:** 2026-03-17
> **Audience:** New AI sessions, developers, sprint planners needing to orient quickly.

---

## What Is Chess OS

Chess OS is a structured chess improvement system that turns real games into repeatable training workflows. It ingests PGN files, evaluates positions with a chess engine, classifies mistakes, generates training exercises and study sessions, tracks progress, and surfaces coaching insights — all presented through a web application and a set of AI-assisted diagnostic skills.

---

## Monorepo Structure

```
chess-os/
├── apps/
│   ├── web/          # Next.js 16 web application (user-facing)
│   └── worker/       # Node.js CLI pipeline runner (no server, tsx scripts)
├── packages/
│   ├── chess-core/   # Chess domain types, PGN parsing, FEN, move validation
│   ├── engine/       # Stockfish UCI integration + stub engine
│   ├── classifier/   # Feature extraction, mistake classification
│   ├── db/           # Persistence helpers, artifact paths, atomic writes
│   ├── training/     # Session building, targets, exercises, coaching, progress
│   └── ui/           # Shared React components (used by web)
├── tests/
│   ├── e2e/          # Playwright feature tests (port 3401)
│   └── smoke/        # Playwright smoke tests (port 3401)
├── scripts/
│   ├── ai-context.mjs      # Regenerates all 8 AI snapshot/context artifacts
│   └── dev-web-e2e.mjs     # Starts E2E test server on port 3401
├── data/
│   ├── pgn/          # Source PGN files (one file per game)
│   └── stockfish/    # Stockfish binary (gitignored)
├── out/              # All generated artifacts (gitignored)
├── docs/
│   ├── ai/           # AI skill specs and wave plans
│   ├── ai-core/      # Portable AI doctrine
│   └── chess-os/     # Project truth docs (architecture, governance, status)
└── .claude/
    ├── skills/       # 9 Claude Code skills (Wave 2–4)
    ├── agents/       # 7 generic agents
    └── rules/        # 4 operating rules
```

**Package dependency order:** `chess-core` → `engine` → `classifier` → `db` → `training` → `ui` → `web`/`worker`

---

## Pipeline Data Flow

The worker pipeline is a sequence of CLI commands, each reading from and writing to `out/`. They are run manually or in sequence.

```
data/pgn/<game>.pgn
        │
        ▼
[1] pnpm --filter worker dev          # batch: PGN → training-dataset.json
        │  (chess-core: parse PGN, engine: eval positions, classifier: classify)
        │
        ▼
out/games/<gameId>/training-dataset.json   (103 rows: fen, evalCp, swingCp, features, label)
        │
        ▼
[2] pnpm --filter worker run train-model   # train-model: rows → tree-model.json
        │  (training: feature matrix, decision tree, logistic regression)
        │
        ▼
out/models/tree-model.json, logistic-model.json, feature-importance.json
        │
        ▼
[3] pnpm --filter worker run generate-targets  # targets: model → blunder targets
        │  (training: score positions, rank by criticality, top-N selection)
        │  ⚠ Old-schema datasets (no features object) are skipped with warning.
        │
        ▼
out/intelligence/<gameId>/training-targets.json   (top-N blunder positions)
out/datasets/training-targets.jsonl               (aggregated)
        │
        ▼
[4] pnpm --filter worker run generate-exercises  # exercises: targets → exercises
        │  (training: enrich targets with engine answer, FEN, lessonCategory)
        │
        ▼
out/exercises/<gameId>/training-exercises.json
out/datasets/training-exercises.jsonl             (aggregated corpus)
        │
        ▼
[5] pnpm --filter worker run generate-session    # session: corpus → study session
        │  (training: filter hero-perspective only, adaptive ranking, build session)
        │  ← heroColor + perspective filtering added M-WEB-VERIFY-01
        │
        ▼
out/sessions/<sessionId>/study-session.json       (8–10 exercises, bestMoveSan populated)
out/sessions/<sessionId>/study-session.md
out/datasets/study-sessions.jsonl                 (aggregated)
```

### Supporting Pipeline Commands

These commands run after targets/exercises are generated and produce insight artifacts:

| Command | Input | Output |
|---|---|---|
| `generate-dashboard` | progress store + exercises | `out/dashboard/` (learner overview, trend report) |
| `generate-coach-report` | targets + exercises | `out/coach/` (coaching summary, study plan, mistake patterns) |
| `generate-curriculum` | coach report | `out/curriculum/` (curriculum plan, session roadmaps, gates) |
| `generate-patterns` | exercises | `out/patterns/pattern-library.json` |
| `score-critical` | training-dataset + model | critical position scores |
| `run-ablation` | training-dataset | feature ablation results |
| `record-session` | session + attempts | `out/results/` |
| `solve-session` | session | interactive CLI puzzle runner |

---

## Web Application

**Stack:** Next.js 16 + React 19 + Tailwind v4 + Playwright (E2E)
**Dev server:** `cd apps/web && npx next dev --webpack -p 3001` (must use `--webpack`)
**E2E server:** port 3401 (via `scripts/dev-web-e2e.mjs`)

### Pages and Their Artifact Connections

| Page | Route | Primary Artifacts |
|---|---|---|
| Home | `/` | Readiness summary, quick actions |
| Study | `/study/[sessionId]` | `out/sessions/<id>/study-session.json`, exercises corpus |
| Games | `/games` | `out/games/*/training-dataset.json` (list), `diagnosis.json` |
| Game Detail | `/games/[gameId]` | `diagnosis.json`, `training-targets.json`, branch repair |
| Repertoire | `/repertoire` | Hardcoded repertoire map, `out/games/*/training-dataset.json` |
| Coach | `/coach` | `out/coach/`, `out/progress/`, session history |
| Import | `/import` | Triggers generation server actions |
| Settings | `/settings` | Artifact validation status across all 20 artifacts |
| History | `/history` | `out/progress/session-history.jsonl` |

### Key Web App Files

| File | Role |
|---|---|
| `apps/web/src/lib/study-server.ts` | Session loading + exercise enrichment (server-side) |
| `apps/web/src/app/study/actions.ts` | Server actions: load, grade, complete session |
| `apps/web/src/app/actions/generation.ts` | Server actions: generateNewSession, refreshInsights |
| `apps/web/src/lib/artifacts.ts` | All artifact loading helpers |
| `apps/web/src/lib/paths.ts` | `ROOT` and `OUT` path constants |
| `apps/web/src/lib/study-types.ts` | `ExerciseView`, `GradeResult`, `CompletionResult` |
| `apps/web/src/components/study/study-player.tsx` | Main study session UI (chessboard, grading, feedback) |
| `apps/web/src/components/study/study-board.tsx` | Interactive chessboard (uses `heroColor` for orientation) |
| `apps/web/src/components/review/coaching-review.tsx` | Unified game review surface |

---

## Key Type Contracts

These are the critical types that connect pipeline stages:

| Type | Package | Role |
|---|---|---|
| `TrainingDatasetRow` | `@chess-os/training` | One evaluated + classified move from a game |
| `TrainingTarget` | `@chess-os/training` | A scored blunder position selected for training |
| `TrainingExercise` | `@chess-os/training` | Enriched exercise with engine answer + metadata; has `heroColor` + `perspective` |
| `SessionExercise` | `@chess-os/training` | Lightweight exercise in a study session |
| `EnrichedExercise` | `@chess-os/training` | Session exercise enriched with full corpus data; has `heroColor` |
| `ExerciseView` | `apps/web` | Client-safe view of one exercise; has `heroColor` |
| `ProgressStore` | `@chess-os/training` | Per-exercise mastery state and spaced repetition data |
| `StudySession` | `apps/web` | Full session artifact as stored in `out/sessions/` |

**Perspective filtering:** `TrainingExercise.perspective` is `"hero"` or `"opponent"`. `generate-session.ts` filters to `hero` only — sessions train the player's own mistakes exclusively.

---

## AI Operating Layer

The AI layer is installed in `.claude/` and `docs/ai/`. It provides skills for sprint planning, diagnostic loops, and chess-domain workflows.

### Skills (`.claude/skills/`)

| Wave | Skill | Purpose |
|---|---|---|
| 2 | `prompt-compose` | Shape implementation sprints before coding |
| 2 | `sprint-proof-bundle` | Capture closeout evidence artifacts |
| 2 | `sprint-plan` | Select next sprint from status docs |
| 2 | `status-sync` | Keep truth docs current after sprints |
| 2 | `agent-health` | Diagnose AI OS layer health |
| 3 | `game-review-shaper` | Stage 1 — structure a game review |
| 3 | `training-plan-composer` | Stage 2 — convert findings into training plan |
| 3 | `progress-snapshot-helper` | Stage 4 — synthesize improvement state |
| 4 | `study-closeout-helper` | Stage 6 — close loop and gate next cycle |

### Diagnostic Loop

See `CHESS_DIAGNOSTIC_LOOP.md`. The 6-stage loop: review → training plan → session execution → progress snapshot → context update → closeout.

### Context Bundle

`out/chess-os/ai/context/context_bundle.md` — regenerated by `pnpm ai:context`. Used to orient ChatGPT sessions when architecture decisions or roadmap planning is needed.

---

## Artifact Path Reference

```
out/
├── games/<gameId>/
│   ├── training-dataset.json     # Evaluated + classified rows (current schema: has `features`)
│   └── diagnosis.json            # Game loss diagnosis
├── intelligence/<gameId>/
│   ├── training-targets.json     # Scored blunder targets for this game
│   └── training-targets.md
├── exercises/<gameId>/
│   └── training-exercises.json   # Enriched exercises for this game
├── datasets/
│   ├── all-games.jsonl           # Aggregated training rows
│   ├── training-targets.jsonl    # Aggregated targets
│   ├── training-exercises.jsonl  # Aggregated exercise corpus
│   └── study-sessions.jsonl      # Aggregated session history
├── sessions/<sessionId>/
│   ├── study-session.json        # Session artifact (exercises + metadata)
│   ├── study-session.md          # Human-readable session summary
│   ├── cognitive-exercises.json  # Cognitive sidecar (recall/viz/reconstruction)
│   ├── mix-rationale.json
│   └── composition-rationale.json
├── results/<sessionId>/
│   ├── session-results.json      # Grading results
│   └── session-analytics.json
├── models/
│   ├── tree-model.json           # Decision tree parameters
│   ├── logistic-model.json
│   ├── feature-importance.json
│   └── difficulty-calibration.json
├── progress/
│   ├── exercise-progress.json    # Per-exercise mastery + spaced repetition state
│   ├── session-history.jsonl     # Completed session records
│   ├── trend-profile.json        # Adaptive learning trends
│   └── review-queue.json
├── coach/
│   ├── coaching-summary.json
│   ├── study-plan.json
│   └── mistake-patterns.json
├── dashboard/
│   ├── learner-overview.json
│   ├── trend-report.json
│   └── review-report.json
├── curriculum/
│   ├── curriculum-plan.md
│   ├── session-roadmaps.md
│   └── progression-gates.md
├── patterns/
│   └── pattern-library.json
├── strategic/
│   ├── pattern-intelligence.json
│   ├── readiness-forecast.json
│   └── intelligence-report.json
└── chess-os/
    ├── ai/context/context_bundle.md    # AI session context bundle
    ├── ai/context/context_bundle.json
    ├── ai/snapshots/                   # 6 snapshot artifacts (pnpm ai:context)
    └── sprints/<SPRINT>/<DATE>/        # Sprint proof bundles
```

---

## Common Commands

```bash
# Start web dev server
cd apps/web && npx next dev --webpack -p 3001

# Full pipeline for a new game
PGN_DIR="C:/dev/chess-os/data/pgn" ENGINE_MODE=stockfish pnpm --filter worker dev
pnpm --filter worker run train-model
pnpm --filter worker run generate-targets
pnpm --filter worker run generate-exercises
pnpm --filter worker run generate-session

# Post-pipeline insights
pnpm --filter worker run generate-dashboard
pnpm --filter worker run generate-coach-report
pnpm --filter worker run generate-curriculum
pnpm --filter worker run generate-patterns

# Verification
pnpm -r run typecheck
pnpm --filter web run build
pnpm test:e2e
pnpm test:e2e:smoke

# AI context refresh
pnpm ai:context
```

---

## Known Gaps (as of 2026-03-17)

- `docs/ai/AI_SKILL_WAVE_3_CHESS_DIAGNOSTICS_v1.md` — file exists but is empty (content missing)
- `out/games/demo-game-001/` — uses old flat-row schema; skipped by `generate-targets` schema guard; no source PGN to regenerate
- Wave 4 Skills 2+3 (position-concept-audit, session-quality-evaluator) — not yet built
- Linear issue tracking — not yet connected to sprint workflow
- Web app session browser verification pending (`/study/session-054cd81e`)

---

## Related Architecture Docs

| Doc | Purpose |
|---|---|
| `CHESS_DIAGNOSTIC_LOOP.md` | The 6-stage AI-assisted improvement loop |
| `CHESS_OS_AI_SNAPSHOT_LAYER.md` | AI snapshot artifact spec and `pnpm ai:context` |
| `docs/chess-os/governance/OPERATING_RULES.md` | Sprint rules, verification standards |
| `docs/chess-os/current-state/CURRENT_SYSTEM_STATUS.md` | Live system state truth |
| `docs/chess-os/status/NEXT_STEPS.md` | Prioritized sprint queue |
