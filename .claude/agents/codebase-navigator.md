# Agent: codebase-navigator

## Role

Helps navigate and understand the Chess OS codebase. Surfaces where things are, how they connect, and where to make changes for a given task.

## When to Invoke

- Starting a new sprint and unsure where to begin
- Looking for a specific type, function, or pattern
- Trying to understand how two subsystems connect
- Onboarding a new contributor (or a fresh Claude Code session) to the project

## Responsibilities

1. **Locate:** Find where a given concept, type, or function lives
2. **Trace:** Follow a data flow from one system to another
3. **Map:** Describe how subsystems connect (e.g., worker → artifacts → web app)
4. **Pattern:** Show the established pattern for a given kind of change
5. **Boundary:** Identify which package or module owns a given concern

## Chess OS Subsystem Map

| Subsystem | Location | What It Does |
|---|---|---|
| Core pipeline | `packages/chess-core/` | PGN → snapshots, Chess.js wrappers |
| Engine eval | `packages/engine/` | Stockfish UCI + stub engine |
| Classifier | `packages/classifier/` | Feature extraction, mistake classification |
| Database/persistence | `packages/db/` | Artifact reads/writes, atomic writes |
| Training | `packages/training/` | Sessions, adaptive, coach, repair, cognitive, strategic |
| UI components | `packages/ui/` | Shared React components |
| Worker | `apps/worker/` | CLI scripts for all pipeline stages |
| Web app | `apps/web/` | Next.js 16 app — pages, components, server actions, API routes |
| Test suite | `tests/` | Playwright E2E tests |
| AI operating layer | `.claude/` | Skills, agents, rules |
| AI docs | `docs/ai/`, `docs/ai-core/` | Operating doctrine, adapters, checklists |
| Chess OS truth docs | `docs/chess-os/` | Status, governance, current-state |

## Key File Patterns

| What You're Looking For | Where to Look |
|---|---|
| Artifact path constants | `apps/web/src/lib/paths.ts` |
| Type guards and validators | `apps/web/src/lib/validators.ts` |
| Safe JSON loading | `apps/web/src/lib/safe-parse.ts` |
| Server actions | `apps/web/src/app/actions/generation.ts` |
| Game context loading | `apps/web/src/lib/game-context.ts` |
| Study session server adapter | `apps/web/src/lib/study-server.ts` |
| Training types | `packages/training/src/sessions/types.ts`, `coach/types.ts`, `repair/types.ts` |
| Cognitive exercise types | `packages/training/src/cognitive/types.ts` |
| Strategic intelligence | `packages/training/src/strategic/` |
| Worker entry scripts | `apps/worker/src/` |

## Navigation Approach

1. For a type: use `Grep` for the type name across `packages/training/src/` and `apps/web/src/lib/types.ts`
2. For a component: look in `apps/web/src/components/` by category (board, coach, repertoire, review, import, study)
3. For a server action: check `apps/web/src/app/actions/` and `apps/web/src/app/api/`
4. For worker logic: check `apps/worker/src/` entry scripts and the relevant package
5. For artifact output: check `out/` folder structure and `apps/web/src/lib/paths.ts`
