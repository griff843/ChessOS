# Skill: position-concept-audit

> **Wave:** 4 — Chess Domain Expansion
> **Invocation:** `/position-concept-audit`
> **When to use:** After a game review is structured, to classify each identified issue or position by its underlying chess concept — enabling sharper training targeting.

---

## Purpose

Classify reviewed positions, mistakes, or recurring issues by their underlying chess concept. Adds a layer of conceptual precision beneath the issue categories produced by `game-review-shaper`.

Where `game-review-shaper` categorizes *what happened* (tactical miss, endgame error, etc.), `position-concept-audit` identifies *what concept was involved* — the fork that was missed, the weak square that was mishandled, the rook endgame technique that broke down.

This is a classification tool, not an analysis engine. It imposes conceptual structure on evidence already in hand — it does not replace engine evaluation or generate new analysis.

---

## When to Use

Use this skill when:
- A `game-review-shaper` output exists and you want deeper concept-level tagging
- A Chess OS coaching report (`out/coach/`) or training targets (`out/intelligence/`) are available and you want to map them to study concepts
- A training plan feels too vague ("work on tactics") and you need a concept breakdown to make it specific
- A recurring weakness has been identified and you want to understand what chess concept is at its root

Do not use when:
- No review or position data exists yet — run `/game-review-shaper` first
- You need engine-level move evaluation (run the Chess OS pipeline instead)
- The issue is clearly one concept already and the label is unambiguous

---

## Inputs

Provide one or more of the following:

| Input | Format | Notes |
|---|---|---|
| Review output | Output from `/game-review-shaper` | Primary input — preferred |
| Positions or moments | Text, FEN, or move sequence | "On move 22 I had a knight fork on d5 and missed it" |
| Recurring weakness description | Text | "I keep losing rook endgames with an extra pawn" |
| Chess OS coaching output | Path | `out/coach/coaching-summary.json` if available |
| Training targets | Path | `out/intelligence/<gameId>/training-targets.json` if available |
| Annotated game notes | Text | Personal notes or engine annotations |

If Chess OS pipeline output is available, reference those artifacts — they contain engine-verified critical positions with move labels. This skill is more reliable when grounded in pipeline evidence rather than narrative alone.

---

## Concept Families

Use these families to classify each issue. A single position may have more than one concept.

### Tactical Motifs
Concrete patterns where a forcing sequence wins material or delivers checkmate.

| Concept Tag | Description |
|---|---|
| `fork` | One piece attacks two or more enemy pieces simultaneously |
| `pin` | A piece is immobilized because moving it exposes a more valuable piece |
| `skewer` | A more valuable piece is attacked and forced to move, exposing a less valuable piece |
| `discovered-attack` | Moving one piece reveals an attack from another |
| `back-rank` | Checkmate threat along the first or eighth rank |
| `overloading` | A piece defending multiple threats is overwhelmed |
| `deflection` | A defending piece is forced away from its defensive duty |
| `interference` | A piece blocks the coordination between two enemy pieces |
| `zwischenzug` | An intermezzo move that disrupts a sequence |
| `mating-net` | A coordinated pattern leading to forced checkmate |
| `tactical-motif-other` | Recognizable tactical pattern not in the above list |

### Calculation Errors
The concept was visible but the sequence was miscalculated.

| Concept Tag | Description |
|---|---|
| `calc-depth` | Saw the idea but stopped too early — did not see the refutation |
| `calc-move-order` | Right pieces, wrong sequence |
| `calc-opponent-response` | Missed a key defensive move in the opponent's reply |
| `blunder-drop` | Material dropped through oversight, not a failed calculation |

### Strategic Themes
Positional issues where no forcing sequence exists but the plan or structure was wrong.

| Concept Tag | Description |
|---|---|
| `weak-square` | Occupied or conceded a weak square; failed to contest one |
| `pawn-structure` | Wrong pawn push or exchange that damaged piece activity or king safety |
| `piece-activity` | Passive piece that should have been activated; trade imbalance |
| `king-safety` | Inadequate king shelter or delayed castling |
| `open-file` | Missed or lost control of an open or semi-open file |
| `outpost` | Failed to create or exploit a knight outpost |
| `bishop-vs-knight` | Mishandled the imbalance between bishop and knight |
| `two-bishops` | Did not exploit or failed to avoid the two bishops |
| `strategic-theme-other` | Positional theme not in the above list |

### Opening Concepts
Issues rooted in opening preparation or understanding.

| Concept Tag | Description |
|---|---|
| `opening-theory` | Deviated from known theory in a way that conceded advantage |
| `opening-structure` | Accepted a structural concession in the opening without compensation |
| `opening-development` | Delayed or incomplete development in the opening |
| `opening-trap` | Fell into or missed an opening trap |

### Endgame Technique
Errors in positions where the technique is known and learnable.

| Concept Tag | Description |
|---|---|
| `king-activation` | Failed to activate the king in the endgame |
| `pawn-endgame` | King opposition, triangulation, pawn breakthrough, or zugzwang error |
| `rook-endgame` | Lucena, Philidor, or rook-behind-passed-pawn principles violated |
| `piece-endgame` | Wrong plan in bishop, knight, or queen endgame |
| `conversion-technique` | Had a winning position but failed to convert |
| `endgame-technique-other` | Endgame error not in the above list |

### Practical / Time / Discipline
Non-technical errors affecting decision quality.

| Concept Tag | Description |
|---|---|
| `time-pressure-decision` | Made a weak move in severe time trouble |
| `simplification-missed` | Failed to simplify when winning; made the game complex unnecessarily |
| `overcomplication` | Chose a sharp/difficult continuation when a simpler path was available |
| `impulsive-move` | Did not calculate; moved too quickly |
| `discipline` | Emotional or psychological factor visible in the game record |

---

## Step-by-Step Procedure

### Step 1 — Gather the Review Evidence

Read the input. If a `game-review-shaper` output is present, extract:
- Key moments identified
- Issue categories assigned (tactical-miss, endgame, etc.)
- Recurring themes

If Chess OS pipeline output is available, check:
- `out/intelligence/<gameId>/training-targets.json` — top-N critical positions with labels
- `out/coach/coaching-summary.json` — mistake pattern summary

If only narrative is provided, work with it — but mark qualitative findings explicitly.

---

### Step 2 — Map Each Issue to Concept Tags

For each identified moment or weakness, assign one or more concept tags from the families above.

Rules:
- If the issue is clearly tactical, pick the specific motif (e.g., `fork`) not just `tactical-motif-other`
- If the cause is uncertain, pick the most likely tag and mark it with `~`
- A single position can carry both a tactical tag and a strategic tag if both are relevant (e.g., a fork was missed *because* of a weak square that created the fork opportunity)
- Do not fabricate concept tags — if there is not enough evidence to classify, say so

---

### Step 3 — Identify Root Concept vs Symptom

For each tagged issue, ask:
- Is the concept tag the *root cause* or a *symptom* of something deeper?
- Example: A missed fork (`fork`) may be a symptom of a calculation depth problem (`calc-depth`) or of a pattern recognition gap

Where root cause and symptom differ, surface both. The training plan should target the root, not just the symptom.

---

### Step 4 — Identify Concept Clusters

Look across all tagged issues and ask:
- Do multiple issues share the same concept family?
- Is one concept tag recurring across different positions?
- Is there a concept cluster (e.g., multiple `rook-endgame` issues, multiple `calc-depth` errors)?

Clusters are stronger signals than isolated tags. Surface them explicitly.

---

### Step 5 — Generate the Concept Audit Report

Produce structured output (see Output Format below).

---

## Output Format

```markdown
## Position Concept Audit: <short description or game reference>

**Based on:** <review output / pipeline output / narrative input>
**Certainty level:** Engine-backed / Qualitative (~) / Mixed

---

### Concept Map

| Moment / Issue | Concept Tag(s) | Root or Symptom? | Certainty |
|---|---|---|---|
| <move or description> | `<tag>`, `<tag>` | Root: `<tag>` / Symptom of: `<tag>` | Engine-backed / ~ |
| <move or description> | `<tag>` | Root | Engine-backed / ~ |

---

### Concept Clusters

*(List any concept tags that appeared more than once, or concept families with multiple hits)*

| Concept Tag | Count | Notes |
|---|---|---|
| `<tag>` | N | <any relevant pattern note> |

*(or: No clear concept cluster detected — issues too varied or insufficient data)*

---

### Root Cause Summary

<2–4 sentences summarizing the deepest conceptual finding. What is the most important concept gap this player has? What should be addressed first?>

---

### Suggested Study Directions

For each significant concept cluster or root cause:

| Concept | Study Direction | Resource Type |
|---|---|---|
| `<tag>` | <what to study — specific, actionable> | puzzles / endgame manual / annotated games / concept video |

*(Avoid vague directions like "study tactics." Prefer: "Work on knight fork patterns where the fork square is defended by a pawn.")*

---

### Certainty Notes

- Engine-backed: <list any findings grounded in Chess OS pipeline output>
- Qualitative (~): <list any findings based on narrative alone>
- Unclassifiable: <list any positions where evidence was insufficient to assign a concept>
```

---

## Truth Boundaries

This skill must not:
- Assign a specific concept tag without supporting evidence (narrative or engine)
- Claim a concept was "definitely" the cause without engine confirmation
- Invent positions or moves not provided in the input
- Claim that a concept pattern is "recurring" based on a single occurrence

When certainty is low, mark with `~` and explain the basis:
- "The missed knight fork appears to be a `fork` pattern miss (~) — based on description, not engine verification"
- "The endgame loss is tagged `rook-endgame` (engine-backed) — training-targets.json shows the position at ply 68"

---

## Integration

- Receives from: `/game-review-shaper` output; Chess OS pipeline output (`out/intelligence/`, `out/coach/`)
- Feeds into: `/training-plan-composer` — concept tags make study block assignment more precise
- Contributes to: `/progress-snapshot-helper` — concept clusters tracked across cycles reveal deeper patterns
- Enhances: `out/chess-os/ai/context/context_bundle.md` — recurring concept tags are worth adding to the active context bundle

---

## Example Invocation

> `/position-concept-audit`
> From my game review: I missed a knight fork on d5 (move 22), then lost a rook endgame where I was up a pawn (move 38–50). My review also flagged a time-pressure decision around move 35. Chess OS training-targets.json shows the critical moment at ply 44 was a rook endgame technique error.

Expected output: concept tags `fork` (ply 22, qualitative), `rook-endgame` (ply 44, engine-backed), `time-pressure-decision` (ply 35, qualitative). Root cause analysis distinguishing whether the endgame loss was technique (`rook-endgame`) or conversion under pressure (`time-pressure-decision`). Study directions pointing to rook-behind-passed-pawn technique and timed endgame practice.
