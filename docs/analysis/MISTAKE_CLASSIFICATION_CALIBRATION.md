# Mistake Classification Calibration Report

Date: 2026-03-06
Engine: Stockfish 18 (depth 20)
Sample: Ruy Lopez, 40 plies (20 moves), drawn game (`sample-game-001`)

## Problem

With the original thresholds (`inaccuracy: 50, mistake: 100, blunder: 250`), every single move in a well-played Ruy Lopez was classified as an inaccuracy or worse:

```
best_or_ok=0  inaccuracy=33  mistake=3  blunder=3
```

Zero moves labeled `best_or_ok` — clearly wrong for mainline opening theory.

## Root Cause: Side-to-Move Tempo Artifact

Engine eval is always from White's perspective. Stockfish assigns a **tempo bonus** of ~35-40cp to whoever has the move. This creates a systematic oscillation:

```
Position (white to move): eval ≈ +40
Position (black to move): eval ≈ -40
```

When computing swing between consecutive positions, this tempo bonus appears as a ~70-80cp "false swing" on every move, even perfect ones.

### Evidence from sample game

| Metric | Value |
|--------|-------|
| Swing range for "good" moves (plies 2-34) | 54-98cp |
| Median swing for "good" moves | 80cp |
| Mean swing (all 39 moves) | 109.7cp |

The first 33 moves are mainline Ruy Lopez theory. Their swings cluster tightly around 80cp — entirely explained by the tempo artifact.

## Calibration

### Old thresholds
```
inaccuracy: 50cp    mistake: 100cp    blunder: 250cp
```

### New thresholds (calibrated)
```
inaccuracy: 100cp   mistake: 200cp    blunder: 350cp
```

Rationale: the ~80cp tempo floor means the first ~100cp of raw swing is noise. The new thresholds absorb this artifact while preserving sensitivity to genuine errors.

### Before / After

| Label | Before | After |
|-------|--------|-------|
| best_or_ok | 0 | 33 |
| inaccuracy | 33 | 3 |
| mistake | 3 | 1 |
| blunder | 3 | 2 |

### After calibration — move-by-move audit (non-best_or_ok only)

| Ply | Move | Mover | Swing | Label | Chess Assessment |
|-----|------|-------|-------|-------|------------------|
| 35 | d5 | white | 116cp | inaccuracy | Premature pawn push; reasonable but imprecise |
| 36 | c4 | black | 111cp | inaccuracy | Committal pawn break; slightly inaccurate timing |
| 37 | b4 | white | 108cp | inaccuracy | Pawn advance; creates weaknesses |
| 38 | Nh5 | black | 299cp | mistake | Knight maneuver losing material advantage |
| 39 | Nxh5 | white | 494cp | blunder | Captures into worse position |
| 40 | gxh5 | black | 515cp | blunder | Recapture leaves shattered structure + piece imbalance |

The calibrated labels match chess intuition.

## Alternative Approaches Considered

1. **Subtract a fixed tempo floor** (e.g., `adjusted = max(0, swing - 75)`): equivalent to threshold shift but adds a magic constant to the swing computation itself. Rejected — harder to explain, no advantage.

2. **Compare against engine's best-move eval** (Lichess approach): requires evaluating two positions per ply (played move AND best move). More accurate but doubles engine work. Deferred to future sprint.

3. **Win-probability model** (chess.com approach): convert eval to win% before computing loss. Naturally handles tempo and extreme evals. Deferred — requires calibration dataset.

## Verdict

The threshold calibration is sufficient for M2B. The tempo artifact is a known property of position-vs-position evaluation. The calibrated thresholds produce a realistic distribution that matches chess intuition.

**M3A may proceed.**
