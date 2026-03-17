# Skill: game-review-shaper

> **Wave:** 3 — Chess Domain Diagnostics
> **Invocation:** `/game-review-shaper`
> **When to use:** When starting a post-game review, converting a vague "what went wrong" into a structured analysis frame.

---

## Purpose

Convert a rough game, PGN, lesson, or review request into a structured game review frame. Separates issue types, identifies themes, and prepares findings for training work.

This is a framing tool, not an engine. It imposes structure on rough input — it does not replace manual analysis or engine evaluation.

---

## When to Use

Use this skill when:
- You have a game you want to review but no structure yet
- You have a PGN and want to turn it into a focused review
- You have a rough sense of "what went wrong" and want to organize it
- You want review output that can feed into `/training-plan-composer`

Do not use when:
- You already have a structured review and just need training suggestions (use `/training-plan-composer` directly)
- You need exact engine evaluation (run the Chess OS pipeline instead)

---

## Inputs

Provide one or more of the following:

| Input | Format | Notes |
|---|---|---|
| PGN | Paste raw PGN | Moves + headers preferred |
| Game summary | Text description | "I played e4, went into a Sicilian, hung a piece on move 22" |
| Rough review direction | Text | "Help me review this loss — I kept getting outplayed positionally" |
| Annotated moves | Text | Personal notes from the game |
| Existing Chess OS output | JSON path | `out/intelligence/<gameId>/diagnosis.json` if available |

If Chess OS pipeline output is available (diagnosis, training dataset, coaching report), reference those paths — they provide real engine-backed evidence. This skill works without them but is more reliable with them.

---

## Step-by-Step Procedure

### Step 1 — Establish Game Context

Extract or ask for:
- Color played (White / Black)
- Result (win / loss / draw)
- Approximate time control
- Opening (if known)
- Rough rating context (optional)

If a PGN is provided, read the headers. If not, ask the minimum needed.

---

### Step 2 — Identify Key Moments

Scan the game (or description) for:
- First significant deviation from expected play
- The moment the position started feeling worse
- Tactical flash points (missed or suffered tactics)
- Endgame entry point (if relevant)
- Time-pressure inflection points

If Chess OS diagnosis output is available (`out/intelligence/<gameId>/diagnosis.json`), surface the engine-identified critical moments. If not, use the user's narrative.

**Important:** Do not fabricate move-level evaluations. If engine evidence is not provided, describe moments qualitatively, not numerically.

---

### Step 3 — Categorize Issues

For each identified moment, assign an issue category:

| Category | Description |
|---|---|
| `opening` | Deviated from known theory or prep early; structural concession in the opening |
| `tactical-miss` | Failed to find a tactic (either offensive or defensive) |
| `calculation` | Miscalculated a variation — saw the right idea but got the sequence wrong |
| `strategic` | Positional misunderstanding — wrong plan, wrong piece placement, wrong pawn structure decision |
| `endgame` | Technical error or missed technique in the endgame |
| `time-management` | Spent too long on earlier moves; made a key decision in time pressure |
| `practical-decision` | Chose the harder-to-play move in a practical sense; missed simplification or missed complexity |
| `discipline` | Emotional or psychological: played impatiently, overconfidently, or with distracted attention |

A single moment may have multiple categories. Label them all.

---

### Step 4 — Identify Recurring Themes

Look across all categorized moments and ask:
- Do multiple moments share the same category?
- Is there a single phase (opening / middlegame / endgame) where issues cluster?
- Is there a pattern (e.g., "hung piece after trading queens" or "always go wrong around move 20")?

Recurring themes are more actionable than isolated mistakes. Surface them explicitly.

---

### Step 5 — Generate the Review Frame

Produce structured output (see Output Format below).

---

## Output Format

```markdown
## Game Review: <short description or "Game vs [color/result]">

**Color:** White / Black
**Result:** Win / Loss / Draw
**Opening:** <if known>
**Context:** <any relevant notes>

---

### Key Moments

| Move / Phase | Description | Issue Category |
|---|---|---|
| <move or phase> | <what happened> | <category> |
| <move or phase> | <what happened> | <category> |

*Note: [If no engine evidence available, mark qualitative assessments with "~" to indicate approximate, not precise.]*

---

### Issue Breakdown

| Category | Count | Notes |
|---|---|---|
| `opening` | N | |
| `tactical-miss` | N | |
| `calculation` | N | |
| `strategic` | N | |
| `endgame` | N | |
| `time-management` | N | |
| `practical-decision` | N | |
| `discipline` | N | |

---

### Recurring Themes

- <Theme 1: description>
- <Theme 2: description>
*(or: No clear recurring theme detected — review too short or issues too varied)*

---

### Candidate Follow-Up Questions

*(Optional: things to investigate further with engine or deeper review)*

- <Question 1>
- <Question 2>

---

### Suggested Next Actions

- [ ] <Action 1 — specific enough to be actionable>
- [ ] <Action 2>

*Feed this output into `/training-plan-composer` to convert findings into study work.*

---

### Certainty Notes

*Mark any assessments below:*
- Engine-backed: findings derived from Chess OS pipeline output
- Qualitative (~): findings from human description, no engine confirmation
- Unknown: insufficient information to classify
```

---

## Truth Boundaries

This skill must not:
- Assign centipawn evaluations without engine evidence
- Claim a move was "objectively best" without engine confirmation
- Fabricate opening theory accuracy
- State "you should have played X" with certainty unless engine output confirms it

When engine evidence is absent, use qualitative language:
- "This position likely became difficult because..."
- "A tactical opportunity may have been missed around..."
- "The position appeared to go wrong in the endgame..."

---

## Integration

- Feeds into: `/training-plan-composer` (paste review output as input)
- Enhanced by: Chess OS pipeline output in `out/intelligence/<gameId>/`, `out/coach/<gameId>/`
- Contributes to: `/progress-snapshot-helper` over time (recurring themes accumulate)

---

## Example Invocation

> `/game-review-shaper`
> I played Black in a Ruy Lopez. Lost around move 30. I misplayed the endgame — I had a pawn up but couldn't convert. I also think I spent too long in the middlegame and made the endgame decision in time pressure.

Expected output: a structured review frame with at least `endgame` and `time-management` categories, a recurring theme around late-game decision quality, and suggested next actions pointing toward endgame drills.
