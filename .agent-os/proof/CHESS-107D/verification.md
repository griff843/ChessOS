# CHESS-107D Verification

Worktree checks:
- `git diff -- packages/training/src/repair/build-repertoire-branch-repair.ts packages/training/src/repair/build-repertoire-branch-repair.test.ts` showed only the scoped copy/test changes.
- `git status --short` showed only the two scoped files before proof files were added.

Narrow test:
- Command:
  - `pnpm exec tsx /home/griff843/code/ChessOS/.out/worktrees/codex__chess-107d-agent-os-loop/packages/training/src/repair/build-repertoire-branch-repair.test.ts`
- Result:
  - 10 passed, 0 failed.

Worktree `pnpm verify`:
- Attempted from the CHESS-107D worktree.
- Failed only because `--skip-install` left the worktree without `node_modules`; workspace build scripts could not find `tsc`.
- No packages were installed.

Required main checkout verification:
- Copy the scoped source/test and proof files back to `/home/griff843/code/ChessOS`.
- Close CHESS-107D.
- Run `pnpm verify` and `pnpm build` from the main checkout before commit and push.
