# Training Target Contract

## TrainingTargetType

```typescript
type TrainingTargetType =
  | "blunder"         // actualLabel === "blunder"
  | "mistake"         // actualLabel === "mistake"
  | "inaccuracy"      // actualLabel === "inaccuracy"
  | "critical_test";  // actualLabel === "best_or_ok" AND predictedRisk >= 0.4
```

## TrainingTarget

```typescript
interface TrainingTarget {
  gameId: string;
  positionId: string;
  ply: number;
  moveSan: string;
  mover: ChessColor;          // "white" | "black"
  fen: string;
  evalCp: number;
  phase: GamePhase;            // "opening" | "middlegame" | "endgame"
  actualLabel: MistakeLabel;   // "best_or_ok" | "inaccuracy" | "mistake" | "blunder"
  targetType: TrainingTargetType;
  predictedRisk: number;       // P(mistake_or_worse) from production-safe tree
  criticalityScore: number;    // composite score from M5A formula
  criticalityFactors: CriticalityFactors;
  targetPriority: number;      // training value score [0, 1]
  priorityFactors: TargetPriorityFactors;
  rank: number;                // 1-indexed within game
}
```

## TrainingTargetsResult

```typescript
interface TrainingTargetsResult {
  gameId: string;
  totalPositions: number;     // all positions in game
  totalCandidates: number;    // positions that passed selection filter
  topN: number;               // max targets requested
  targets: TrainingTarget[];
  scoringConfig: {
    excludedFeatures: string[];   // ["moverIsBlack"]
    productionSafe: boolean;      // true
  };
  generatedAt: string;         // ISO 8601
}
```

## Selection Criteria

1. All positions with `actualLabel` in `{inaccuracy, mistake, blunder}` are candidates
2. Positions with `actualLabel === "best_or_ok"` qualify only if `predictedRisk >= 0.4`
3. Candidates are ranked by `targetPriority` descending
4. Top N selected (default N = 10)

## Priority Formula

```
targetPriority =
    criticalityScore × 0.40
  + labelSeverity    × 0.35
  + evalTension      × 0.15
  + phaseWeight      × 0.10
```

Label severity: blunder=1.0, mistake=0.7, inaccuracy=0.4, best_or_ok=0.1

## Production Scoring

All scoring uses Config B tree (trained without `moverIsBlack`) per M5B decision. Feature exclusion is enforced by `PRODUCTION_EXCLUDED_FEATURES = ["moverIsBlack"]`.
