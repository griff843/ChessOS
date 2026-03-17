# Skill: study-closeout-helper

> **Wave:** 4 — Chess Domain Expansion
> **Invocation:** `/study-closeout-helper`
> **When to use:** After completing or attempting a Chess OS diagnostic loop cycle. Verify whether the cycle is actually closed before starting the next one.

---

## Purpose

Verify whether a review/training cycle is actually complete. Classify the loop state, identify what is missing, and determine whether the system is ready to move to the next cycle.

This is a **closeout verification tool**, not a review or planning tool. It does not generate new reviews or training plans. It checks whether the loop closed properly.

---

## Position in the Diagnostic Loop

```
game-review-shaper → training-plan-composer → Chess OS session
    → progress-snapshot-helper → context update → [THIS SKILL]
```

The `study-closeout-helper` is the gate at the end of each cycle.
A cycle should not enter the next planning pass until this helper confirms it is ready.

Architecture reference: `docs/chess-os/architecture/CHESS_DIAGNOSTIC_LOOP.md`

---

## When to Use

Use this skill when:
- A game review was completed and you want to verify the cycle is properly closed
- A training plan was created but you are unsure if execution and follow-through happened
- A session was run and you want to confirm enough artifacts exist
- You have a progress snapshot and want to confirm the loop is ready for next-cycle planning
- A sprint, study block, or review cycle feels partially complete and needs an honest check
- Status or context updates may be stale or missing

Do not use this skill to:
- Generate a new review from scratch (use `/game-review-shaper`)
- Generate a new training plan (use `/training-plan-composer`)
- Assess chess quality or engine accuracy

---

## Inputs

Provide as much of the following as is available. The helper works with partial evidence but will reflect gaps honestly.

| Input | Status | Notes |
|---|---|---|
| Review output | Preferred | From `/game-review-shaper` or Chess OS diagnosis |
| Training plan | Preferred | From `/training-plan-composer` |
| Session artifact or note | Preferred | Execution evidence — not just generation |
| Progress snapshot | Preferred | From `/progress-snapshot-helper` |
| Context bundle state | Optional | Current `out/chess-os/ai/context/context_bundle.md` |

Inputs may arrive as:
- Pasted text outputs
- File paths
- Summaries
- Notes
- Explicit statements ("session was not completed")

---

## Step-by-Step Procedure

### Step 1 — Inventory Evidence

Build an evidence list from all provided inputs:

| Stage | Evidence Provided | Quality |
|---|---|---|
| Review shaped | <yes / no / partial> | <specific or vague> |
| Training plan created | <yes / no / partial> | <staged or generic> |
| Session executed | <yes / no / partial / unclear> | <artifact or note> |
| Progress snapshot | <yes / no> | <multi-game or single> |
| Context updated | <yes / no / deferred> | <explicit or silent> |
| Next focus clear | <yes / no> | |

---

### Step 2 — Apply Completion Rules

#### Complete
All of the following must be true:
- Structured review exists
- Concrete training plan exists (not just "work on tactics")
- Session execution is evidenced (artifact, completion note, or graded session)
- Progress snapshot exists
- Context was updated or explicitly deferred with a stated reason
- Next focus is clear

#### Partial
Some meaningful loop work was done, but one or more stages are missing or weak.

Examples:
- Review + training plan exist, but no executed session evidence
- Session happened, but no progress snapshot
- Snapshot exists, but context was not updated

#### Blocked
A key dependency is missing or contradictory.

Examples:
- Review exists but training plan cannot be derived (too vague)
- Session notes imply work happened but no traceable output exists
- Conflicting evidence makes current state unreliable

#### Not Started
Not enough evidence the cycle meaningfully began.

---

### Step 3 — Identify Gaps

For each incomplete or missing stage, identify:
- What is absent
- Whether the gap blocks the cycle or merely weakens it
- Whether it can be quickly remediated

---

### Step 4 — Generate Output

Produce the closeout output in the required format below.

---

## Output Format

```markdown
## Study Closeout: <game or cycle description>

**Date:** YYYY-MM-DD
**Closeout Verdict:** Complete | Partial | Blocked | Not Started

---

### Completion Matrix

| Stage | Status | Evidence |
|---|---|---|
| Review shaped | Yes / No / Partial | <what exists> |
| Training plan created | Yes / No / Partial | <what exists> |
| Session executed | Yes / No / Partial / Unclear | <what exists> |
| Progress snapshot generated | Yes / No | <what exists> |
| Context updated | Yes / No / Deferred | <what exists or stated reason> |
| Next focus clear | Yes / No | <what was stated> |

---

### What Is Confirmed
- <item 1 with evidence>
- <item 2 with evidence>

---

### What Is Missing
- <item 1 — missing or unconfirmed>
- <item 2>

---

### Risks / Truth Gaps
- <gap 1 — where cycle may look complete but does not have enough proof>
- <gap 2>

---

### Next Required Actions
1. <minimum action to close the cycle>
2. <follow-on action if applicable>

---

### Ready for Next Cycle
**Yes** / **No** / **Conditionally** (with stated condition)
```

---

## Truth Rules

| Rule | Description |
|---|---|
| Planned ≠ Completed | A training plan is not session execution. A generated session is not a completed session. |
| Evidence beats implication | If something is not explicitly supported by evidence, label it missing, partial, or unclear. |
| Uncertainty must be visible | If evidence is weak, contradictory, or incomplete, say so clearly. |
| No invented proof | Never fabricate execution evidence, context updates, file existence, or timestamps. |
| Context ≠ Artifacts | A context bundle update helps the next cycle but does not replace the underlying artifacts. |

---

## Integration

- **Upstream:** Receives outputs from `game-review-shaper`, `training-plan-composer`, Chess OS session execution, `progress-snapshot-helper`
- **Downstream:** Feeds next-cycle planning; context bundle update; future `/progress-snapshot-helper` inputs
- **Architecture reference:** `docs/chess-os/architecture/CHESS_DIAGNOSTIC_LOOP.md`
- **Proof location:** `out/chess-os/sprints/<SPRINT>/<DATE>/`

---

## Example Invocation

> `/study-closeout-helper`
> Review: completed, opening and endgame issues found.
> Training plan: created, endgame technique block + tactical drill block.
> Session: not yet executed.
> Progress snapshot: not done.
> Context: not updated.

Expected output: **Partial** verdict. Completion matrix shows review and plan present, session/snapshot/context all missing. Next required actions: execute at least one session block, generate snapshot from review evidence, update context bundle or explicitly defer.
