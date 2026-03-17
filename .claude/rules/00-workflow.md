# Rule 00 — Sprint Workflow

> **Authority:** This rule governs how Chess OS sprints are executed from start to close.

---

## Sprint Phase Flow

All sprints follow this sequence:

```
SELECT → SHAPE → IMPLEMENT → VERIFY → PROVE → SYNC → CLOSE
```

| Phase | Tool | Output |
|---|---|---|
| SELECT | `/sprint-plan` | Chosen sprint + model routing |
| SHAPE | `/prompt-compose` | Structured implementation prompt |
| IMPLEMENT | Claude Code | Code changes in repo |
| VERIFY | `pnpm -r run typecheck` + build + tests | Verification results |
| PROVE | `/sprint-proof-bundle` | Proof bundle in `out/chess-os/sprints/` |
| SYNC | `/status-sync` | Updated status docs |
| CLOSE | Git commit (if committing) | Tagged implementation |

---

## Definition of Done

A sprint is complete when ALL of the following are true:

1. Implementation exists in the repo
2. `pnpm -r run typecheck` passes (no new errors from this sprint)
3. `pnpm --filter web run build` passes (if web changes landed)
4. Relevant tests pass
5. Proof bundle exists in `out/chess-os/sprints/<SPRINT>/<DATE>/`
6. `CURRENT_SYSTEM_STATUS.md` reflects the new state
7. `NEXT_STEPS.md` reflects completed and remaining work

---

## What "Claiming Done" Requires

You may NOT claim a sprint is complete based on:
- "I believe it works"
- "The code looks right"
- "It worked during development"

You MUST have:
- Typecheck output (saved)
- Build output (saved) if web changes
- Test results (saved)
- Closeout.md written

---

## Commit Discipline

Only commit when explicitly requested. When committing:
- Reference the sprint ID in the commit message
- Do not force-push to main/master
- Do not amend published commits

---

## Scope Discipline

Before implementation begins, confirm:
- Scope is explicit (named files or subsystems)
- Non-goals are explicit
- Source of truth is named

If scope is not explicit, run `/prompt-compose` before starting.
