# CHESS-108C Diff Summary

## Candidate

CHESS-108C adds next-step CTAs to the study completion recap.

## Files changed

- `apps/web/src/components/study/completion-recap.tsx`

## UI behavior changed

- Replaced the passive footer action row with a dedicated `Next Steps` section.
- Added clear post-completion routes for:
  - starting the next session via `/sessions`
  - returning to the dashboard via `/`
  - reviewing games via `/games`
  - opening Coach via `/coach`
- Kept the existing refresh-insights action in the recap.

## Scope notes

No grading logic, completion persistence, schema, migrations, auth, deployment, package files, or external integrations were changed.
