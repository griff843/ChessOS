# Objective Portfolio Runbook

## Purpose

Use the objective portfolio to explain which objective is active, which are rotating in, and which are paused or held.

## Inputs

- objective candidate scores
- objective history
- escalation artifact
- intervention memory
- readiness
- recurrence pressure
- review burden

## Outputs

- `out/objective/objective-portfolio.json`
- `out/objective/objective-portfolio.md`
- portfolio-informed session metadata in `out/sessions/<sessionId>/study-session.json`

## Checks

1. Run `pnpm typecheck`.
2. Run `pnpm --filter web run build`.
3. Run `pnpm test:e2e`.
4. Inspect `objective-portfolio.json` for ranking, rotation decisions, and training shares.
5. Confirm dashboard, coach, curriculum, and settings render the portfolio artifact.
