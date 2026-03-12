# Intervention Memory Contract

## Artifacts
- `out/objective/intervention-memory.json`
- `out/objective/intervention-history.jsonl`
- `out/objective/intervention-effectiveness.json`
- `out/sessions/<sessionId>/study-session.json`

## Goals
- Persist multi-episode intervention evidence across repeated cycles.
- Keep engine decisions deterministic, explainable, and artifact-backed.
- Allow session generation and UI surfaces to consume canonical memory without re-deriving strategy in the browser.

## intervention-memory.json
Top-level fields:
- `generatedAt`
- `currentObjective`
- `episodes`
- `recentEpisodes`
- `repeatedPatternWarnings`
- `oscillationDetected`
- `oscillationSummary`
- `familyPerformance`
- `betterPriorIntervention`
- `nextActionRecommendation`

Each episode contains:
- `interventionEpisodeId`
- `interventionType`
- `objectiveKey`
- `startedAt`
- `evaluatedAt`
- `preSnapshot`
- `postSnapshot`
- `compareSnapshot`
- `outcome`
- `outcomeStrength`
- `repeatedPatternFlag`
- `recommendedNextAction`
- `recommendedNextIntervention`

## Snapshot Expectations
Snapshots preserve deterministic signal context for:
- readiness state
- review burden share
- recurrence pressure
- grade distribution
- eval-loss profile
- objective performance signals
- recurring pattern severity

## Session Metadata
Generated `study-session.json` metadata may include:
- `objectiveSignalSnapshot`
- `interventionEpisodeId`
- `interventionRecommendedAction`
- `interventionRecommendedType`
- `interventionRepeatedPatternFlag`
- `interventionCompareSummary`

## Compatibility
- Older artifacts may lack memory fields.
- Loaders and validators must fail gracefully when artifacts are missing or malformed.
- UI must present artifact state only; it must not recompute intervention decisions.
