# Analysis Engine Contract

Purpose: define the engine adapter boundary used by `evaluatePosition()`.

## Requirements

An analysis engine must:

- accept a FEN position
- return deterministic structured output for a fixed depth/settings
- expose engine metadata
- fail explicitly when runtime dependencies are missing

## Suggested shape

```ts
type EngineAnalysisResult = {
  evalCp: number
  depth: number
  bestMove?: string
  pv?: string[]
}

interface AnalysisEngine {
  name: string
  analyze(fen: string): Promise<EngineAnalysisResult>
}

Rules

evaluatePosition() must remain adapter-agnostic

runtime discovery belongs in stockfish adapter code, not worker

missing binaries must throw explicit errors

no silent fallback from real engine mode to stub mode