# M12E - Training Objective Runbook

## Purpose

Operate and validate the deterministic objective layer that guides session composition.

## Primary Artifacts

- `out/objective/training-objective.json`
- `out/sessions/<id>/study-session.json` (objective metadata)
- `out/sessions/<id>/composition-rationale.json` (objective explainability)

## Flow

1. Generate a session from the UI Sessions page.
2. Confirm objective artifact exists.
3. Refresh insights to update dashboard, coach, and curriculum objective visibility.

## What to Validate

1. Objective exists and has reason + phase.
2. Objective success signals are populated.
3. Session metadata includes objective fields.
4. Composition rationale includes objective explainability.
5. Dashboard, Coach, and Curriculum render objective state from artifacts.
6. Candidate score ordering is deterministic and auditable.
7. Curriculum state is embedded in the objective artifact.

## Commands

```bash
pnpm typecheck
pnpm --filter web run build
pnpm test:e2e
```

## Troubleshooting

- Missing objective artifact: run `refreshInsights` or generate a new session.
- Objective not visible in UI: verify `loadTrainingObjective()` and validator pass.
- Unexpected objective choice: inspect `candidateScores` and `curriculumState` in `training-objective.json`.
