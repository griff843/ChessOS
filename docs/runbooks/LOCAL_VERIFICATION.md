# Local Verification

Use this runbook before starting or closing Agent-OS lanes in ChessOS.

## Setup

Install workspace dependencies from the main checkout:

```bash
pnpm install
```

Do not install dependencies inside Agent-OS `--skip-install` worktrees.

## Verification commands

Run these commands from the main checkout:

```bash
pnpm verify
pnpm build
pnpm exec agent-os doctor --strict
pnpm exec agent-os board
```

`pnpm verify` is the default Agent-OS verification command for ChessOS and delegates to `pnpm build`.

## Clean state

A clean lane state means:

- `git status --short` shows no unexpected changes before starting a lane.
- `pnpm exec agent-os doctor --strict` reports no findings.
- `pnpm exec agent-os board` reports `active_lanes: 0` before starting a lane and after closing it.
- `pnpm verify` and `pnpm build` pass from the main checkout before committing and pushing lane results.

Stop before starting a new lane if any of those checks fail.

## Agent-OS files

Agent-OS lane state lives under `.agent-os/lanes/`.
Lane proof files live under `.agent-os/proof/<issue-id>/`.
Lease files may live under `.ops/leases/`.

Do not commit `.out/`; it contains local Agent-OS worktrees and generated control artifacts.

## File scopes

Use concrete file scopes only. Do not use directory scopes such as `docs/`.

Valid examples look like:

```json
{
  "file_scope": [
    "README.md",
    "docs/runbooks/LOCAL_VERIFICATION.md"
  ]
}
```
