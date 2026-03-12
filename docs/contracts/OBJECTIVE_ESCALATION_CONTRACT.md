# Objective Escalation Contract

`out/objective/objective-escalation.json` is the canonical artifact for memory-driven objective lifecycle escalation.

## Required fields

- `generatedAt`
- `currentObjective`
- `currentPhase`
- `escalationVerdict`
- `escalationReason`
- `escalationStrength`
- `memorySupportSignals`
- `repeatedFailureSignals`
- `repeatedSuccessSignals`
- `oscillationPenalty`
- `recommendedObjectiveAction`
- `recommendedObjectivePhaseChange`
- `recommendedNextObjective`
- `explanation`

## Verdicts

- `continue_current_objective`
- `hold_current_objective`
- `promote_objective_phase`
- `switch_objective`
- `retire_objective`
- `revert_to_repair_mode`

## Determinism rules

- Derive only from canonical progress, objective history, intervention effectiveness, intervention memory, readiness, review burden, and strategic artifacts.
- Do not compute escalation heuristics in the web app.
- Persist every escalation decision before UI rendering.
- Session metadata may mirror escalation outputs, but the artifact remains canonical truth.

## Related artifacts

- `out/objective/objective-progress.json`
- `out/objective/objective-coaching.json`
- `out/objective/intervention-effectiveness.json`
- `out/objective/intervention-memory.json`
- `out/objective/objective-escalation.md`
