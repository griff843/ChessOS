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
Use concrete files like `docs/runbooks/LOCAL_VERIFICATION.md`.

Valid examples look like:

```json
{
  "file_scope": [
    "README.md",
    "docs/runbooks/LOCAL_VERIFICATION.md"
  ]
}
```

## Issue queue examples

README-only lane:

```json
{
  "issues": [
    {
      "id": "CHESS-201",
      "title": "Update README contributor note",
      "status": "open",
      "labels": ["ready"],
      "tier": "T2",
      "lane_type": "hygiene",
      "file_scope": ["README.md"]
    }
  ]
}
```

Docs runbook lane with concrete files:

```json
{
  "issues": [
    {
      "id": "CHESS-202",
      "title": "Clarify local verification runbook",
      "status": "open",
      "labels": ["ready"],
      "tier": "T2",
      "lane_type": "hygiene",
      "file_scope": [
        "README.md",
        "docs/runbooks/LOCAL_VERIFICATION.md"
      ]
    }
  ]
}
```

Package script lane:

```json
{
  "issues": [
    {
      "id": "CHESS-203",
      "title": "Adjust root verification script",
      "status": "open",
      "labels": ["ready"],
      "tier": "T2",
      "lane_type": "hygiene",
      "file_scope": ["package.json"]
    }
  ]
}
```

Source-test lane with exact file paths:

```json
{
  "issues": [
    {
      "id": "CHESS-204",
      "title": "Add classifier utility coverage",
      "status": "open",
      "labels": ["ready"],
      "tier": "T2",
      "lane_type": "test",
      "file_scope": [
        "packages/training/src/coach/build-coach-overview.ts",
        "packages/training/src/coach/build-coach-overview.test.ts"
      ]
    }
  ]
}
```

Invalid directory scope:

```json
{
  "file_scope": ["docs/"]
}
```

Use `docs/runbooks/LOCAL_VERIFICATION.md` instead of `docs/`, and list every source or test file explicitly.
