# Mistake Classification Contract

Purpose: define the canonical move-quality classification derived from consecutive evaluated positions.

## Suggested types

```ts
type MistakeLabel = "best_or_ok" | "inaccuracy" | "mistake" | "blunder"

type MoverColor = "w" | "b"

type MistakeClassification = {
  gameId: string
  positionId: string
  ply: number
  moveSan: string
  mover: MoverColor

  evalBeforeCp: number
  evalAfterCp: number
  swingCp: number

  label: MistakeLabel
  phase: "opening" | "middlegame" | "endgame"
}
## Thresholds (calibrated)

Engine eval includes a side-to-move tempo bonus (~35-40cp per side), which inflates raw swing by ~70-80cp for every move. Thresholds absorb this artifact:

| Label | Raw swing range |
|-------|----------------|
| best_or_ok | < 100cp |
| inaccuracy | 100-199cp |
| mistake | 200-349cp |
| blunder | >= 350cp |

See `docs/analysis/MISTAKE_CLASSIFICATION_CALIBRATION.md` for calibration details.

## Rules

- classification must be deterministic
- classification is based on adjacent evaluated positions
- swingCp is measured from the mover's perspective
- threshold logic must be centralized and explicit
- the final move in a game may be omitted if no next position exists