# CHESS-105A Diff Summary

## Files changed

- Added `packages/training/src/model/train-test-split.test.ts`.
- Did not change `packages/training/src/model/train-test-split.ts`.

## Test cases added

- `splitDataset` is deterministic for the same seed.
- `splitDataset` applies ratio floors and sends the remainder to `test`.
- `splitDataset` does not mutate input row order.
- `stratifiedSplit` preserves class counts across train, validation, and test splits.
- `stratifiedSplit` treats non-`1` targets as class `0`.

## Scope confirmation

- Runtime source was not changed.
- No files outside the CHESS-105A allowed scope were modified.
- No packages were installed.
