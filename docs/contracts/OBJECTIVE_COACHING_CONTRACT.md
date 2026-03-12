# Objective Coaching Contract

## Artifact

Primary JSON artifact:
- `out/objective/objective-coaching.json`

Companion markdown artifact:
- `out/objective/objective-coaching.md`

## Purpose

Objective coaching explains why the current objective is improving, stalled, or regressing and prescribes the next deterministic intervention for the next session.

## Required fields

- `generatedAt`
- `currentObjective`
- `objectivePhase`
- `objectiveStatus`
- `progressVerdict`
- `lifecycleDecision`
- `interventionType`
- `interventionReason`
- `recommendationStrength`
- `failedSignals[]`
- `supportingSignals[]`
- `compareWindows[]`
- `suggestedSessionMixAdjustment`
- `suggestedDifficultyAdjustment`
- `suggestedReviewAdjustment`
- `suggestedObjectiveAction`
- `nextSessionAdjustmentSummary`
- `headline`
- `explanation`

## Intervention types

- `reinforce_pattern_repair`
- `shift_to_visualization_support`
- `reduce_stretch_load`
- `increase_review_share`
- `increase_challenge`
- `promote_to_next_phase`
- `hold_current_plan`
- `switch_objective`
- `retire_objective`

## Compare windows

The artifact exposes deterministic compare windows so the intervention can be audited from measured evidence.

Current windows:
- `last_3_vs_prior_3` when enough objective history exists
- `objective_start_vs_now` when the objective has enough longitudinal history
- `objective_evidence_vs_baseline` always, using the objective progress evidence and baseline windows

Each compare window includes:
- `currentWindow`
- `previousWindow`
- `deltas.accuracyDelta`
- `deltas.severeRateDelta`
- `deltas.evalLossDelta`
- `summary`

## Session integration

When present, session generation consumes the coaching artifact to:
- adjust exercise-type mix
- adjust difficulty distribution
- prioritize review-heavy candidates when review share should increase
- stamp intervention metadata into the generated session artifact

## UI rule

UI surfaces must render this artifact read-only. No intervention logic may be recomputed in the web layer.
