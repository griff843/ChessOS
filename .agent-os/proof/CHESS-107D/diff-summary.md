# CHESS-107D Diff Summary

Selected lane: Clarify repertoire no-match repair copy.

Files changed:
- `packages/training/src/repair/build-repertoire-branch-repair.ts`
- `packages/training/src/repair/build-repertoire-branch-repair.test.ts`

Implementation behavior changed:
- No repair selection, matching, confidence, drill-line, or chess logic changed.
- The no-match explanation copy is clearer for opening memory failures.
- The no-match explanation copy is clearer for opening concept failures.

Tests added/updated:
- Strengthened the opening memory no-match test to assert exact fallback copy while preserving `matched=false`, `drillLineId=null`, and `repairMode=line_recall`.
- Added an opening concept no-match test asserting exact fallback copy while preserving `matched=false`, `drillLineId=null`, and `repairMode=concept_review`.

Scope confirmation:
- No DB schema, migrations, auth, deployment, package files, lockfiles, external services, or chess engine rules were changed.
