# Puzzle Runner Runbook

## Prerequisites

1. Exercise corpus exists (`pnpm --filter worker run generate-exercises`)
2. At least one study session generated (`pnpm --filter worker run generate-session`)

## Solve a session

```bash
pnpm --filter worker run solve-session
```

By default, loads the most recently generated session. To specify a session:

```bash
SESSION_ID=session-33cecce1 pnpm --filter worker run solve-session
```

## Interactive flow

For each exercise:

1. Display the board position (ASCII), FEN, side to move, category, difficulty
2. Prompt: `Your move (SAN or UCI): `
3. Validate move legality
4. Compare to engine best move
5. Show result: correct/incorrect
6. Show engine answer: best move, PV, eval swing, reason codes
7. Continue to next exercise

At session end:

1. Show session summary (correct/incorrect/accuracy)
2. Write results artifact
3. Automatically update progress store

## Artifacts

| File | Format | Description |
|------|--------|-------------|
| `out/results/<sessionId>/results.json` | JSON | Detailed puzzle result with all attempts |
| `out/results/<sessionId>/session-results.json` | JSON | Record-session compatible result file |

## Move input

The runner accepts both SAN and UCI notation:

- SAN examples: `Nxd5`, `e4`, `O-O`, `Qxg3+`
- UCI examples: `e2e4`, `g1f3`, `e7e8q`

Invalid moves are rejected with an error message and the prompt repeats.

## Pipeline integration

```
generate-session → study-session.json
        ↓
solve-session → interactive solving
        ↓
results.json + session-results.json
        ↓
progress store update (automatic)
        ↓
generate-session → adaptive next session
```
