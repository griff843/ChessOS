# Skill: session-quality-evaluator

> **Wave:** 4 — Chess Domain Expansion
> **Invocation:** `/session-quality-evaluator`
> **When to use:** After a Chess OS training session has been generated or completed, to evaluate whether it matched the target weakness and was likely to be useful.

---

## Purpose

Evaluate the quality and usefulness of a generated or completed Chess OS training session. Determines whether the session addressed the right weakness, with the right exercises, at the right depth.

Where `training-plan-composer` decides *what to study*, `session-quality-evaluator` asks *did the session actually do that?* — checking for alignment between the diagnosed weakness, the generated exercises, and the executed result.

This is an evaluation tool, not a generation tool. It does not create new sessions or training plans. It imposes a quality verdict on evidence already in hand.

---

## When to Use

Use this skill when:
- A Chess OS session has been generated and you want to verify it matches the target weakness before executing it
- A session has been completed and you want to assess whether it was useful
- A training plan was created but the generated session feels off — exercises seem wrong or unrelated
- You are closing a diagnostic loop cycle and want an honest quality check before moving on
- A session generated for a specific weakness (e.g., `rook-endgame`) contains exercises that do not obviously address it

Do not use when:
- No session has been generated yet — run the pipeline (`generate-session`) first
- You need engine-level position evaluation — run the Chess OS pipeline instead
- The weakness is already clearly well-addressed by the session and the question is trivial
- You want to shape a training plan rather than evaluate an existing one (use `/training-plan-composer`)

---

## Inputs

Provide one or more of the following:

| Input | Format | Notes |
|---|---|---|
| Generated session | Path or JSON | `out/sessions/<sessionId>/study-session.json` — primary input |
| Training plan | Text or path | Output from `/training-plan-composer` or description of target weakness |
| Target weakness | Text | The specific weakness the session was meant to address (e.g., `rook-endgame`, `fork` patterns) |
| Concept tags | Text | From `/position-concept-audit` — maps weakness to concept tags |
| Completion notes | Text | Did the session get executed? What happened? Any self-report of difficulty or usefulness? |
| Training targets | Path | `out/intelligence/<gameId>/training-targets.json` — engine-verified critical positions |
| Composition rationale | Path | `out/sessions/<sessionId>/composition-rationale.json` — session generator's stated reasoning |
| Progress snapshot | Text or path | From `/progress-snapshot-helper` — post-session result if available |

If the composition rationale is available, consult it — it records what the session generator intended. Evaluating against stated intent is more reliable than evaluating against inferred intent.

---

## Quality Dimensions

Evaluate the session against these seven dimensions. Each dimension can be rated: `strong`, `adequate`, `weak`, or `unknown` (when evidence is insufficient).

| Dimension | What to Assess |
|---|---|
| **Target match** | Did the session exercises address the diagnosed weakness? Do the exercise positions correspond to the phase and error type identified in the review? |
| **Concept alignment** | Do the exercise types match the concept tags? (e.g., endgame-technique exercises for a `rook-endgame` weakness; tactical exercises for a `fork` miss) |
| **Depth calibration** | Were exercises appropriately challenging? Not so easy they require no thinking; not so difficult they provide no useful repetition. |
| **Sequencing** | Were exercises ordered sensibly? Progression from simpler → harder, or systematic within a concept, is better than random ordering. |
| **Volume** | Was the session sized appropriately for the weakness severity? A single blunder target may warrant a focused 3–5 exercise session; a recurring theme may warrant more. |
| **Coverage gaps** | Were important facets of the weakness left uncovered? (e.g., a `rook-endgame` session that only covers Lucena but skips Philidor when both were relevant) |
| **Completion** | Was the session actually executed? If not, the quality of generation is moot — flag non-completion explicitly. |

---

## Step-by-Step Procedure

### Step 1 — Gather Evidence

Read the input. Identify what is available:
- What weakness was targeted (from training plan, concept tags, or description)?
- What exercises were generated (from session file or description)?
- Was the session executed (from completion notes or progress snapshot)?
- Is the composition rationale available?

Build a brief evidence inventory before proceeding.

---

### Step 2 — Assess Target Match and Concept Alignment

For each exercise in the session:
- What is the position's phase (opening / middlegame / endgame)?
- What error type is it training (tactical / strategic / endgame-technique / etc.)?
- Does this correspond to the target weakness?

If concept tags are available from `/position-concept-audit`, use them directly. If not, infer from the training plan or description.

Flag mismatches explicitly: "Exercise 3 is a middlegame tactic but the target weakness is `rook-endgame`."

Rules:
- If the majority of exercises address the target weakness, mark target match as `strong`
- If some exercises are on-target and some are not, mark as `adequate` with a note
- If most exercises do not address the target weakness, mark as `weak` — this is a mismatch
- If there is not enough information to assess, mark as `unknown`

---

### Step 3 — Assess Session Structure

Evaluate the structural dimensions: depth calibration, sequencing, volume, coverage gaps.

For depth calibration:
- Is there evidence the exercises are at the right difficulty level? (composition rationale may state this)
- Were exercises graded as too easy or too hard in completion notes?

For sequencing:
- Is there a visible ordering principle in the session? Or are exercises apparently random?

For volume:
- Is the number of exercises plausible for the weakness being addressed?
- A 1-exercise session for a severe recurring weakness is under-targeted.
- A 12-exercise session for a single isolated blunder is over-built.

For coverage gaps:
- Are there obvious sub-topics of the weakness that the session does not touch?
- Only flag gaps that are material — do not invent coverage requirements not implied by the weakness.

---

### Step 4 — Flag Mismatches and Gaps

Compile explicit mismatch and gap findings:

For each mismatch:
- Name the exercise or pattern
- State what was expected vs what was found
- Estimate whether this is a minor deviation or a fundamental alignment failure

For each gap:
- Name the uncovered facet
- State why it matters to the target weakness
- Note whether the gap is engine-backed (from training-targets.json) or qualitative

If no mismatches or gaps are found with high confidence, say so explicitly — do not fabricate findings.

---

### Step 5 — Generate the Quality Report

Produce structured output (see Output Format below). Assign the usefulness verdict last, after all dimensions are assessed.

---

## Output Format

```markdown
## Session Quality Evaluation: <session ID or short description>

**Based on:** <session file / training plan / completion notes / pipeline artifacts>
**Certainty level:** Pipeline-backed / Qualitative (~) / Mixed

---

### Evidence Inventory

| Input | Available | Notes |
|---|---|---|
| Session artifact | yes / no / partial | |
| Training plan / target weakness | yes / no / partial | |
| Concept tags | yes / no | From /position-concept-audit if available |
| Completion notes | yes / no / partial | |
| Composition rationale | yes / no | |
| Training targets | yes / no | |

---

### Quality Dimension Assessment

| Dimension | Rating | Notes |
|---|---|---|
| Target match | strong / adequate / weak / unknown | |
| Concept alignment | strong / adequate / weak / unknown | |
| Depth calibration | strong / adequate / weak / unknown | |
| Sequencing | strong / adequate / weak / unknown | |
| Volume | strong / adequate / weak / unknown | |
| Coverage gaps | strong / adequate / weak / unknown | |
| Completion | executed / not executed / unknown | |

---

### Mismatches and Gaps

*(List any exercises or patterns that do not match the target weakness, or facets of the weakness left uncovered)*

| Finding | Type | Severity | Certainty |
|---|---|---|---|
| <description> | mismatch / gap | minor / major | Pipeline-backed / ~ |

*(or: No material mismatches or gaps identified)*

---

### Usefulness Verdict

**Verdict:** `well-matched` | `partially-matched` | `mismatched` | `insufficient-evidence`

**Reasoning:** <2–3 sentences explaining the verdict. What is the strongest evidence for it? What would change it?>

---

### Improvement Suggestions

For each material mismatch or gap, provide a specific, actionable suggestion for future session generation:

| Issue | Suggestion | Priority |
|---|---|---|
| <finding> | <specific action — e.g., "next session should include 2–3 rook-behind-passed-pawn exercises in endgame phase"> | high / medium / low |

*(Avoid vague suggestions like "improve targeting." Prefer: "Replace exercise 3 with a position where the rook endgame defense technique is required.")*

---

### Certainty Notes

- Pipeline-backed: <findings grounded in composition-rationale.json or training-targets.json>
- Qualitative (~): <findings based on description or inferred match>
- Unknown: <dimensions where evidence was insufficient to assess>
```

---

## Usefulness Verdict Definitions

| Verdict | Meaning |
|---|---|
| `well-matched` | The majority of exercises address the target weakness at the right concept level and appropriate depth. Minor gaps exist but do not undermine usefulness. |
| `partially-matched` | A meaningful portion of exercises address the target weakness, but significant gaps, mismatches, or structural problems reduce expected usefulness. |
| `mismatched` | The session does not address the target weakness in a meaningful way. Exercises are off-concept, wrong phase, or too generic to be useful for the stated target. |
| `insufficient-evidence` | Not enough information is available to assess. The session artifact, training plan, or target weakness description is missing or too vague. |

Do not assign `well-matched` or `partially-matched` without named supporting evidence. Do not assign `mismatched` based on surface appearance alone without checking the composition rationale or concept tags.

---

## Truth Boundaries

This skill must not:
- Claim numerical accuracy or quantitative match scores without pipeline artifact support
- Call a session "well-matched" or "good" without naming the specific evidence that supports it
- Fabricate exercise content, position descriptions, or concept tags not present in the input
- Flag a session as `mismatched` based solely on session length or exercise count
- Assert that a gap exists unless the uncovered facet is clearly implied by the stated weakness
- Claim a session was "executed successfully" without completion evidence

When certainty is low, mark with `~` and explain the basis:
- "Target match appears adequate (~) — based on training plan description, not session artifact review"
- "Concept alignment is pipeline-backed — composition-rationale.json confirms endgame-technique targeting"

---

## Integration

- Receives from: `/training-plan-composer` (target weakness and plan); `/position-concept-audit` (concept tags); Chess OS pipeline output (`out/sessions/`, `out/intelligence/`)
- Feeds into: `/study-closeout-helper` — quality verdict contributes to loop closure decision
- Feeds into: `/progress-snapshot-helper` — usefulness verdict adds context to progress tracking
- Contributes to: `/training-plan-composer` improvement — improvement suggestions inform future plan shaping
- Enhances: `out/chess-os/ai/context/context_bundle.md` — recurring `mismatched` verdicts are worth noting in the active context

---

## Example Invocation

> `/session-quality-evaluator`
> Target weakness: rook endgame — failed to hold Philidor position (identified in game review, `rook-endgame` concept tag from position-concept-audit). Generated session: `session-c60ab339` (8 exercises: endgame_technique + material_loss). Composition rationale available at `out/sessions/session-c60ab339/composition-rationale.json`.

Expected output: evidence inventory confirming composition rationale is available; quality dimensions assessed against `rook-endgame` concept tag; any material_loss exercises flagged if they do not relate to rook endgame positions; usefulness verdict distinguishing whether the endgame_technique exercises specifically cover Philidor technique or are generic endgame exercises; improvement suggestion specifying Philidor position exercises if they are absent.
