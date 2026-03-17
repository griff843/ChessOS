# Intervention Effectiveness Runbook

## Goal

Measure whether the last intervention actually improved the current objective and explain what should happen next.

## Inputs

Canonical inputs:
- objective progress
- objective coaching
- intervention-tagged objective session evidence
- objective history
- readiness and strategic context already used by the objective layer

## Outputs

Refresh and session generation write:
- `out/objective/intervention-effectiveness.json`
- `out/objective/intervention-effectiveness.md`
- `out/objective/intervention-history.jsonl`

Generated sessions also carry effectiveness-informed metadata in `study-session.json`.

## Flow

1. Derive current objective lifecycle.
2. Derive current coaching/intervention recommendation.
3. Identify the most recent intervention episode from intervention-tagged session evidence.
4. Compare post-intervention evidence against the pre-intervention baseline.
5. Classify the intervention outcome.
6. Recommend whether to continue, strengthen, reverse, or replace the intervention.
7. Feed that result into the next session-generation pass.

## Verification

Run:
- `pnpm typecheck`
- `pnpm --filter web run build`
- `pnpm test:e2e`

Check:
- `out/objective/intervention-effectiveness.json`
- `out/objective/intervention-effectiveness.md`
- `out/objective/intervention-history.jsonl`
- latest session artifact metadata for effectiveness-aware fields

## Notes

- Early intervention episodes may remain `inconclusive` until enough post-intervention evidence exists.
- The narrative layer is deterministic and artifact-backed; it is not LLM-generated.
- Reversal/replacement decisions should stay explainable from the artifact data alone.
