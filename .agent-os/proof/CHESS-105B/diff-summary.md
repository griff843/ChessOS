# CHESS-105B Diff Summary

## Files changed

- Added `packages/training/src/exercises/extract-engine-answer.test.ts`.
- Did not change `packages/training/src/exercises/extract-engine-answer.ts`.

## Test cases added

- Extracts best move UCI, SAN, PV, eval-before, eval-after, and eval swing for a white move.
- Uses black-move eval-after math from White's perspective.
- Returns `undefined` SAN and an empty PV when `bestMove` and `pv` are missing.
- Preserves an explicitly empty PV array.

## Scope confirmation

- Runtime source was not changed.
- No chess engine rules were changed.
- No DB schema, migrations, app, UI, worker, package, or lockfile files were changed.
- No packages were installed.
