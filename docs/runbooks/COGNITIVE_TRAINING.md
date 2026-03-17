# M12D - Cognitive Training Runbook

## Purpose

Run and validate the deterministic cognitive training stack (tactical + recall + visualization + reconstruction).

## Core Artifacts

Per session:
- `out/sessions/<id>/study-session.json`
- `out/sessions/<id>/cognitive-exercises.json`
- `out/sessions/<id>/mix-rationale.json`
- `out/sessions/<id>/composition-rationale.json`

Global:
- `out/patterns/pattern-library.json`

## Generate and Refresh

```bash
pnpm --filter web run dev
```

From UI:
1. Generate session (`/sessions` -> New Session).
2. Run through study flow (`/study/<id>`).
3. Refresh insights (Dashboard/Settings action).

## Expected Behavior

1. Session contains mixed exercise types according to canonical mix policy.
2. If corpus cannot satisfy requested cognitive slots, fallback is tactical and degradation is explained in `mix-rationale.json`.
3. Grading for recall/visualization/reconstruction is deterministic and server-side.
4. UI remains thin: no duplicated grading/session logic client-side.

## Pattern Library Notes

Pattern library includes:
- frequency (`totalSeen`)
- severity (`severity`)
- improvement trend (`trendDirection`, `improvementTrend`)
- difficulty distribution (`difficultyDistribution`)

## Verification Commands

```bash
pnpm typecheck
pnpm --filter web run build
pnpm test:e2e
```

## Troubleshooting

- Missing cognitive sidecars: confirm session generated through canonical `generateNewSession` action.
- Lower-than-expected cognitive count: inspect `mix-rationale.json` degradation notes.
- Pattern library absent: refresh insights or run a session generation path that writes `out/patterns/pattern-library.json`.
