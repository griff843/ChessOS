# M12E - Training Objective Contract

## Overview

The training objective layer makes session generation coach-directed and explainable.

Canonical module: `packages/training/src/objectives`.

## Objective Taxonomy

- `candidate_move_generation`
- `tactical_pattern_recognition`
- `calculation_stability`
- `visualization_depth`
- `defensive_resource_finding`
- `endgame_conversion`
- `attacking_coordination`
- `practical_decision_quality`

## Selection Contract

Objective selection is deterministic from:
- weakness profile
- progress store
- trend profile
- review queue
- readiness forecast
- strategic pattern intelligence
- curriculum state
- recent session snapshots
- focus recommendations

Output artifact fields (`out/objective/training-objective.json`):
- `currentObjective`
- `objectiveReason`
- `objectivePhase`
- `progressionState`
- `successSignals`
- `weeklyPlan`
- `objectiveExerciseMix`
- `objectiveExerciseMixRationale`
- `candidateScores`
- `curriculumState`

## Objective-Aware Session Contract

Session generation must:
1. Derive objective first.
2. Apply objective-aware ranking bias.
3. Apply objective exercise-type mix.
4. Emit objective fields in session metadata and composition rationale.

Per-session explainability fields:
- `trainingObjective`
- `objectiveReason`
- `objectivePhase`
- `successSignals`
- `objectiveExerciseMixRationale`

## Success Signals

Each objective defines measurable signals with:
- metric key
- current value
- target value
- direction (`increase`/`decrease`)
- trend direction

## Invariants

1. Engine and shared canonical layers own objective logic.
2. UI only reads objective artifacts and renders them.
3. Objective choice and mix rationale are always traceable via artifacts.
4. No hidden heuristics without output trace.
5. Candidate scores must sort deterministically with stable tie-breaking.
