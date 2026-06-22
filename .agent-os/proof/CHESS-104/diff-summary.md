# CHESS-104 Diff Summary

## Repo content changes

- `README.md` now notes that the local verification runbook includes Agent-OS issue queue examples.
- `docs/runbooks/LOCAL_VERIFICATION.md` now includes valid `.agent-os/issues.json` examples for README-only, docs runbook, package script, and source-test lanes.
- The runbook explicitly warns that directory scopes such as `docs/` are invalid and concrete file paths are required.

## Scope confirmation

- Changed repo files are limited to `README.md` and `docs/runbooks/LOCAL_VERIFICATION.md`.
- No app/source code, schemas, migrations, deployment files, or package files were changed.

## Main checkout follow-up

- Main checkout verification must run after copying files back.
