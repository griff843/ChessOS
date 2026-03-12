
# Content for `docs/architecture/PIPELINE_OVERVIEW.md`

```md
# Pipeline Overview

Canonical Chess OS pipeline:

```text
PGN
 -> parsePgnMoves()
 -> ParsedMove[]
 -> pgnToSnapshots()
 -> PositionSnapshot[]
 -> evaluatePosition()
 -> EvaluatedPosition[]
 -> extractFeatures()
 -> FeatureVector[]
 -> classify / train
Package ownership

@chess-os/chess-core

PGN parsing

snapshot generation

shared chess domain types

@chess-os/engine

engine process/service abstraction

position evaluation

@chess-os/classifier

labeling and classification logic

@chess-os/training

dataset and preprocessing logic

@chess-os/db

persistence interfaces/adapters

apps/worker

orchestration only