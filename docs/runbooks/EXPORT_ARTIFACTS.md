
## `docs/runbooks/EXPORT_ARTIFACTS.md`

```md
# Export Artifacts Runbook

Purpose: document how evaluated pipeline output is persisted during M1C.

## Initial persistence mode

M1C uses JSON artifact export as the first persistence mechanism.

Example flow:

```text
PGN -> snapshots -> evaluated positions -> JSON artifact

Why JSON first

durable output immediately

easy to inspect

easy to diff

easy to use for later DB ingestion

avoids premature database coupling

Expected output location

Suggested location:

out/games/<game-id>/evaluated-positions.json

Rules

export path generation belongs in package code, not worker

file writing must fail explicitly on error

worker should log final artifact path

future DB persistence must preserve the same export contract