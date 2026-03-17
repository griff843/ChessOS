## `docs/runbooks/MISTAKE_CLASSIFICATION.md`

```md
# Mistake Classification Runbook

Purpose: document the first deterministic move-quality classification stage for Chess-OS.

## Pipeline

```text
PGN
 -> snapshots
 -> engine evaluation
 -> evaluated position artifact
 -> feature extraction
 -> mistake classification
M2B goals

classify each move using consecutive evaluated positions

keep classification deterministic and explainable

avoid advanced engine replay or tactical explanation in M2B

produce move-quality labels for downstream dataset generation

Core method

Use centipawn loss from the mover's perspective:

White move: evalBefore - evalAfter

Black move: evalAfter - evalBefore

Then bucket that loss into calibrated bands (absorbing ~80cp tempo artifact):

| Label | Threshold |
|-------|-----------|
| best_or_ok | < 100cp |
| inaccuracy | 100-199cp |
| mistake | 200-349cp |
| blunder | >= 350cp |

Rules

classification logic belongs in package code, not worker

thresholds must be isolated in one module

no hidden I/O

omit or explicitly skip final position if no next position exists