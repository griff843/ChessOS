# Web Study Session Runbook

## Prerequisites

- Study sessions generated: `pnpm --filter worker run generate-session`
- Training exercises generated: `pnpm --filter worker run generate-exercises`
- Both produce artifacts under `out/sessions/` and `out/datasets/training-exercises.jsonl`

## Run Dev Server

```bash
cd apps/web
npx next dev --webpack -p 3001
# or via pnpm:
pnpm --filter web run dev
```

> **Note:** The `--webpack` flag is required because workspace packages use `.js` extension imports (TypeScript ESM convention) and Turbopack doesn't support `resolve.extensionAlias`.

## Study a Session

1. Navigate to `http://localhost:3001/sessions`
2. Click a pending session's "Study Now" link
3. Or go directly: `http://localhost:3001/study/<sessionId>`

## Build for Production

```bash
pnpm --filter web run build
# Uses --webpack flag automatically
```

## Typecheck

```bash
pnpm --filter web run typecheck
```

## Study Flow

1. **Exercise loads** — Board shows position, right panel shows exercise metadata
2. **Make a move** — Click a piece to see legal moves (dots), click a target square
3. **Receive feedback** — Grading tier (exact/acceptable/inaccuracy/mistake/blunder), your move vs best move
4. **Continue** — Click "Continue" or press Enter
5. **Repeat** for all exercises
6. **Completion** — Recap screen with accuracy, grade distribution, hardest misses, mastery changes
7. **Results persisted** — Progress store, session history, and review queue updated on disk

## Keyboard Shortcuts

- **Enter** — Continue to next exercise (in feedback phase)
- **Escape** — Dismiss invalid move banner

## Troubleshooting

### Study page returns 500
- Check that `out/datasets/training-exercises.jsonl` exists
- Check that the session ID exists under `out/sessions/<sessionId>/study-session.json`
- Check dev server console for module resolution errors

### Module not found errors
- Ensure `next.config.js` has the `webpack.resolve.extensionAlias` configuration
- Ensure dev/build commands use `--webpack` flag

### Move submission fails
- Check browser console for server action errors
- Verify `@chess-os/chess-core` and `@chess-os/training` are in `transpilePackages`
