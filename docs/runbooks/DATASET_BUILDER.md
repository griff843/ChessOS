# Dataset Builder Runbook

Purpose: document the training dataset generation stage for Chess-OS.

## Pipeline position

```text
PGN
 → snapshots          (stage 1, chess-core)
 → engine evaluation  (stage 2, engine)
 → export artifact    (stage 3, db)
 → feature extraction (stage 4, classifier)
 → classification     (stage 5, classifier)
 → dataset generation (stage 6, training + db)
```

## Inputs

The dataset builder consumes three aligned arrays from the upstream pipeline:

| Input | Type | Count | Source |
|-------|------|-------|--------|
| Evaluated positions | `EvaluatedPosition[]` | N | Stage 2 |
| Feature vectors | `FeatureVector[]` | N | Stage 4 |
| Classifications | `MistakeClassification[]` | N-1 | Stage 5 |

## Row generation logic

For each index `i` from 0 to N-2:

1. Take `evaluated[i]` as the pre-move position
2. Take `features[i]` as the position's feature vector
3. Take `classifications[i]` as the move's classification
4. Combine into one `TrainingDatasetRow`

The row captures: what the board looked like, what move was played, how the engine evaluated it, and how it was classified.

## Output artifacts

### Per-game (stage 6)

| Format | Path |
|--------|------|
| JSON | `out/games/<gameId>/training-dataset.json` |
| JSONL | `out/games/<gameId>/training-dataset.jsonl` |

JSON example:
```json
{
  "gameId": "sample-game-001",
  "source": { "format": "pgn" },
  "engine": { "mode": "stockfish", "name": "stockfish", "depth": 20 },
  "createdAt": "2026-03-06T...",
  "rowCount": 39,
  "rows": [ ... ]
}
```

JSONL: one `TrainingDatasetRow` per line, no envelope.

### Aggregated dataset (batch mode)

| Format | Path |
|--------|------|
| JSONL | `out/datasets/all-games.jsonl` |

Rows from all processed games appended in file-alphabetical order. Streaming write — only one game's rows in memory at a time.

## Package ownership

| Concern | Package |
|---------|---------|
| Row types | `@chess-os/training` |
| `buildDatasetRow()` | `@chess-os/training` |
| `buildGameDataset()` | `@chess-os/training` |
| JSON/JSONL persistence | `@chess-os/db` |
| Batch orchestration | `apps/worker` |

## Running

### Single-game mode

```bash
# Stub engine (fast, deterministic)
pnpm --filter worker dev

# Real Stockfish
ENGINE_MODE=stockfish pnpm --filter worker dev
```

### Batch mode

```bash
# Process a directory of PGN files
PGN_DIR=data/pgn pnpm --filter worker dev

# With Stockfish
PGN_DIR=data/pgn ENGINE_MODE=stockfish pnpm --filter worker dev
```

Environment variables:

| Var | Default | Description |
|-----|---------|-------------|
| `PGN_DIR` | (none) | Directory of PGN files. If set, runs batch mode. |
| `ENGINE_MODE` | `stub` | Engine mode: `stub` or `stockfish` |

### Expected batch output

```
[worker] batch: 3 PGN file(s) in data/pgn  engine=stub
[worker] ── game 1/3: game1.pgn ──
...
[worker] ══ batch complete ══
[worker]   games processed: 3
[worker]   total positions evaluated: 60
[worker]   total dataset rows: 57
[worker]   aggregated dataset: out/datasets/all-games.jsonl
```
