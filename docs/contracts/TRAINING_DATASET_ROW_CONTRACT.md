# Training Dataset Row Contract

Purpose: define the canonical row structure for the training dataset produced by the Chess-OS pipeline.

## Row structure

Each row represents one classified move: the pre-move position, the move played, and its classification.

```ts
interface TrainingDatasetRow {
  // Position identity (pre-move position)
  gameId: string
  positionId: string
  ply: number
  fen: string
  mover: "white" | "black"

  // The move played from this position
  moveSan: string

  // Engine evaluation of the pre-move position
  evalCp: number
  depth: number
  bestMove?: string
  pv?: string[]

  // Move classification
  swingCp: number
  label: "best_or_ok" | "inaccuracy" | "mistake" | "blunder"
  phase: "opening" | "middlegame" | "endgame"

  // Full feature vector of the pre-move position
  features: FeatureVector
}
```

## Field semantics

| Field | Source | Description |
|-------|--------|-------------|
| `gameId` | EvaluatedPosition | Game identifier |
| `positionId` | EvaluatedPosition | Deterministic position ID (`<gameId>:<ply>`) |
| `ply` | MistakeClassification | Ply number of the move (1-indexed) |
| `fen` | EvaluatedPosition | FEN of the position before the move |
| `mover` | EvaluatedPosition | Side that played the move |
| `moveSan` | MistakeClassification | Move in standard algebraic notation |
| `evalCp` | EvaluatedPosition | Engine eval in centipawns (White perspective) |
| `depth` | EvaluatedPosition | Engine search depth |
| `bestMove` | EvaluatedPosition | Engine's recommended move (UCI notation) |
| `pv` | EvaluatedPosition | Principal variation (UCI notation) |
| `swingCp` | MistakeClassification | Centipawn swing from mover's perspective |
| `label` | MistakeClassification | Calibrated mistake label |
| `phase` | MistakeClassification | Game phase at time of move |
| `features` | FeatureVector | Full feature vector (see FEATURE_VECTOR types) |

## Row count

N evaluated positions produce N-1 dataset rows. The first position has no preceding eval for comparison, so it is not classified.

## Artifact formats

### Per-game JSON (with envelope)

```ts
interface TrainingDatasetExport {
  gameId: string
  source: { format: "pgn" }
  engine: { mode: string; name: string; depth: number }
  createdAt: string
  rowCount: number
  rows: TrainingDatasetRow[]
}
```

Output path: `out/games/<gameId>/training-dataset.json`

### Per-game JSONL (rows only)

One `TrainingDatasetRow` per line, no envelope. Preferred for streaming.

Output path: `out/games/<gameId>/training-dataset.jsonl`

### Aggregated JSONL (batch mode)

All rows from all processed games, appended in file-alphabetical order.
Streaming write — only one game's rows in memory at a time.

Output path: `out/datasets/all-games.jsonl`

## Rules

- Row generation must be deterministic
- All transform functions are pure (no I/O)
- Dataset builder lives in `@chess-os/training`; persistence in `@chess-os/db`
- Features are nested (not flattened) to preserve type boundaries
- Optional fields (`bestMove`, `pv`) are omitted cleanly when absent
