# Evidence Rules — Sprint Proof Bundle

> **Authority:** These rules define what constitutes valid proof for a Chess OS sprint.

---

## Rule 1 — Proof Is Required

No sprint is complete without proof artifacts. "It works on my machine" is not proof.

---

## Rule 2 — Minimum Proof Bundle

Every sprint must have at minimum:

| Artifact | Required |
|---|---|
| `git-status.txt` | Always |
| `typecheck.txt` | Always |
| `build.txt` | Always (web changes) |
| `closeout.md` | Always |
| `test-e2e.txt` or `test-smoke.txt` | When E2E suite is relevant |

---

## Rule 3 — Typecheck Must Pass

A sprint is not complete if `pnpm -r run typecheck` fails.

Exception: if a typecheck failure is a pre-existing issue (not introduced by this sprint), document it explicitly in the closeout and reference the known issue.

---

## Rule 4 — Build Must Pass

A sprint that touches the web app is not complete if `pnpm --filter web run build` fails.

---

## Rule 5 — Test Failures Must Be Explained

If tests fail:
- Document each failure in the closeout
- Confirm whether the failure is pre-existing or introduced by this sprint
- If introduced: the sprint is BLOCKED, not COMPLETE

---

## Rule 6 — No Claim Without Evidence

Forbidden claims in a closeout:
- "Tests should pass" — run them and capture output
- "Typecheck looks clean" — run it and save the output
- "Build is fine" — build it and save the output
- "Everything is working" — name what you verified

---

## Rule 7 — Proof Location

All proof artifacts must be saved to:

```
out/chess-os/sprints/<SPRINT>/<DATE>/
```

Proofs in other locations are not canonical.

---

## Rule 8 — Partial Is Valid

A sprint can be marked PARTIAL when:
- Core objective is met
- Known gaps are explicitly documented
- Status docs reflect what is actually done, not what was planned

Do not mark COMPLETE when work is partial. Honest PARTIAL is better than inflated COMPLETE.
