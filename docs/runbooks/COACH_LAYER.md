# Coach Layer Runbook (M9A)

## Generate Coach Report

```bash
pnpm --filter worker run generate-coach-report
```

### Prerequisites

- Progress store exists: `out/progress/exercise-progress.json`
- At least one session solved: `pnpm --filter worker run solve-session`

### Output

6 artifacts written to `out/coach/`:

| File | Description |
|------|-------------|
| `mistake-patterns.json` | Category/difficulty patterns, blunder profile, recurring weaknesses |
| `mistake-patterns.md` | Formatted tables with severity badges |
| `study-plan.json` | Primary/secondary focus, review slots, difficulty mix, exercise composition |
| `study-plan.md` | Formatted plan with tables |
| `coaching-summary.json` | Headline, prioritized insights, progress/next-step statements |
| `coaching-summary.md` | Formatted summary with insight icons |

### Read-Only Guarantee

The coach report deep-copies the progress store before calling `refreshDueStatus`. The canonical `exercise-progress.json` is never modified. Verify with checksum comparison:

```bash
md5sum out/progress/exercise-progress.json  # before
pnpm --filter worker run generate-coach-report
md5sum out/progress/exercise-progress.json  # after — must match
```

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "progress store not found" | No sessions solved | Run `pnpm --filter worker run solve-session` first |
| Empty mistake patterns | No exercises attempted | Solve more sessions |
| No review focus in plan | No overdue exercises | Expected when all exercises are up to date |
| "Getting started" headline | No recent accuracy data | Solve more sessions to build history |

### Pipeline Order

```
M8B (dashboard) → M9A (coach)
```

Both can run independently — they share the same data loading pattern and neither mutates state. The coach layer builds M8B intermediates (overview, review report, focus recommendations) internally.
