# CHESS-107B Verification

Worktree checks:
- `git diff -- apps/web/src/lib/session-label.ts apps/web/src/lib/session-label.test.ts` showed no tracked source diff because the test file is new and untracked in the worktree before closeout.
- `git status --short` showed `apps/web/src/lib/session-label.test.ts` plus proof files.
- Narrow test passed from the main checkout dependency context:
  - `pnpm exec tsx /home/griff843/code/ChessOS/.out/worktrees/codex__chess-107b-agent-os-loop/apps/web/src/lib/session-label.test.ts`
  - Result: 7 passed, 0 failed.

Worktree `pnpm verify`:
- Attempted from the CHESS-107B worktree.
- Failed only because `--skip-install` left the worktree without `node_modules`; `tsc` was not found by workspace build scripts.
- No packages were installed.

Required main checkout verification:
- Copy the test and proof files back to `/home/griff843/code/ChessOS`.
- Close CHESS-107B.
- Run `pnpm verify` and `pnpm build` from the main checkout before commit and push.
