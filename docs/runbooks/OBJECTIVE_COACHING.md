# Objective Coaching Runbook

## Goal

Explain the current objective state and prescribe the next intervention using only deterministic evidence already available in Chess-OS artifacts.

## Inputs

Canonical inputs come from engine-side layers only:
- objective selection
- objective progress
- objective history
- readiness forecast
- pattern intelligence
- review queue

## Outputs

Refresh and session generation write:
- `out/objective/objective-coaching.json`
- `out/objective/objective-coaching.md`

Generated sessions also carry intervention metadata in `study-session.json` and `composition-rationale.json`.

## Intervention flow

1. Resolve the current objective and objective lifecycle state.
2. Derive failed and supporting signals from success signals, readiness signals, recurrence pressure, and review burden.
3. Build deterministic compare windows from objective history and progress windows.
4. Select one canonical intervention type.
5. Produce recommended next-session adjustments for mix, difficulty, and review emphasis.
6. Persist artifacts and attach metadata to the next generated session.

## Verification

Run:
- `pnpm typecheck`
- `pnpm --filter web run build`
- `pnpm test:e2e`

Check artifacts:
- `out/objective/objective-coaching.json`
- `out/objective/objective-coaching.md`
- `out/objective/objective-progress.json`
- `out/objective/objective-history.jsonl`

## Notes

- The intervention layer is advisory but canonical.
- The UI may summarize, badge, and surface compare windows, but it must not recompute intervention decisions.
- Early objective histories may naturally default to lower-confidence or hold-style recommendations until enough evidence accumulates.
