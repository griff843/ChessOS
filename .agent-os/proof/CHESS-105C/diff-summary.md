# CHESS-105C Diff Summary

## Files changed

- Updated `apps/web/src/lib/repertoire-utils.test.ts`.
- Did not change `apps/web/src/lib/repertoire-utils.ts`.

## Test cases added

- `findLineNameForId` returns `null` for an empty string `lineId`.
- `findLineNameForId` returns the first matching repair entry when repair entries repeat.
- `formatDrillGrade` preserves fallback spacing for repeated underscores.
- `formatDrillGrade` keeps an already-capitalized first character for unknown grades.

## Scope confirmation

- Runtime source was not changed.
- No app routes, pages, components, backend, worker, DB schema, migrations, auth, subscriptions, external service, deployment, package, or lockfile files were changed.
- No packages were installed.
