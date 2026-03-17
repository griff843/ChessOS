# Local UI Contract

## Architectural Rules

1. **Engine is truth**: UI reads existing artifacts only. Never duplicates engine logic.
2. **No state mutation**: Read-only pages. No writes to canonical progress state from UI.
3. **Local-first**: No auth, cloud sync, billing, or SaaS assumptions.
4. **Graceful degradation**: Missing artifacts show polished empty states, never crash.
5. **Server rendering**: All pages are server components reading from disk.
6. **Typed access**: All artifact loading goes through `src/lib/artifacts.ts` with typed parsers.

## Data Flow

```
out/ (canonical artifacts on disk)
  ↓
src/lib/artifacts.ts (typed async loaders, null on missing)
  ↓
src/app/*/page.tsx (server components, render or empty state)
  ↓
src/components/ (reusable UI components)
```

## Artifact Dependencies

| Page | Required Artifacts |
|------|-------------------|
| Dashboard | `out/dashboard/learner-overview.json`, `out/dashboard/trend-report.json` |
| Coach | `out/coach/coaching-summary.json`, `out/coach/study-plan.json`, `out/coach/mistake-patterns.json` |
| Review | `out/progress/review-queue.json` |
| Curriculum | `out/curriculum/curriculum-plan.json` |
| Sessions | `out/sessions/*/study-session.json`, `out/results/*/session-results.json` |
| Settings | All artifacts (health check) |

## Component Library

Reusable components in `src/components/`:
- `ui/metric-card.tsx` — Stat display cards
- `ui/section-card.tsx` — Titled content sections
- `ui/badge.tsx` — Status/mastery/trend/difficulty/grading badges
- `ui/empty-state.tsx` — Graceful missing-data panels
- `ui/progress-bar.tsx` — Progress bars and segmented bars
- `ui/data-table.tsx` — Generic typed data tables
- `ui/insight-list.tsx` — Coach insight and focus recommendation lists
- `charts/accuracy-chart.tsx` — Session accuracy area chart
- `charts/mastery-chart.tsx` — Mastery distribution donut chart
- `layout/sidebar.tsx` — App navigation sidebar
- `layout/page-header.tsx` — Page title headers

## Design Tokens

Defined in `src/app/globals.css` via `@theme`:
- Surfaces: background → surface → surface-elevated → surface-hover
- Text: text-primary → text-secondary → text-muted
- Borders: border → border-subtle
- Accent: indigo (#6366f1)
- Semantic: success (green), warning (amber), danger (red), info (blue)
- Radius: sm → md → lg → xl

## Future: M10B Interactive Study

The session detail page (`/sessions/[id]`) provides a launcher shell.
M10B will add interactive puzzle solving with:
- Chessboard component (react-chessboard already installed)
- Move validation via chess.js
- Real-time grading feedback
- Session completion flow
