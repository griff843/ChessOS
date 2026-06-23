# CHESS-108C Verification

## Worktree checks

- `git diff -- apps/web/src/components/study/completion-recap.tsx`: scoped to the allowed component.
- `git status --short`: only the allowed component changed before proof files were added.
- `pnpm --filter web typecheck`: could not run in the Agent-OS worktree because `--skip-install` left `node_modules` unavailable (`tsc: not found`).
- `pnpm verify`: could not run in the Agent-OS worktree because `--skip-install` left `node_modules` unavailable (`tsc: not found`).

## Main checkout verification

- `pnpm --filter web typecheck`: passed.
- `pnpm verify`: passed.
- `pnpm build`: passed.
