# OBJECTIVE_PROGRESS

Operate and validate M12F objective lifecycle tracking.

## Canonical Outputs

- `out/objective/training-objective.json`
- `out/objective/objective-progress.json`
- `out/objective/objective-history.jsonl`
- `out/sessions/<id>/study-session.json`
- `out/sessions/<id>/composition-rationale.json`

## Refresh Flow

1. Run `refreshInsights` or generate a new session.
2. Inspect `objective-progress.json` for current lifecycle state.
3. Inspect `objective-history.jsonl` for per-session objective evidence.
4. Confirm dashboard, coach, and curriculum render the same state.

## What To Verify

- current active objective
- objective start time and session count
- recent objective-session evidence
- progress verdict
- lifecycle decision
- decision reason
- next recommended coaching action

## Failure Checks

- Missing `objective-progress.json`: run `refreshInsights`.
- Empty `recentObjectiveSessions`: objective may have switched before any completed session on the new objective.
- Unexpected switch: compare `previousObjective`, `currentObjective`, `candidateScores`, and `objectiveDecisionReason`.

