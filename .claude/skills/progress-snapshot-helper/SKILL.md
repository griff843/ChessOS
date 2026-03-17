# Skill: progress-snapshot-helper

> **Wave:** 3 — Chess Domain Diagnostics
> **Invocation:** `/progress-snapshot-helper`
> **When to use:** Periodically, to summarize recent improvement state and identify where focus should go next.

---

## Purpose

Produce a concise, honest summary of recent chess improvement state. Identify what is improving, what is still costly, what patterns keep recurring, and what the best next focus is.

This is a synthesis tool. It takes inputs from prior reviews and training work and produces a structured snapshot. It does not generate new analysis — it summarizes existing evidence.

---

## When to Use

Use this skill when:
- You have completed 2+ game reviews and want to see patterns across them
- You have been following a training plan and want to assess whether it is working
- You are deciding where to focus next and want a grounded summary
- You want a "state of improvement" artifact to bring to a coaching session or ChatGPT architecture review

Use periodically — not after every single game. One snapshot per 2–4 weeks is a reasonable cadence.

Do not use when:
- You have only one review to draw from (not enough signal for trends)
- You want specific training plan steps (use `/training-plan-composer`)

---

## Inputs

Provide one or more of the following:

| Input | Format | Notes |
|---|---|---|
| Prior game reviews | Text or `/game-review-shaper` outputs | Most important input |
| Training plan | `/training-plan-composer` output | Shows what was targeted |
| Recent game results | Text | Win/loss/draw + rough context |
| Chess OS dashboard output | Path | `out/dashboard/` if available |
| Chess OS progress artifacts | Path | `out/progress/training-targets.json`, `out/progress/` |
| Coach report | Path | `out/coach/` if available |
| Personal notes | Text | "Felt better about my endgames this week" |

If Chess OS pipeline artifacts are available, they provide the most reliable trend signal — especially `out/progress/`, which tracks recurring mistakes across multiple games. Prefer pipeline evidence over impression when both are available.

---

## Step-by-Step Procedure

### Step 1 — Collect Evidence

Build an evidence list from all provided inputs:

| Evidence Item | Source | Relevant Category |
|---|---|---|
| <finding or pattern> | review / pipeline / personal | <issue category> |

If only personal notes are available (no reviews, no pipeline data), note this explicitly. The snapshot will be lower confidence.

---

### Step 2 — Identify Recurring Patterns

Across all evidence, look for:
- Issue categories that appear 2+ times across games
- Issue categories that appeared before and have NOT appeared recently (possibly improving)
- Issue categories that appeared before and are STILL appearing (stuck patterns)

Classify each recurring pattern:

| Pattern | Recurrence | Trend |
|---|---|---|
| <pattern> | N games of N reviewed | improving / stable / worsening / unknown |

Trend logic:
- **Improving:** Present in earlier reviews, absent in recent ones
- **Stable:** Present at similar rate throughout
- **Worsening:** More frequent or more costly in recent games
- **Unknown:** Too few data points to assess direction

---

### Step 3 — Assess Training Plan Effectiveness

If a training plan was active, assess:
- Were the targeted weaknesses the ones that appeared?
- Are targeted weaknesses showing an improving trend?
- Did any untargeted weaknesses grow while focus was elsewhere?

Be honest when the evidence is insufficient to assess effectiveness.

---

### Step 4 — Identify Best Next Focus

Based on the pattern analysis, recommend the best next focus:
- Highest recurrence + worsening/stable trend → most urgent
- Highest recurrence + improving trend → may need less intensity
- New pattern not previously targeted → consider adding to plan

Avoid recommending more than 2 focus areas. Scattered focus is a common training failure mode.

---

### Step 5 — Generate the Snapshot

Produce structured output (see Output Format below).

---

## Output Format

```markdown
## Progress Snapshot: <date or period>

**Games reviewed:** N
**Training plan active:** Yes / No / Partial
**Evidence quality:** Strong (pipeline + reviews) / Moderate (reviews only) / Low (notes only)

---

### Overall State

<2–4 sentences: where things stand right now. Honest, not inflated.>

---

### Areas Improving

| Pattern | Evidence |
|---|---|
| <pattern> | <what suggests improvement> |

*(or: No clear improvement signals detected — not enough data or too early)*

---

### Areas Still Costly

| Pattern | Recurrence | Trend |
|---|---|---|
| <pattern> | N of N games | stable / worsening |

---

### Recurring Themes

<Bullet list of the patterns that keep showing up across games, in plain language>

- <Theme 1>
- <Theme 2>

---

### Training Plan Effectiveness

<If a plan was active:>
- <Targeted weakness 1>: <improving / not yet visible / unclear>
- <Targeted weakness 2>: <improving / not yet visible / unclear>

<If no plan was active:>
- No structured plan was active during this period.

---

### Best Next Focus

**Primary:** <Issue category + why it's the priority>
**Secondary (optional):** <Only if bandwidth allows>

**Not recommended right now:**
- <Issue category — deprioritized because it's improving or isolated>

---

### Confidence Notes

<Note what is well-evidenced vs. what is approximate:>
- Engine-backed: <which findings have pipeline evidence>
- Qualitative (~): <which findings are impressionistic>
- Unknown: <what cannot be assessed from available evidence>

---

### Suggested Next Step

Run `/game-review-shaper` on the next game, then re-run this snapshot in 2–4 weeks to track movement.

*If Primary focus is high severity: also run `/training-plan-composer` to update the training plan.*
```

---

## Truth Boundaries

This skill must not:
- Claim precise trend measurements without adequate data ("your tactical accuracy improved by 15%")
- Generate fake confidence about improving trends from 1–2 data points
- State that training is working when there is insufficient evidence
- Compare against population benchmarks unless real data is provided

When evidence is thin, say so:
- "With only 2 reviews, trends are not yet reliable"
- "This appears to be improving, but more games are needed to confirm"
- "Cannot assess without more structured review data"

---

## Integration

- Receives from: `/game-review-shaper` (multiple sessions), `/training-plan-composer` outputs
- Enhanced by: Chess OS pipeline — `out/progress/`, `out/dashboard/`, `out/coach/`, `out/strategic/`
- Feeds into: ChatGPT architecture sessions (paste snapshot into context bundle update)
- Informs: next `/training-plan-composer` iteration, next sprint selection via `/sprint-plan`

---

## Example Invocation

> `/progress-snapshot-helper`
> I've done 4 game reviews over the past 3 weeks. Endgame issues showed up in all 4. Tactical misses appeared in 2 of them. I was working on endgame technique and it feels a bit better. No pipeline data available.

Expected output: a snapshot showing endgame as a stable recurring theme (4/4, possibly improving but insufficient evidence), tactical misses as moderate (2/4), honest uncertainty about trend given low data, and a recommendation to continue endgame focus while adding one tactical drill block.
