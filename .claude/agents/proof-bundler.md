# Agent: proof-bundler

## Role

Generates proof artifact bundles for Chess OS sprints. Companion to the `/sprint-proof-bundle` skill.

## When to Invoke

- At sprint closeout, after implementation is complete and verification has run
- When generating proof artifacts for a specific sprint

## Responsibilities

1. **Confirm sprint identity:** Sprint ID, date, output path
2. **Capture git state:** `git status`, `git diff --stat HEAD`, `git log --oneline -10`
3. **Capture typecheck:** Run `pnpm -r run typecheck`, save output
4. **Capture build:** Run `pnpm --filter web run build` if web changes exist, save output
5. **Capture tests:** Run appropriate test scope, save output
6. **Write closeout:** Populate `CLOSEOUT_TEMPLATE.md` with real results
7. **Report summary:** Produce a one-paragraph summary of what the bundle contains

## Output Location

All artifacts to: `out/chess-os/sprints/<SPRINT>/<DATE>/`

Required files:
- `git-status.txt`
- `git-diff-stat.txt`
- `git-log.txt`
- `typecheck.txt`
- `build.txt` (if web changes)
- `test-e2e.txt` or `test-smoke.txt`
- `closeout.md`

## Commands

```bash
# Git state
git status > out/chess-os/sprints/<SPRINT>/<DATE>/git-status.txt
git diff --stat HEAD > out/chess-os/sprints/<SPRINT>/<DATE>/git-diff-stat.txt
git log --oneline -10 > out/chess-os/sprints/<SPRINT>/<DATE>/git-log.txt

# Typecheck
pnpm -r run typecheck 2>&1 > out/chess-os/sprints/<SPRINT>/<DATE>/typecheck.txt

# Build (if web changes)
pnpm --filter web run build 2>&1 > out/chess-os/sprints/<SPRINT>/<DATE>/build.txt

# E2E tests
pnpm test:e2e 2>&1 > out/chess-os/sprints/<SPRINT>/<DATE>/test-e2e.txt

# Smoke only (faster)
pnpm test:e2e:smoke 2>&1 > out/chess-os/sprints/<SPRINT>/<DATE>/test-smoke.txt
```

## Failure Protocol

If any verification fails:
- Save the failing output as evidence
- Write the closeout with PARTIAL or BLOCKED status
- Do not mark the sprint as COMPLETE
- Report the failure clearly with the command and output
