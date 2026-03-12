# Objective Escalation Runbook

## Purpose

Use memory-driven objective escalation to explain why Chess-OS continues, holds, promotes, switches, retires, or repairs an objective.

## Inputs

- objective progress
- objective history
- intervention effectiveness
- intervention memory
- readiness state
- review burden
- recurring pattern pressure

## Outputs

- `out/objective/objective-escalation.json`
- `out/objective/objective-escalation.md`
- escalation-informed session metadata in `out/sessions/<sessionId>/study-session.json`

## Troubleshooting

If escalation artifacts are missing:

1. Run `pnpm typecheck`.
2. Run `pnpm --filter web run build`.
3. Run `pnpm test:e2e`.
4. Run a browser-side `Refresh Insights` or generate a new session.
5. Check Settings > Objective Layer for `Objective Escalation` and `Objective Escalation Markdown`.

If escalation looks wrong:

1. Inspect `objective-progress.json` for baseline lifecycle evidence.
2. Inspect `intervention-memory.json` for repeated failure, repeated success, and oscillation evidence.
3. Inspect `intervention-effectiveness.json` for latest episode outcome.
4. Inspect `objective-escalation.json` for the final verdict and supporting signals.
