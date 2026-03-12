# Critical Position Contract

Purpose: define the canonical data structure for scored and ranked critical positions in Chess-OS.

## CriticalPosition

Each critical position represents a scored move within a game, ranked by criticality.

```ts
interface CriticalPosition {
  gameId: string;
  positionId: string;
  ply: number;
  moveSan: string;
  mover: "white" | "black";
  fen: string;
  evalCp: number;
  phase: "opening" | "middlegame" | "endgame";
  predictedRisk: number;
  predictedClass: number;
  actualLabel: "best_or_ok" | "inaccuracy" | "mistake" | "blunder";
  criticalityScore: number;
  rank: number;
  factors: CriticalityFactors;
}
```

## Field semantics

| Field | Type | Description |
|-------|------|-------------|
| `gameId` | string | Game identifier |
| `positionId` | string | Position identifier (`<gameId>:<ply-1>`) |
| `ply` | number | Ply number of the move (1-indexed) |
| `moveSan` | string | Move in standard algebraic notation |
| `mover` | ChessColor | Side that played the move |
| `fen` | string | FEN of the position before the move |
| `evalCp` | number | Engine eval in centipawns (White perspective) |
| `phase` | GamePhase | Game phase at time of move |
| `predictedRisk` | number | P(mistake_or_worse) from Decision Tree leaf ∈ [0, 1] |
| `predictedClass` | number | Binary prediction: 0 = not_mistake, 1 = mistake_or_worse |
| `actualLabel` | MistakeLabel | Ground truth label from calibrated classifier |
| `criticalityScore` | number | Composite criticality score ∈ [0, 1] |
| `rank` | number | Rank within game (1 = most critical) |
| `factors` | CriticalityFactors | Breakdown of criticality components |

## CriticalityFactors

```ts
interface CriticalityFactors {
  riskComponent: number;
  tensionComponent: number;
  phaseComponent: number;
  swingComponent: number;
}
```

| Factor | Weight | Source | Description |
|--------|--------|--------|-------------|
| `riskComponent` | 0.50 | Model prediction | predictedRisk × 0.50 |
| `tensionComponent` | 0.20 | Eval magnitude | (1 - clamp(\|evalCp\| / 300)) × 0.20 |
| `phaseComponent` | 0.15 | Game phase | phaseWeight × 0.15 |
| `swingComponent` | 0.15 | Actual swing | clamp(\|swingCp\| / 300) × 0.15 |

## CriticalPositionsResult

Per-game artifact envelope:

```ts
interface CriticalPositionsResult {
  gameId: string;
  totalPositions: number;
  topN: number;
  positions: CriticalPosition[];
  scoredAt: string;
}
```

## Artifact paths

| Artifact | Path |
|----------|------|
| Per-game JSON | `out/intelligence/<gameId>/critical-positions.json` |
| Per-game Markdown | `out/intelligence/<gameId>/critical-positions.md` |
| Mover color audit | `out/models/mover-color-audit.json` |

## Rules

- All scoring is deterministic (same model + same data = same output)
- Risk scoring uses Decision Tree leaf probabilities (no randomness)
- Criticality formula is fixed and documented
- Ranking is by criticalityScore descending
- Default top N = 5 (configurable via TOP_N env var)
- Intelligence logic lives in `@chess-os/training`
- Worker only orchestrates scoring and writes artifacts
