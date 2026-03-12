# Objective Portfolio Contract

`out/objective/objective-portfolio.json` is the canonical artifact for escalation-calibrated objective ranking and rotation.

## Required fields

- `generatedAt`
- `activeObjective`
- `rankedObjectives`
- `rotationDecisions`
- `portfolioSummary`

## Ranked objective entry fields

- `objectiveKey`
- `currentPhase`
- `readinessScore`
- `escalationVerdict`
- `interventionMemoryScore`
- `recurrencePressure`
- `reviewBurdenImpact`
- `portfolioPriority`
- `portfolioRotationWeight`
- `lastTrainedAt`
- `trainingShare`
- `portfolioStatus`
- `reasons`

## Determinism rules

- Portfolio ranking must be derived only from canonical engine inputs.
- UI must not recompute ranking or rotation decisions.
- Session metadata may mirror active portfolio outputs, but the artifact remains canonical truth.
