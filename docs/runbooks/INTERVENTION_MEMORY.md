# Intervention Memory Runbook

## Purpose
Intervention memory tracks how repeated intervention episodes perform over time so Chess-OS can escalate from continue/strengthen into reverse, replace, or switch-objective recommendations when patterns keep failing.

## Generated Outputs
- `out/objective/intervention-memory.json`
- `out/objective/intervention-history.jsonl`
- `out/objective/intervention-effectiveness.json`
- session metadata in `out/sessions/<sessionId>/study-session.json`

## Engine Flow
1. Build objective session evidence from completed sessions.
2. Group completed sessions into intervention episodes.
3. Derive pre/post/compare snapshots per episode.
4. Score episode outcomes and repeated-pattern flags.
5. Summarize family performance and next-action recommendation.
6. Feed the latest recommendation back into session-generation coaching.

## Verification
Run:
```powershell
pnpm typecheck
pnpm --filter web run build
pnpm test:e2e
```

Check artifacts:
- `out/objective/intervention-memory.json`
- `out/objective/intervention-history.jsonl`
- `out/objective/intervention-effectiveness.json`
- `out/sessions/<sessionId>/study-session.json`

## Diagnostics
- Missing `intervention-memory.json`: refresh insights or generate a new session.
- Malformed memory artifact: settings diagnostics should mark the artifact invalid without crashing routes.
- Empty `episodes`: no completed intervention-tagged sessions are available yet.
