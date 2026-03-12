# Launch Hardening Contract (M11A)

## Overview

The web UI is self-sufficient for daily training: generate sessions, refresh analytics, and manage artifacts without CLI context-switching.

## Generation Server Pattern

`apps/web/src/lib/generation-server.ts` provides shared async I/O helpers that load canonical artifacts from `out/`:

- `loadExerciseCorpusRaw()` → `TrainingExercise[]` from `out/datasets/training-exercises.jsonl`
- `loadProgressStoreRaw()` → `ProgressStore | null` from `out/progress/exercise-progress.json`
- `loadHistoryRecords()` → raw JSONL records from `out/progress/session-history.jsonl`
- `loadAnalyticsMap()` → `Record<string, SessionAnalytics>` from `out/results/*/session-analytics.json`

Reuses `getProjectRoot()` walk-up pattern from `artifacts.ts`. No engine duplication.

## Server Actions

`apps/web/src/app/actions/generation.ts` — `"use server"` module.

### `generateNewSession()`

Returns `{ success, sessionId?, exerciseCount?, error? }`.

Pipeline: load corpus → calibrate difficulty → load/init progress → refresh due → build trend profile → compute difficulty policy → rank adaptive candidates → build session → mark seen → write artifacts.

Writes to: `out/sessions/<id>/study-session.{json,md}`, `out/progress/exercise-progress.json`, `out/progress/session-history.jsonl`, `out/progress/trend-profile.json`, `out/progress/difficulty-policy.json`, `out/models/difficulty-calibration.json`.

### `refreshInsights()`

Returns `{ success, error? }`.

Combines dashboard + coach + curriculum in one pass (shared prefix avoids triplicate I/O):
- Dashboard: `learner-overview.json`, `trend-report.json`, `review-report.json`
- Coach: `mistake-patterns.json`, `study-plan.json`, `coaching-summary.json`
- Curriculum: `curriculum-plan.json`

### Concurrency Guard

Module-level `let generating = false` / `let refreshing = false` flags prevent concurrent writes. Sufficient for single-user product. Returns error if already running.

## UI Integration Points

| Surface | Action | Component |
|---------|--------|-----------|
| Sessions page header | Generate Session | `GenerateSessionButton` |
| Settings page | Generate Session + Refresh Insights | `SettingsActions` |
| Completion recap | Refresh Insights | Inline button in `CompletionRecap` |
| Command palette (Ctrl+K) | Generate Session + Refresh Insights | `CommandPalette` action commands |

All use `useTransition` for non-blocking pending state with spinner feedback.

## Settings Page

Artifacts organized into 3 groups with contextual guidance:

- **Pipeline Data**: Aggregated Dataset, Training Exercises, Tree Model, Feature Ablation
- **Progress**: Exercise Progress, Session History, Trend Profile, Difficulty Policy, Review Queue
- **Insights**: Learner Overview, Trend Report, Review Report, Coaching Summary, Study Plan, Mistake Patterns, Curriculum Plan

Each artifact shows: existence status (check/x icon), size in bytes, relative timestamp. Missing artifact groups show actionable guidance.

## Command Palette Extensions

`Command` interface extended with optional `action?: () => Promise<{ success: boolean; message: string }>`. Commands with `action` execute the async function and show a toast notification (3s auto-dismiss, bottom-right). Navigation commands use `href` as before.

## Files

| File | Role |
|------|------|
| `apps/web/src/lib/generation-server.ts` | Shared I/O helpers |
| `apps/web/src/app/actions/generation.ts` | Server actions |
| `apps/web/src/components/sessions/generate-session-button.tsx` | Session page button |
| `apps/web/src/components/settings/settings-actions.tsx` | Settings page buttons |
| `apps/web/src/components/study/completion-recap.tsx` | Post-session refresh |
| `apps/web/src/components/layout/command-palette.tsx` | Ctrl+K action commands |
| `apps/web/src/app/settings/page.tsx` | Categorized artifact health |

## Verification

1. `pnpm --filter web typecheck` — PASS
2. `pnpm --filter web build` — PASS
3. All routes return 200: `/`, `/coach`, `/review`, `/curriculum`, `/sessions`, `/history`, `/settings`
4. Sessions page: "New Session" button creates session, list refreshes
5. Settings page: categorized artifacts with timestamps, action buttons functional
6. Command palette: "Generate New Session" and "Refresh Insights" execute with toast
7. Completion recap: "Refresh Insights" button updates insights
