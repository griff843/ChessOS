# Rule 01 — Safety and Proof

> **Authority:** This rule governs verification standards and proof discipline for Chess OS.

---

## Proof Is Non-Negotiable

No sprint is complete without proof. The following are the minimum required proof artifacts:

| Artifact | Required When |
|---|---|
| `git-status.txt` | Always |
| `typecheck.txt` | Always |
| `build.txt` | When web app changes |
| `test-e2e.txt` or `test-smoke.txt` | When user-facing changes or new features |
| `closeout.md` | Always |

Proof location: `out/chess-os/sprints/<SPRINT>/<DATE>/`

---

## Forbidden Claims

These claims are forbidden in closeout reports without corresponding evidence:

| Claim | What Is Required Instead |
|---|---|
| "Tests pass" | Saved `test-e2e.txt` showing pass count |
| "Typecheck is clean" | Saved `typecheck.txt` showing exit 0 |
| "Build succeeds" | Saved `build.txt` showing successful build |
| "Everything is working" | Named verification steps for each claim |

---

## Verification Commands

```bash
# Typecheck
pnpm -r run typecheck

# Build (web)
pnpm --filter web run build

# Full E2E suite
pnpm test:e2e

# Smoke only
pnpm test:e2e:smoke
```

---

## What Counts as Partial

A sprint may be closed as PARTIAL when:
- The core objective is met
- Known gaps are explicitly documented in the closeout
- Status docs reflect what was actually done (not what was planned)

PARTIAL is honest. Do not inflate PARTIAL to COMPLETE.

---

## Safety Rules

| Rule | Description |
|---|---|
| No force-push to main/master | Always confirm with user first |
| No `--no-verify` hook bypass | Fix the hook issue instead |
| No `git reset --hard` without confirmation | Destructive operation |
| No deletion of `out/` artifacts | Artifacts are proof; preserve them |
| No silent breaking changes to exported types | Document type changes explicitly |

---

## When Verification Fails

If verification fails:
1. Save the failing output as evidence (do not discard it)
2. Do not write a COMPLETE closeout
3. Write BLOCKED with the failure documented
4. Investigate root cause before retrying
5. Fix the issue and re-run verification from the top
