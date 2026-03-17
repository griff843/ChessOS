# study-closeout-helper

## Purpose
The `study-closeout-helper` is a Chess OS domain helper that verifies whether a review/training cycle is actually complete.

Its job is to prevent Chess OS from drifting into half-finished cycles where a review exists, a plan exists, or a session exists, but the loop was never properly closed.

This helper does not create the whole cycle. It checks the cycle, summarizes completion state, identifies missing pieces, and determines whether the system is ready to move to the next cycle.

---

## When to use
Use `study-closeout-helper` when:

- a game review has been completed and you want to verify the cycle is properly closed
- a training plan was created and you need to confirm whether execution and follow-through happened
- a study session has been run and you want to know whether enough artifacts exist to count it as complete
- a progress snapshot exists and you want to confirm the loop is ready for next-cycle planning
- a sprint, study block, or review cycle feels partially complete and needs a completion check
- current-state/context updates may be stale or missing

Do **not** use this helper to generate a new review or a new training plan from scratch.  
Use it only to assess closeout quality and completion state.

---

## Core responsibilities

### 1. Verify required outputs exist
Check whether the expected artifacts from the diagnostic loop are present or supplied.

Expected loop outputs may include:
- structured review output
- training plan output
- session artifact or execution note
- progress snapshot
- context update or explicit deferral note

### 2. Determine completion state
Classify the loop as:
- complete
- partial
- blocked
- not started

### 3. Identify missing components
List what is missing, unclear, stale, or unverified.

### 4. Summarize closeout quality
Provide a structured closeout summary showing:
- what was actually done
- what still needs to happen
- whether the cycle is ready for next-cycle planning

### 5. Protect truth
Do not treat planned work as completed work.  
Do not treat vague notes as execution proof unless clearly stated.

---

## Canonical loop being checked
This helper checks the Chess OS canonical diagnostic loop:

`game-review-shaper → training-plan-composer → Chess OS session → progress-snapshot-helper → context update → next cycle`

The helper is not responsible for performing all steps.  
It only evaluates whether those steps were closed properly.

---

## Inputs

### Minimum inputs
The helper should work from whatever evidence is available, but ideally it receives:

- review output or review summary
- training plan output or summary
- session artifact, execution note, or completion note
- progress snapshot or current-state summary
- context bundle update state, if available

### Possible input forms
Inputs may arrive as:
- pasted structured outputs
- file paths
- summaries
- notes
- mixed manual evidence
- explicit statements such as “session was not completed”

### Acceptable evidence sources
- review docs
- training plan docs
- session notes
- progress summaries
- context bundle excerpts
- artifact paths
- operator notes

---

## Output requirements

A valid `study-closeout-helper` output should usually include these sections:

### 1. Closeout verdict
One of:
- **Complete**
- **Partial**
- **Blocked**
- **Not Started**

### 2. Completion matrix
A structured view of the loop stages, such as:

- Review shaped: yes / no / unclear
- Training plan created: yes / no / unclear
- Session executed: yes / no / partial / unclear
- Progress snapshot generated: yes / no / unclear
- Context updated: yes / no / deferred / unclear
- Next focus clear: yes / no / unclear

### 3. What is confirmed
List the parts that are supported by actual evidence.

### 4. What is missing
List absent or weakly supported items.

### 5. Risks / truth gaps
Identify places where the cycle may look complete but does not have enough proof.

### 6. Next required actions
Provide the minimum actions needed to close the cycle properly.

### 7. Ready-for-next-cycle verdict
State whether the cycle is ready to hand off into the next planning cycle.

---

## Completion rules

### Complete
Mark the cycle **Complete** only when all of the following are true:

- a structured review exists
- a concrete training plan exists
- session execution is evidenced or clearly completed
- a progress snapshot exists
- context was updated or intentionally deferred with reason
- next focus is clear

### Partial
Mark the cycle **Partial** when some meaningful loop work was done, but one or more required stages are missing or weak.

Examples:
- review and training plan exist, but no executed session evidence
- session happened, but no progress snapshot was generated
- progress summary exists, but context was not updated

### Blocked
Mark the cycle **Blocked** when the loop cannot be closed because a key dependency is missing or contradictory.

Examples:
- review exists but no actionable training plan can be found
- session notes imply work happened, but there is no way to tell what was worked on
- conflicting evidence makes the current state unreliable

### Not Started
Mark the cycle **Not Started** when there is not enough evidence that the cycle meaningfully began.

---

## Truth rules

### Rule 1: Planned is not completed
A training plan is not session execution.  
A generated session is not a completed session.  
A note saying “I should review this later” is not a review artifact.

### Rule 2: Evidence beats implication
If something is not explicitly supported by evidence, label it as missing, partial, or unclear.

### Rule 3: Uncertainty must be visible
If evidence is weak, contradictory, or incomplete, say so clearly.

### Rule 4: Do not invent proof
Never fabricate:
- execution evidence
- context updates
- progress certainty
- file existence
- timestamps
- completion state

### Rule 5: Context update is important but not magic
A context bundle update helps the next cycle, but it does not replace the underlying artifacts.

---

## Boundaries

This helper should **not**:

- generate full game reviews from scratch
- generate full training plans from scratch
- pretend to know session quality if no session evidence exists
- fake progress conclusions from tiny samples
- overrule underlying truth docs without evidence
- replace operator judgment when evidence is genuinely ambiguous

This helper **may**:
- flag ambiguity
- request missing evidence conceptually in its output
- distinguish hard proof from soft indication
- recommend the smallest next action needed for closeout

---

## Preferred output style

Outputs should be:

- structured
- concise
- explicit
- evidence-aware
- honest about uncertainty
- practical enough to act on immediately

They should avoid:
- long generic coaching speeches
- vague encouragement
- fake precision
- pretending partial loops are fully complete

---

## Example output shape

### Example 1 — Partial closeout

**Closeout Verdict:** Partial

**Completion Matrix**
- Review shaped: Yes
- Training plan created: Yes
- Session executed: Partial
- Progress snapshot generated: No
- Context updated: No
- Next focus clear: Yes

**What Is Confirmed**
- Review exists with opening and calculation issues
- Training plan exists with tactical drill and opening repair blocks
- Session notes indicate one practice block was started

**What Is Missing**
- No clear evidence of full session completion
- No progress snapshot generated
- No context update recorded

**Risks / Truth Gaps**
- Current loop may be mistaken for complete because planning artifacts exist
- No evidence yet that the session changed understanding or performance

**Next Required Actions**
1. Record actual session completion details
2. Generate progress snapshot from review + session evidence
3. Update context bundle or explicitly defer it

**Ready for Next Cycle:** No

---

### Example 2 — Complete closeout

**Closeout Verdict:** Complete

**Completion Matrix**
- Review shaped: Yes
- Training plan created: Yes
- Session executed: Yes
- Progress snapshot generated: Yes
- Context updated: Yes
- Next focus clear: Yes

**What Is Confirmed**
- Structured review completed
- Training plan created and executed
- Progress snapshot identifies tactical improvement but persistent time-management issues
- Context updated with next-cycle priority

**What Is Missing**
- Nothing critical

**Risks / Truth Gaps**
- Progress confidence still moderate due to limited number of reviewed games

**Next Required Actions**
- Begin next cycle with time-management as primary focus

**Ready for Next Cycle:** Yes

---

## Trigger ideas
This helper is especially appropriate after prompts like:

- “Can you check whether this study cycle is actually complete?”
- “Did I close this loop properly?”
- “What’s still missing before I move to the next training cycle?”
- “Review this review/plan/session/progress set and tell me if it’s fully closed out.”
- “What do I still need to finish here?”

---

## Relationship to other Chess OS helpers

### Upstream
- `game-review-shaper`
- `training-plan-composer`
- Chess OS session execution
- `progress-snapshot-helper`

### Downstream
- context bundle update
- next cycle planning
- future session quality evaluation
- future operating summaries

### Role in the system
This helper strengthens loop discipline.  
It does not replace the core loop; it makes the loop reliable.

---

## Acceptance criteria

This skill is well-defined when:

- it has a clear purpose
- it only evaluates closeout state
- it distinguishes complete vs partial vs blocked vs not started
- it requires evidence-aware outputs
- it protects against fake completion
- it produces practical next actions
- it fits cleanly into the Chess OS diagnostic loop

---

## Current implementation priority
This is the recommended first Wave 4 helper for Chess OS because it strengthens the loop already created in Wave 3 instead of prematurely expanding system complexity.