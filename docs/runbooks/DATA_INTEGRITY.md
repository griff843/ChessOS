# Data Integrity Runbook

> Diagnosing and recovering from corrupt or missing artifacts

## Quick Diagnosis

1. Open **Settings** page — artifact health panel shows:
   - Green = exists and valid
   - Amber = exists but corrupt (shows error detail)
   - Red = missing
2. Check server console for `[chess-os]` warnings (logged on corrupt JSON/JSONL)

## Common Scenarios

### Corrupt JSON Artifact

**Symptoms:** Page shows empty state despite file existing. Console shows `[chess-os] Corrupt artifact: <path>`.

**Recovery:**
1. Delete the corrupt file
2. Re-run the generation step that produces it:
   - Dashboard artifacts: Click "Refresh Insights" in Settings
   - Progress artifacts: Complete a study session
   - Pipeline artifacts: Re-run the worker pipeline

### Corrupt JSONL Line

**Symptoms:** `safeParseJsonl` logs `[chess-os] Skipped N bad lines in <path>`. Most data loads normally — only the corrupt line(s) are skipped.

**Recovery (optional):**
1. Open the JSONL file in a text editor
2. Find lines that are not valid JSON (often truncated last line from crash)
3. Delete or fix the bad lines
4. No regeneration needed — file is usable with bad lines removed

### Truncated Write (Crash Recovery)

**Symptoms:** `.tmp` file exists alongside the main file.

**Recovery:**
- The `.tmp` file is a partial write that was never renamed. Delete it.
- The main file (without `.tmp`) is the last good version.
- `atomicWriteFile` ensures the main file is never partially written.

### Missing Artifacts After Pipeline Run

**Check order:**
1. Verify the pipeline ran to completion (no errors in worker output)
2. Check `out/` directory structure exists
3. Verify exercise corpus: `out/datasets/training-exercises.jsonl`
4. Verify progress store: `out/progress/exercise-progress.json`
5. Verify insights: `out/dashboard/learner-overview.json`

**Regeneration order:**
1. Pipeline data: `ENGINE_MODE=stockfish PGN_DIR=... pnpm --filter worker dev`
2. Training targets: `pnpm --filter worker run generate-targets`
3. Exercises: `pnpm --filter worker run generate-exercises`
4. Session + solve: `pnpm --filter worker run generate-session` → `pnpm --filter worker run solve-session`
5. Insights: Click "Refresh Insights" in web UI

## Atomic Write Protection

All JSON artifact writes use `atomicWriteFile` (write to `.tmp`, then rename):
- `generation.ts` — 11 calls (session, dashboard, coach, curriculum artifacts)
- `study-server.ts` — 4 calls (results, analytics, progress, review queue)
- `write-json-file.ts` — worker pipeline output
- `write-jsonl-file.ts` — worker JSONL output (initial writes only; appends use `appendFile`)

JSONL appends (`appendFile`) are NOT atomic. `safeParseJsonl` handles truncated last lines gracefully.

## Validation Rules

Each artifact is validated on load using type guards that check required top-level keys. See `docs/contracts/DATA_INTEGRITY_CONTRACT.md` for the full validator table.

Validation happens:
- **On every page load** — corrupt artifacts show empty state + console warning
- **In Settings health check** — validates all 16 artifacts and shows status
- **In `checkArtifactHealth()`** — programmatic access for diagnostics
