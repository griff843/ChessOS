# CHESS-107C Diff Summary

Selected lane: Normalize import theme fallback labels.

Lane type:
- `hygiene`, because the source fallback label formatting needed a tiny user-visible normalization fix.

Files changed:
- `apps/web/src/lib/import-results.ts`
- `apps/web/src/lib/import-results.test.ts`

Implementation behavior changed:
- Added `formatImportThemeLabel`.
- Known import themes still use existing product labels.
- Unknown fallback themes now trim whitespace, normalize hyphens/underscores to spaces, collapse repeated separators, and title-case the result.
- Import theme summaries and game detail themes now share the same fallback formatter.

Test cases added:
- Known tactical and endgame theme labels.
- Unknown snake_case fallback label.
- Unknown hyphenated fallback label.
- Unknown mixed-case fallback label.
- Trimmed/collapsed repeated separator fallback label.
- Empty string fallback.
- Import preset category behavior for tactical and mixed presets.

Scope confirmation:
- No app routes, pages, components, DB schema, migrations, auth, deployment, package files, lockfiles, or external services were changed.
