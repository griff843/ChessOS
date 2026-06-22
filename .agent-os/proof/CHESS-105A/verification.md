# CHESS-105A Verification

## Commands run

```bash
git diff -- packages/training/src/model/train-test-split.ts packages/training/src/model/train-test-split.test.ts
git status --short
pnpm exec tsx packages/training/src/model/train-test-split.test.ts
pnpm verify
```

## Narrow test result

`pnpm exec tsx packages/training/src/model/train-test-split.test.ts` passed:

- 5 passed
- 0 failed

## Worktree verify result

`pnpm verify` could not complete in the Agent-OS worktree because dependencies were unavailable:

- `tsc` was not found.
- pnpm warned that `node_modules` is missing.

No packages were installed. This is consistent with a `--skip-install` worktree.

## Main checkout follow-up

Run `pnpm exec tsx packages/training/src/model/train-test-split.test.ts`, `pnpm verify`, and `pnpm build` from the main checkout after copying files back.
