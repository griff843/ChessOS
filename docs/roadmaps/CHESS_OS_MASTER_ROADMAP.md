# CHESS OS - Master Roadmap

Status: Active
Purpose: Canonical roadmap for Chess OS architecture, sequencing, and acceptance criteria.
Rule: This file is the source of truth for system direction. New work should align to a roadmap milestone or explicitly amend this document.

---

## 1. System Goal

Chess OS is a modular chess data and intelligence platform that transforms raw PGN game records into structured position datasets, engine-evaluated positions, extracted feature vectors, and downstream classifier/training artifacts.

Primary architectural principle:

```text
PGN -> Parsed Moves -> Position Snapshots -> Engine Evaluation -> Features -> Classifier/Training
```

## M1C - Persistence Layer

Initial implementation strategy:
- M1C begins with JSON export persistence
- database adapters/interfaces may be defined, but JSON artifact export is the primary deliverable
- output should be written to `out/games/<game-id>/evaluated-positions.json`

## M2B - Position Labeling / Classification

Initial implementation strategy:
- M2B begins with deterministic mistake classification from consecutive evaluated positions
- labels should be based on centipawn loss from the mover's perspective
- initial labels: `best_or_ok`, `inaccuracy`, `mistake`, `blunder`
- advanced best-move comparison and tactical explanation are deferred to later milestones
