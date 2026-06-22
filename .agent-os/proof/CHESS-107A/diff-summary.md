# CHESS-107A Diff Summary

Selected lane: Show completed session timestamp on Sessions dashboard.

Why safe:
- One user-visible Sessions page display fix.
- No DB schema, migrations, auth, deployment, external integrations, or chess engine rules touched.
- Exact file scope was `apps/web/src/app/sessions/page.tsx`.

Files changed:
- `apps/web/src/app/sessions/page.tsx`

Implementation behavior changed:
- The Completed metric now displays the latest session completion timestamp from `results.completedAt`.
- The completed-session list reuses the same sorted completed-session order instead of sorting the completed sessions inline twice.

Tests added/updated:
- None. This was a small page display fix with no existing page-level unit test harness.
