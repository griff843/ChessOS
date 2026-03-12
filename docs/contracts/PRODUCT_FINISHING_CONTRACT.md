# Product Finishing Contract (M11B)

## Overview

Every page in Chess-OS handles zero-data conditions gracefully with readiness-aware guidance. No page shows CLI commands to users. Error boundaries and loading skeletons ensure a professional experience.

## Readiness System

`apps/web/src/lib/artifacts.ts` exports `checkReadiness()` returning `ReadinessStatus`:

```typescript
interface ReadinessStatus {
  pipelineReady: boolean;      // training-exercises.jsonl exists
  progressReady: boolean;      // exercise-progress.json exists
  insightsReady: boolean;      // learner-overview.json exists
  canStudy: boolean;           // pipelineReady
  canRefreshInsights: boolean; // progressReady
}
```

Three sentinel files checked via parallel `stat()` calls. Lightweight enough to call on every page load.

## Empty State Strategy

### Dashboard (`/`)
Shows a "Welcome to Chess OS" getting-started checklist with three steps:
1. Pipeline Data — link to Settings if missing
2. Complete a Session — link to Sessions if pipeline ready
3. Generate Insights — RefreshInsightsButton if progress ready

### Coach / Review / Curriculum
Readiness-aware empty states with three tiers:
- `canRefreshInsights` → "Refresh Insights" button (generates all insight families)
- `canStudy` → "Go to Sessions" link
- Otherwise → "View Setup Instructions" link to Settings

### Sessions / History / Study
Already had good empty states (buttons, links). No changes needed.

## Shared Component

`apps/web/src/components/ui/refresh-insights-button.tsx` — Client component calling `refreshInsights()` server action. Used by Dashboard, Coach, Review, Curriculum empty states and completion recap.

## Error Handling

| File | Purpose |
|------|---------|
| `apps/web/src/app/error.tsx` | Global error boundary — "Try again" + "Go home" |
| `apps/web/src/app/not-found.tsx` | Custom 404 — "Back to Dashboard" |
| `apps/web/src/app/loading.tsx` | Root loading skeleton during route transitions |

## Packaging

- `pnpm start` launches the web UI (root package.json)
- `.env.example` documents ENGINE_MODE, PGN_DIR, PORT
- QUICKSTART.md updated with first-run experience documentation

## Verification

1. `pnpm --filter web typecheck` — PASS
2. `pnpm --filter web build` — PASS
3. All routes return 200
4. Empty states show readiness-aware guidance (no CLI commands)
5. Custom 404 page renders at `/nonexistent`
6. Loading skeleton appears during navigation
