# Intervention Effectiveness Contract

## Artifacts

Primary JSON artifact:
- `out/objective/intervention-effectiveness.json`

Companion markdown artifact:
- `out/objective/intervention-effectiveness.md`

History artifact:
- `out/objective/intervention-history.jsonl`

## Purpose

This layer evaluates whether the previously prescribed intervention helped the current objective, failed, regressed, or remains inconclusive.

## Required fields

- `generatedAt`
- `currentObjective`
- `interventionId`
- `priorInterventionType`
- `interventionStartedAt`
- `interventionEvaluationAt`
- `interventionOutcome`
- `outcomeStrength`
- `changedSignals[]`
- `unchangedSignals[]`
- `worsenedSignals[]`
- `compareWindows[]`
- `recommendedAction`
- `recommendedNextIntervention`
- `narrativeSummaryData`

## Outcomes

- `effective`
- `partially_effective`
- `ineffective`
- `regressed`
- `inconclusive`

## Recommended actions

- `continue`
- `strengthen`
- `reverse`
- `replace`

## Evidence model

Effectiveness must be derived from measured evidence only. Current signals are based on deterministic pre/post objective-session windows, including:
- accuracy
- exact rate
- severe rate (`mistake + blunder`)
- average eval loss

## Session integration

Session generation may use the effectiveness artifact to:
- continue a working intervention
- strengthen a partially effective intervention
- replace or reverse a regressing intervention
- stamp effectiveness-aware metadata into the next session artifact

## UI rule

UI surfaces must only render these artifacts. No outcome or recommendation logic may be recomputed in the web layer.
