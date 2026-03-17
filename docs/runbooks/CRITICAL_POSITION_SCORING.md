# Critical Position Scoring Runbook

Purpose: document how to score and rank critical positions in Chess-OS games.

## Pipeline position

```text
trained model artifacts (out/models/)
 + per-game datasets (out/games/<gameId>/training-dataset.json)
 → load tree model
 → for each game:
   → feature extraction
   → risk scoring (Decision Tree leaf probabilities)
   → criticality scoring (weighted formula)
   → ranking (top N per game)
   → JSON + Markdown artifacts
 → moverIsBlack audit (across full dataset)
```

## Prerequisites

1. Generate the aggregated dataset:

```bash
PGN_DIR=C:/dev/chess-os/data/pgn ENGINE_MODE=stockfish pnpm --filter worker dev
```

2. Train the model:

```bash
pnpm --filter worker run train-model
```

## Running

```bash
pnpm --filter worker run score-critical
```

### Environment variables

| Var | Default | Description |
|-----|---------|-------------|
| `GAME_ID` | (all games) | Score a specific game only |
| `TOP_N` | `5` | Number of top critical positions per game |
| `DATASET_PATH` | `out/datasets/all-games.jsonl` | Dataset for mover color audit |

### Examples

```bash
# Score all games
pnpm --filter worker run score-critical

# Score a single game
GAME_ID=game1 pnpm --filter worker run score-critical

# Top 10 per game
TOP_N=10 pnpm --filter worker run score-critical
```

## Risk scoring method

The risk score for each position is **P(mistake_or_worse)** — the probability that the position leads to a mistake or worse move.

The Decision Tree's `predictProba()` method traverses the tree to the leaf node and returns the stored class probability distribution `[P(not_mistake), P(mistake_or_worse)]`.

The risk score = `P(mistake_or_worse)` = `probabilities[1]`.

This is deterministic: the same feature vector always reaches the same leaf.

## Criticality formula

```
criticalityScore =
    predictedRisk   × 0.50    (model risk signal)
  + evalTension     × 0.20    (near-equality = high stakes)
  + phaseWeight     × 0.15    (middlegame most complex)
  + swingSeverity   × 0.15    (actual damage observed)
```

### Components

| Component | Formula | Range |
|-----------|---------|-------|
| predictedRisk | P(mistake_or_worse) from tree leaf | [0, 1] |
| evalTension | 1 - clamp(\|evalCp\| / 300, 0, 1) | [0, 1] |
| phaseWeight | opening=0.3, middlegame=1.0, endgame=0.7 | {0.3, 0.7, 1.0} |
| swingSeverity | clamp(\|swingCp\| / 300, 0, 1) | [0, 1] |

Maximum possible score: 1.0.

## Output artifacts

| Artifact | Path |
|----------|------|
| Per-game JSON | `out/intelligence/<gameId>/critical-positions.json` |
| Per-game Markdown | `out/intelligence/<gameId>/critical-positions.md` |
| Mover color audit | `out/models/mover-color-audit.json` |

## Package ownership

| Concern | Package |
|---------|---------|
| CriticalPosition types | `@chess-os/training` |
| Risk scoring | `@chess-os/training` |
| Criticality scoring | `@chess-os/training` |
| Ranking | `@chess-os/training` |
| Build orchestration | `@chess-os/training` |
| Mover color audit | `@chess-os/training` |
| Markdown formatting | `@chess-os/training` |
| Export path helpers | `@chess-os/db` |
| CLI entry point | `apps/worker` |
