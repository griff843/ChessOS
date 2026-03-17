# Product Polish Contract (M10C)

## Overview

Premium product polish, session history visibility, command palette navigation, and cross-linking between surfaces.

## Features Added

### Session History Page (`/history`)
- Metrics: total sessions, best/avg accuracy, total exercises
- AccuracyChart trend (reuses existing `SessionSnapshot` chart)
- Clickable session list with category badges, accuracy bars
- EmptyState with CTA when no completed sessions

### Command Palette (Ctrl+K / Cmd+K)
- Global keyboard shortcut overlay with backdrop blur
- Navigate group: Dashboard, Coach, Review Queue, Curriculum, Sessions, History, Settings
- Study group: Browse Sessions, Review Urgent Exercises
- Fuzzy search filtering, arrow key navigation, Enter to execute, Escape to close
- Triggered via keyboard shortcut or sidebar footer button

### Sidebar Updates
- Added History nav item (Clock icon) between Sessions and Settings
- Added Ctrl+K search trigger button in footer

### Dashboard Quick Actions
- 4-column grid: Study Next, Review (with overdue count), History, Coach
- Recent Sessions rows now clickable (Link to session detail)
- "View all" action link on Recent Sessions → /history

### Study UX Enhancements
- Board flip toggle (RotateCcw button below board)
- Back link ("Sessions") above progress rail
- Restart button to reset session progress
- History CTA on completion recap alongside Dashboard/Coach/Next Session

### Skeleton Components
- `Skeleton`, `SkeletonCard`, `SkeletonRow` for loading states

### Cross-Links
- Coach page: "View History" link below insights
- Completion recap: History CTA button

## Key Files

| File | Role |
|---|---|
| `apps/web/src/app/history/page.tsx` | Session history page |
| `apps/web/src/components/layout/command-palette.tsx` | Ctrl+K command palette |
| `apps/web/src/components/ui/skeleton.tsx` | Skeleton loading components |
| `apps/web/src/lib/types.ts` | SessionHistoryEntry type |
| `apps/web/src/lib/artifacts.ts` | loadSessionHistory() loader |
| `apps/web/src/lib/utils.ts` | formatDateTime() utility |

## Data Flow

```
session-history.jsonl (JSONL pairs: creation + completion)
  → loadSessionHistory() merges pairs
  → SessionHistoryEntry[] sorted by completedAt desc
  → History page renders metrics, chart, list
```

## Architecture Rules

1. No new backend logic — all data from existing artifacts
2. `loadSessionHistory()` merges creation+completion JSONL records (takes distributions from creation, results from completion)
3. AccuracyChart reused via `SessionSnapshot[]` conversion
4. Command palette uses `CustomEvent("open-command-palette")` for sidebar→palette communication
