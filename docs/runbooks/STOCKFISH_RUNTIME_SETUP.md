
## `docs/runbooks/STOCKFISH_RUNTIME_SETUP.md`

```md
# Stockfish Runtime Setup

Purpose: document how Chess OS finds and runs a real Stockfish binary.

## Goals

- support local development
- support explicit binary path override
- fail closed when binary is unavailable

## Resolution order

1. explicit environment variable, e.g. `STOCKFISH_PATH`
2. common executable names on PATH
3. platform-specific fallback checks
4. explicit error if not found

## Rules

- no silent downgrade to stub
- worker must log engine mode clearly
- engine package owns process spawning and UCI communication

## Expected next implementation

- `find-stockfish.ts` resolves binary path
- `uci-process.ts` spawns process and communicates via UCI
- `parse-uci-output.ts` parses `bestmove` / `info depth ... score cp ... pv ...`