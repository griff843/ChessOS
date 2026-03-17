# Skill: sprint-proof-bundle

> **Portability:** Chess OS adaptation of portable sprint-proof-bundle pattern
> **Invocation:** `/sprint-proof-bundle`
> **When to use:** At sprint closeout, after implementation and verification are complete.

---

## Purpose

Generate a complete proof bundle for a finished sprint. Captures all evidence that the sprint is actually done: git status, typecheck, build, test results, and a closeout report.

---

## When to Use

Use after:
- Implementation is complete
- You believe the sprint meets its success criteria
- You are ready to update status docs and tag the sprint

Do not use mid-sprint as a progress check. This is a closeout tool.

---

## Step-by-Step Procedure

### Step 1 — Identify Sprint

Confirm the sprint ID and date:
- Sprint ID: `<MILESTONE-ID>-<short-description>` (e.g., `M-AI-01-truth-wiring`)
- Date: `YYYY-MM-DD`
- Output path: `out/chess-os/sprints/<SPRINT>/<DATE>/`

Create the output directory if it does not exist.

---

### Step 2 — Capture Git Status

```bash
git status > out/chess-os/sprints/<SPRINT>/<DATE>/git-status.txt
git diff --stat HEAD > out/chess-os/sprints/<SPRINT>/<DATE>/git-diff-stat.txt
git log --oneline -10 > out/chess-os/sprints/<SPRINT>/<DATE>/git-log.txt
```

---

### Step 3 — Capture Typecheck

```bash
pnpm -r run typecheck 2>&1 | tee out/chess-os/sprints/<SPRINT>/<DATE>/typecheck.txt
```

Record: PASS or FAIL + error count.

---

### Step 4 — Capture Build

```bash
pnpm --filter web run build 2>&1 | tee out/chess-os/sprints/<SPRINT>/<DATE>/build.txt
```

Record: PASS or FAIL.

---

### Step 5 — Capture Test Results

Run the most relevant test scope for the sprint:

```bash
# Full E2E suite:
pnpm test:e2e 2>&1 | tee out/chess-os/sprints/<SPRINT>/<DATE>/test-e2e.txt

# Smoke only (faster):
pnpm test:e2e:smoke 2>&1 | tee out/chess-os/sprints/<SPRINT>/<DATE>/test-smoke.txt
```

Record: pass count / total, any failures.

---

### Step 6 — Write Closeout Report

Create `out/chess-os/sprints/<SPRINT>/<DATE>/closeout.md` using this template:

```markdown
# Sprint Closeout: <SPRINT-ID>

**Date:** <YYYY-MM-DD>
**Branch:** <git branch>
**Status:** COMPLETE / PARTIAL / BLOCKED

## Objective
<What the sprint was trying to accomplish>

## What Was Done
- <Item 1>
- <Item 2>

## Verification Results
| Check | Result |
|---|---|
| Typecheck | PASS / FAIL |
| Build | PASS / FAIL |
| E2E Tests | N pass / N total |
| Smoke Tests | N pass / N total |

## Proof Artifacts
- `git-status.txt`
- `git-diff-stat.txt`
- `git-log.txt`
- `typecheck.txt`
- `build.txt`
- `test-e2e.txt` or `test-smoke.txt`

## Open Gaps / Non-Goals Not Delivered
<Anything explicitly out of scope or discovered as a gap>

## Next Step
<What comes next — from NEXT_STEPS.md or newly identified>
```

---

### Step 7 — Update Status Docs

After the proof bundle is complete:
- Run `/status-sync <SPRINT-ID>` to update status docs
- Or manually update `CURRENT_SYSTEM_STATUS.md`, `PHASE_STATUS.md`, `NEXT_STEPS.md`

---

## Output

A complete proof bundle directory at `out/chess-os/sprints/<SPRINT>/<DATE>/` containing:
- `git-status.txt`
- `git-diff-stat.txt`
- `git-log.txt`
- `typecheck.txt`
- `build.txt`
- `test-e2e.txt` or `test-smoke.txt`
- `closeout.md`

---

## Failure Protocol

If any verification step fails:
- Do not write a COMPLETE closeout report
- Write PARTIAL or BLOCKED with the failure documented
- Do not update status docs to reflect the sprint as done
- Investigate and fix before re-running the proof bundle
