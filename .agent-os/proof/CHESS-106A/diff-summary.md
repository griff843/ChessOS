# CHESS-106A Diff Summary

## Selected candidate

CHESS-106A: Label failed repertoire recall consistently.

## Why this was safe

- The change is limited to a pure display helper in `apps/web/src/lib/repertoire-utils.ts`.
- Repertoire drill results use `failed_recall`, while the helper only special-cased `failed`.
- The fix only maps `failed_recall` to the existing failed-recall display message.
- No app routes, pages, components, backend, worker, DB schema, migrations, auth, subscriptions, external services, deployment behavior, package files, or lockfiles were changed.

## Files changed

- `apps/web/src/lib/repertoire-utils.ts`
- `apps/web/src/lib/repertoire-utils.test.ts`

## Implementation behavior changed

- `formatDrillGrade("failed_recall")` now returns `Not recalled — review this line soon` instead of the generic fallback `Failed recall`.

## Test cases added

- Added a focused assertion for `formatDrillGrade("failed_recall")`.
