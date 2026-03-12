# Training Target Generation Runbook

## Prerequisites

1. Training pipeline complete (`pnpm --filter worker run train-model`)
2. Ablation study complete (`pnpm --filter worker run run-ablation`)
3. Per-game training datasets exist in `out/games/<gameId>/training-dataset.json`

## Run

```bash
pnpm --filter worker run generate-targets
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GAME_ID` | (all games) | Process a single game |
| `TOP_N` | `10` | Max targets per game |

### Examples

```bash
# All games, default top 10
pnpm --filter worker run generate-targets

# Single game
GAME_ID=game1 pnpm --filter worker run generate-targets

# More targets per game
TOP_N=20 pnpm --filter worker run generate-targets
```

## Artifacts

### Per-game (under `out/intelligence/<gameId>/`)

| File | Format | Description |
|------|--------|-------------|
| `training-targets.json` | JSON | Full target data with priority factors |
| `training-targets.md` | Markdown | Human-readable report |

### Aggregated (under `out/datasets/`)

| File | Format | Description |
|------|--------|-------------|
| `training-targets.jsonl` | JSONL | One target per line, all games |

## Production Scoring

Scoring uses the Config B decision tree from the M5B ablation study:
- Tree artifact: `out/models/feature-ablation.json` → `configs[1].treeParams`
- Excluded features: `moverIsBlack`
- This ensures no color-based prediction bias in training target selection

## Target Types

| Type | Condition | Training Goal |
|------|-----------|---------------|
| `blunder` | Label is blunder | Recognize catastrophic errors |
| `mistake` | Label is mistake | Improve accuracy under pressure |
| `inaccuracy` | Label is inaccuracy | Sharpen precision |
| `critical_test` | Label is best_or_ok, risk >= 40% | Practice handling dangerous positions |

## Pipeline Integration

```
PGN → snapshots → eval → features → classify → dataset → train → ablation → targets
                                                                               ↑ M5C
```
