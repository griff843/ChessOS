# Curriculum Planner Runbook (M9B)

## Generate Curriculum Plan

```bash
pnpm --filter worker run generate-curriculum
```

### Prerequisites

- Progress store exists: `out/progress/exercise-progress.json`
- At least one session solved: `pnpm --filter worker run solve-session`

### Output

6 artifacts written to `out/curriculum/`:

| File | Description |
|------|-------------|
| `curriculum-plan.json` | Full plan: themes, sessions, gates, rationale |
| `curriculum-plan.md` | Formatted plan with overview, theme sequence, session summaries |
| `session-roadmaps.json` | Per-session detail: focus, difficulty, quotas |
| `session-roadmaps.md` | Formatted roadmaps with tables |
| `progression-gates.json` | 5 readiness gates with pass/fail status |
| `progression-gates.md` | Formatted gates with recommendations |

### Read-Only Guarantee

The curriculum planner deep-copies the progress store before calling `refreshDueStatus`. The canonical `exercise-progress.json` is never modified. Verify with checksum comparison:

```bash
md5sum out/progress/exercise-progress.json  # before
pnpm --filter worker run generate-curriculum
md5sum out/progress/exercise-progress.json  # after — must match
```

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "progress store not found" | No sessions solved | Run `pnpm --filter worker run solve-session` first |
| All sessions consolidation | No blunders/worsening/instability triggers | Expected for well-performing learners |
| No difficulty_expansion | Progression gates not all passed | Check gates output for failing criteria |
| Empty focus categories | No exercises attempted | Solve more sessions |

### Pipeline Order

```
M8B (dashboard) → M9A (coach) → M9B (curriculum)
```

All three can run independently — they share the same data loading pattern and none mutates state. The curriculum planner builds M8B and M9A intermediates internally.
