# CHESS-101 Verification

## Required commands

```bash
git diff -- README.md
git status --short
pnpm build
```

## Worktree results

- `git diff -- README.md` showed only the README Agent-OS validation note.
- `git status --short` showed only `README.md` modified before proof files were created.
- `pnpm build` failed in this worktree because dependencies were unavailable: `tsc` was not found and pnpm warned that local `package.json` exists but `node_modules` is missing.

## Dependency handling

- No packages were installed.
- The build failure is consistent with a `--skip-install` worktree where dependencies are unavailable.

## Main checkout follow-up

- Main checkout verification must run after copying files back.
