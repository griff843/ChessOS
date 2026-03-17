# Content for `docs/contracts/POSITION_SNAPSHOT_CONTRACT.md`

```md
# PositionSnapshot Contract

Purpose: canonical representation of a single chess position derived from PGN history.

Suggested minimum shape:

```ts
type PositionSnapshot = {
  positionId: string
  gameId: string
  ply: number
  moveSan: string
  fen: string
  sideToMove: "w" | "b"
}
Rules

positionId must be deterministic

fen is canonical board truth

sideToMove is derived from FEN, not inferred elsewhere

contract changes must be intentional and documented