# Learner Analytics Dashboard Runbook (M8B)

## Prerequisites

1. Progress store exists: `out/progress/exercise-progress.json`
2. At least one session completed (session-history.jsonl has completion records)
3. Optionally: session analytics in `out/results/<sessionId>/session-analytics.json`

## Generate Dashboard

```bash
pnpm --filter worker run generate-dashboard
```

## Output Artifacts

| Artifact | Path |
|----------|------|
| Learner overview (JSON) | `out/dashboard/learner-overview.json` |
| Learner overview (MD) | `out/dashboard/learner-overview.md` |
| Trend report (JSON) | `out/dashboard/trend-report.json` |
| Trend report (MD) | `out/dashboard/trend-report.md` |
| Review report (JSON) | `out/dashboard/review-report.json` |
| Review report (MD) | `out/dashboard/review-report.md` |

## Learner Overview

Includes:
- Progress summary (total exercises, seen, unseen, lifetime/recent accuracy)
- Mastery distribution (unseen, learning, unstable, improving, mastered)
- Review load (overdue, due soon, unstable counts)
- Weakness highlights (top 3 categories and difficulty bands by miss rate)
- Trend summary (improving/worsening/stable categories)
- Recent sessions (last 5 completed)
- Focus recommendations (top 5 next-study suggestions)

## Trend Report

Includes:
- Category trends sorted by adaptive weight (with trend direction)
- Difficulty trends in easy/medium/hard order
- Session timeline (accuracy over completed sessions)
- Eval loss trend (if session analytics available)

## Review Report

Includes:
- Summary counts (overdue, due soon, unstable)
- Urgent items (overdue, ranked by urgency)
- Due soon items
- Unstable items
- Blunder-prone items (last grade was blunder or mistake)
- Category urgency (per-category review pressure)

## Read-Only Guarantee

The dashboard generator does not modify:
- `out/progress/exercise-progress.json`
- `out/progress/session-history.jsonl`
- Any existing session or result artifacts

A deep copy of the progress store is used internally to refresh due status.

## Idempotency

Running `generate-dashboard` multiple times overwrites the same 6 files in `out/dashboard/`. JSON output is deterministic given the same input state (except `generatedAt` timestamps).
