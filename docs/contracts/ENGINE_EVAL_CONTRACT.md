# Content for `docs/contracts/ENGINE_EVAL_CONTRACT.md`

```md
# Engine Evaluation Contract

Purpose: define the canonical output of engine evaluation.

Suggested shape:

```ts
type EvaluatedPosition = PositionSnapshot & {
  evalCp: number
  depth: number
  bestMove?: string
  pv?: string[]
  engineName: string
}
Rules

evaluation must preserve original snapshot fields

engine metadata must be explicit

deterministic settings should be used for reproducible tests

optional fields should remain optional unless guaranteed by the engine adapter