# Evaluated Position Export Contract

Purpose: define the canonical persisted/exported artifact produced from the evaluated position pipeline.

## Export shape

Suggested top-level shape:

```ts
type EvaluatedPositionExport = {
  gameId: string
  source: {
    format: "pgn"
    name?: string
  }
  engine: {
    mode: "stub" | "stockfish"
    name: string
    depth?: number
  }
  createdAt: string
  positions: EvaluatedPosition[]
}

Rules

export must preserve EvaluatedPosition objects exactly

top-level metadata must record engine mode/name

export output must be deterministic in structure

file writing must be explicit and observable

no silent dropping of positions