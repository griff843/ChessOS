# Model Training Runbook

Purpose: document the model training pipeline for Chess-OS.

## Pipeline position

```text
aggregated dataset (all-games.jsonl)
 → load dataset
 → stratified shuffled split (80/10/10, seed=42)
 → feature extraction (30 numeric features)
 → standardization (mean/std on train set, for logistic only)
 → train Logistic Regression (class-weighted)
 → train Decision Tree
 → evaluation (accuracy, precision, recall, F1)
 → feature importance (impurity-based, from Decision Tree)
 → threshold tuning (0.10–0.90 on validation set)
 → 5-fold stratified cross-validation
 → model artifacts + analysis artifacts + evaluation report
```

## Prerequisites

Generate the aggregated dataset first:

```bash
PGN_DIR=C:/dev/chess-os/data/pgn ENGINE_MODE=stockfish pnpm --filter worker dev
```

This creates `out/datasets/all-games.jsonl`.

## Running

```bash
pnpm --filter worker run train-model
```

Or with a custom dataset path:

```bash
DATASET_PATH=path/to/dataset.jsonl pnpm --filter worker run train-model
```

## Models

### Logistic Regression (class-weighted)

| Field | Value |
|-------|-------|
| Type | Logistic Regression |
| Target | Binary: mistake_or_worse vs not_mistake |
| Features | 30 numeric features from FeatureVector |
| Standardization | Mean/std normalization (computed on train set) |
| Epochs | 200 |
| Learning rate | 0.1 |
| Class weighting | Inverse frequency: w = total / (2 * class_count) |
| Deterministic | Yes (weights init to 0, no randomness) |

### Decision Tree

| Field | Value |
|-------|-------|
| Type | Decision Tree (binary) |
| Target | Binary: mistake_or_worse vs not_mistake |
| Features | 30 numeric features (no standardization needed) |
| Max depth | 5 |
| Min samples per leaf | 3 |
| Split criterion | Gini impurity |
| Deterministic | Yes (evaluates all thresholds, no randomness) |

### Binary target mapping

| Label | Target |
|-------|--------|
| best_or_ok | 0 (not_mistake) |
| inaccuracy | 1 (mistake_or_worse) |
| mistake | 1 (mistake_or_worse) |
| blunder | 1 (mistake_or_worse) |

### Feature list

Engine: evalCp, depth, pvLength, bestMovePresent
Game state: ply, halfmoveClock, fullmoveNumber, moverIsBlack
Castling: castlingWK, castlingWQ, castlingBK, castlingBQ, enPassantAvailable
Piece counts: 10 individual counts
Material: materialWhite, materialBlack, materialDiff
Phase: phaseOpening, phaseMiddlegame, phaseEndgame (one-hot)
Eval bucket: evalBucketOrdinal (0-6)

## Split strategy

Stratified shuffled split with a fixed seed (42):

1. Partition rows by target class (0 vs 1)
2. Shuffle each partition independently using mulberry32 PRNG
3. Split each partition by 80/10/10 ratio
4. Merge the per-class splits

This guarantees proportional class representation in every split.

## Analysis tools

### Feature importance

Impurity-based importance from the Decision Tree. Routes training data through the tree and accumulates weighted Gini reduction at each split node. Normalized to sum to 1.0 (same approach as scikit-learn).

Source: `packages/training/src/model/feature-importance.ts`

### Threshold tuning

Sweeps logistic regression decision threshold from 0.10 to 0.90 (step 0.05) on the **validation set**. Selects the threshold that maximizes F1. The optimal threshold is then applied to the test set for reporting (no test leakage).

Source: `packages/training/src/model/threshold-tuning.ts`

### Cross-validation

Stratified 5-fold CV using mulberry32 PRNG (seed=42). Round-robin fold assignment after per-class shuffle. Trains both models per fold and reports per-fold + aggregate (mean ± std) metrics.

Source: `packages/training/src/model/cross-validation.ts`

## Output artifacts

| Artifact | Path |
|----------|------|
| Logistic model | `out/models/logistic-model.json` |
| Decision tree | `out/models/tree-model.json` |
| Feature importance | `out/models/feature-importance.json` |
| Threshold analysis | `out/models/threshold-analysis.json` |
| Cross-validation | `out/models/cross-validation.json` |
| Evaluation report | `out/models/baseline-evaluation.md` |

## Package ownership

| Concern | Package |
|---------|---------|
| Dataset loader | `@chess-os/training` |
| Train/test split | `@chess-os/training` |
| Feature matrix | `@chess-os/training` |
| LogisticRegression | `@chess-os/training` |
| DecisionTree | `@chess-os/training` |
| Feature importance | `@chess-os/training` |
| Threshold tuning | `@chess-os/training` |
| Cross-validation | `@chess-os/training` |
| Evaluation metrics | `@chess-os/training` |
| Train pipeline | `@chess-os/training` |
| CLI entry point | `apps/worker` |
