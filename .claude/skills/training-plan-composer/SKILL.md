# Skill: training-plan-composer

> **Wave:** 3 — Chess Domain Diagnostics
> **Invocation:** `/training-plan-composer`
> **When to use:** After a game review is structured, or when converting a known weakness or study goal into a concrete training plan.

---

## Purpose

Turn identified weaknesses, review findings, or study goals into a practical, staged training plan. Converts analysis into action.

This is a planning tool. It organizes study work — it does not generate drill content or simulate engine lines.

---

## When to Use

Use this skill when:
- You have a completed game review (from `/game-review-shaper` or Chess OS pipeline output)
- You have a known weakness you want to target
- You have a study goal ("improve my endgame technique") but no structure for how to work on it
- You want to convert Chess OS coaching output into a week of actual study

Do not use when:
- You have no specific weakness or finding to work from (do `/game-review-shaper` first)
- You want to generate actual drill content (Chess OS puzzle/session runner handles that)

---

## Inputs

Provide one or more of the following:

| Input | Format | Notes |
|---|---|---|
| Review output | Output from `/game-review-shaper` | Preferred primary input |
| Weakness statement | Text | "I keep losing in endgames with rook vs rook" |
| Study goal | Text | "I want to improve my calculation depth" |
| Coach output | Path | `out/coach/<gameId>/coach-report.json` if available |
| Training targets | Path | `out/progress/training-targets.json` if available |
| Time budget | Text | "I have 30 minutes per day, 5 days per week" |
| Training style preference | Text | "I prefer puzzles over theory" (optional) |

If Chess OS training targets or coaching output is available, reference it. The pipeline has already identified the highest-priority weaknesses — prioritize those over guesswork.

---

## Step-by-Step Procedure

### Step 1 — Extract Weaknesses

From the input, build a ranked weakness list:

| Weakness | Source | Severity | Recurrence |
|---|---|---|---|
| <weakness> | review / pipeline / stated | high / medium / low | recurring / isolated |

If Chess OS training targets are available (`out/progress/training-targets.json`), use the pipeline's severity and recurrence scores — they are grounded in real game data. Do not invent severity scores without evidence.

---

### Step 2 — Classify Training Work

For each weakness, assign a study type:

| Study Type | Description | When to Use |
|---|---|---|
| `tactical-drill` | Pattern recognition, puzzles, tactics trainer | Tactical misses, calculation errors |
| `endgame-technique` | Endgame fundamentals, technique practice | Endgame errors, conversion failures |
| `opening-study` | Opening theory, line review, prep update | Opening issues, early structural errors |
| `positional-study` | Strategic concepts, plans, imbalances | Strategic misunderstandings |
| `calculation-exercise` | Long-variation calculation practice | Calculation errors, depth issues |
| `game-annotation` | Annotate a game with a theme in mind | Discipline issues, practical decision errors |
| `timed-practice` | Solve under time pressure | Time-management issues |
| `conceptual-review` | Study a specific concept or idea | Strategic or endgame theme gaps |

---

### Step 3 — Build Study Blocks

Organize the study types into a plan.

Default block structure (adapt to time budget):
- **Short session (≤30 min/day):** 1 primary focus per session, rotate weekly
- **Medium session (30–60 min/day):** 1 primary + 1 secondary focus per session
- **Long session (60+ min/day):** 2 primaries, allow 1 deep-dive block per week

Do not overload a plan. A focused plan with 2 targets beats a scattered plan with 6.

---

### Step 4 — Set Sequence and Cadence

Order the plan:
1. Highest-severity recurring weaknesses first
2. Foundational skills before advanced work (endgame technique before opening theory if both are weak)
3. Short daily repetition for patterns (tactics); longer sessions for concepts

Suggest a review point (e.g., "after 2 weeks, reassess with another game review").

---

### Step 5 — Generate the Plan

Produce structured output (see Output Format below).

---

## Output Format

```markdown
## Training Plan: <short description or date>

**Based on:** <game review / stated weakness / coaching output>
**Time budget:** <N min/day, N days/week — or "not specified">
**Plan horizon:** <1 week / 2 weeks / "until next review">

---

### Primary Objective

<One sentence: what this plan is trying to fix or build>

---

### Weaknesses Being Targeted

| Weakness | Severity | Study Type |
|---|---|---|
| <weakness 1> | high | <study type> |
| <weakness 2> | medium | <study type> |

---

### Study Blocks

#### Block 1 — <Study Type Name>
**Frequency:** <daily / 3x per week / etc.>
**Duration:** <15 min / 30 min / etc.>
**Focus:** <specific description of what to do>
**Resources:** <puzzle trainer / endgame book / annotated games / Chess OS session>

#### Block 2 — <Study Type Name>
**Frequency:** <...>
**Duration:** <...>
**Focus:** <...>
**Resources:** <...>

*(Add blocks as needed. Aim for 2–3 max for focused plans.)*

---

### Recommended Order

1. <Block name> — do this first because <reason>
2. <Block name> — add after <N> sessions of Block 1
3. <Block name> — optional if time allows

---

### Expected Improvement Signal

After following this plan for <N weeks>, you should notice:
- <Observable sign 1>
- <Observable sign 2>

*If you are not noticing these signs, revisit the review and re-run this plan.*

---

### Non-Goals

This plan does NOT address:
- <Weakness explicitly out of scope>
- <Topic deliberately deferred>

---

### Next Step

After completing this plan, run `/game-review-shaper` on a new game, then re-run `/training-plan-composer` to update based on what has and hasn't improved.
```

---

## Truth Boundaries

This skill must not:
- Claim a specific training method will guarantee improvement
- Assign specific time estimates with false precision ("you will improve in exactly 3 weeks")
- Recommend training volumes that are clearly unsustainable
- Ignore stated time constraints to build an ideal-but-impractical plan

When certainty is low, say so:
- "If your schedule allows..."
- "This is a starting point — adjust after your first week"
- "Severity is approximate without more game data"

---

## Integration

- Receives from: `/game-review-shaper` output, Chess OS training targets, coaching output
- Chess OS artifacts that enhance this skill: `out/progress/training-targets.json`, `out/coach/`, `out/curriculum/`
- Contributes to: `/progress-snapshot-helper` (tracks whether training is working)
- Can trigger Chess OS session generation: after building a plan, use the web app study flow or `pnpm --filter worker run generate-session` to create an actual practice session

---

## Example Invocation

> `/training-plan-composer`
> My review showed: endgame issues (high severity, recurring across 3 games), time-management in the endgame (medium, recurring), and one tactical miss (low, isolated). I have 40 minutes per day, 4 days per week.

Expected output: a plan that puts endgame technique first (daily, 20 min), timed endgame practice second (2x per week), and defers tactics drills as a secondary rotation given the isolated tactical miss.
