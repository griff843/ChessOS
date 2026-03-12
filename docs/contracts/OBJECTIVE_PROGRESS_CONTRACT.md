# OBJECTIVE_PROGRESS_CONTRACT

Canonical module: `packages/training/src/objectives`.

Artifacts:
- `out/objective/training-objective.json`
- `out/objective/objective-progress.json`
- `out/objective/objective-history.jsonl`
- `out/sessions/<id>/study-session.json`
- `out/sessions/<id>/composition-rationale.json`

## Objective Progress Artifact

Required fields:
- `currentObjective`
- `previousObjective`
- `startedAt`
- `activeDays`
- `lastEvaluatedAt`
- `sessionsOnObjective`
- `recentObjectiveSessions`
- `objectiveStatus`
- `objectivePhase`
- `progressVerdict`
- `lifecycleDecision`
- `objectiveDecisionReason`
- `promotionRecommendation`
- `retirementRecommendation`
- `switchRecommendationReason`
- `nextRecommendedAction`
- `successSignalSnapshots`
- `evidenceWindow`
- `baselineWindow`

## Deterministic Rules

The lifecycle layer consumes only measured canonical inputs:
- objective success signals
- completed session analytics
- recent objective-session evidence
- review queue burden
- readiness state
- trend profile
- prior objective progress artifact

The lifecycle output may decide:
- `continue`
- `hold`
- `promote`
- `switch`
- `retire`
- `repair`

## Session Metadata

Generated sessions now carry:
- `trainingObjective`
- `objectiveReason`
- `objectivePhase`
- `successSignals`
- `objectiveExerciseMixRationale`
- `objectiveStatus`
- `objectiveProgressVerdict`
- `objectiveDecision`
- `objectiveDecisionReason`
- `objectiveStartedAt`
- `sessionsOnObjective`

## UI Boundary

The web app reads objective artifacts and session metadata only.
It must not recompute lifecycle logic.

