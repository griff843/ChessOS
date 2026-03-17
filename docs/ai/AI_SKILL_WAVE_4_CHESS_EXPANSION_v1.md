# AI_SKILL_WAVE_4_CHESS_EXPANSION_v1

## Purpose
This document defines the likely next Chess OS helper expansion after Wave 3.

Wave 3 established the first domain diagnostic loop:

- `game-review-shaper`
- `training-plan-composer`
- `progress-snapshot-helper`

Wave 4 should extend that loop carefully by improving closeout discipline, concept classification, and session quality without overbuilding advanced automation too early.

---

## Current state

### Wave 2
Installed foundational AI operating layer:
- `prompt-compose`
- `sprint-proof-bundle`
- `sprint-plan`
- `status-sync`
- `agent-health`

### Wave 3
Installed Chess-domain diagnostic layer:
- `game-review-shaper`
- `training-plan-composer`
- `progress-snapshot-helper`

### What comes next
Wave 4 should focus on improving the quality, structure, and usefulness of the loop already in place.

It should not jump straight to heavy autonomous chess intelligence.

---

## Wave 4 objective

Wave 4 should make the Chess OS diagnostic loop:

- easier to close properly
- easier to classify by concept and problem type
- easier to evaluate for real usefulness
- more consistent across repeated cycles

Wave 4 is about **making the loop sharper**, not dramatically larger.

---

## Wave 4 guiding rules

Wave 4 helpers should:

- reinforce the canonical diagnostic loop
- improve output quality and consistency
- remain honest about uncertainty
- avoid pretending to be a full chess engine or coach replacement
- prefer structure, evidence, and closeout discipline over flashy complexity

Wave 4 helpers should not:

- replace engine analysis
- invent rich performance metrics from weak data
- become autonomous long-horizon coaching agents
- overcomplicate the loop before enough real usage exists

---

## Proposed Wave 4 helper set

### 1. study-closeout-helper

#### Purpose
Ensure a review/training cycle is actually closed cleanly and not left in a vague half-finished state.

#### Why it should come first
Wave 3 created the loop.  
The first Wave 4 priority should be making sure the loop closes properly.

#### Main responsibilities
- verify required outputs exist
- confirm whether a session was actually executed
- confirm whether progress was summarized
- confirm whether context was updated
- identify what is still missing from a cycle

#### Likely inputs
- review output
- training plan output
- session artifact or execution note
- progress snapshot
- current context bundle state

#### Likely outputs
- closeout summary
- completion checklist
- missing artifact list
- unresolved follow-up list
- ready-for-next-cycle verdict

#### Why it matters
Without closeout discipline, Chess OS can generate many useful-looking outputs without ever becoming a reliable operating system.

---

### 2. position-concept-audit

#### Purpose
Help classify what a reviewed position, lesson, or repeated issue is actually about.

#### Why it should come second
Once closeout is reliable, the next leverage point is better conceptual classification.

#### Main responsibilities
- classify positions or issues by concept
- identify tactical vs strategic vs practical themes
- improve consistency of diagnosis language
- support downstream training prioritization

#### Likely concept families
- tactical motif
- calculation error
- strategic plan issue
- opening misunderstanding
- endgame technique gap
- time-management issue
- discipline / practical-choice issue

#### Likely inputs
- review findings
- positions
- annotated notes
- repeated weakness descriptions
- training focus areas

#### Likely outputs
- concept tags
- concept summary
- likely root-cause categories
- suggested related study directions

#### Why it matters
This helper would make later training plans and progress snapshots more coherent and less vague.

---

### 3. session-quality-evaluator

#### Purpose
Evaluate whether a generated or completed Chess OS training session was actually useful.

#### Why it should come third
After closeout and concept audit support exist, session quality becomes the next meaningful leverage point.

#### Main responsibilities
- assess whether a session matched the target weakness
- flag sessions that were too broad, too shallow, or poorly sequenced
- identify whether practice seems likely to improve the intended area
- support refinement of future session generation

#### Likely inputs
- training plan
- generated session
- session completion notes
- target weakness
- follow-up snapshot or self-report

#### Likely outputs
- session quality summary
- mismatch warnings
- usefulness estimate
- improvement suggestions for future sessions

#### Why it matters
Chess OS should not only generate sessions; it should gradually get better at generating useful ones.

---

## Secondary / later Wave 4 candidates

These should be considered possible additions, but not immediate priorities.

### opening-repair-planner
Focused helper for turning opening issues into a repair workflow.

### endgame-focus-planner
Focused helper for turning endgame weaknesses into a structured repair plan.

### recurring-blunder-classifier
Detects repeated types of costly mistakes across multiple reviews.

### chess-aware agent-health extension
Extends generic health checks with domain-layer awareness.

### lightweight operating triage helper
Helps detect loop breakdowns, stale outputs, or truth-surface mismatch.

---

## Recommended build order

### First
**study-closeout-helper**

### Second
**position-concept-audit**

### Third
**session-quality-evaluator**

This order is recommended because:
- closeout discipline should come before deeper expansion
- concept consistency improves all later outputs
- session quality evaluation is most useful after the loop is more stable

---

## Shared design principles for Wave 4 helpers

Wave 4 helpers should all aim for:

- practical outputs
- reusable structure
- clear boundaries
- explicit uncertainty
- compatibility with existing Wave 3 outputs
- support for the canonical diagnostic loop

### Preferred qualities
- concise but structured
- evidence-aware
- easy to act on
- easy to feed into later docs or helper flows
- not over-engineered

---

## Out of scope for Wave 4

Wave 4 should not attempt to build:

- autonomous coaching orchestration
- full engine pipeline management
- opening database systems
- repertoire automation
- rating prediction systems
- opponent-pool exploit modeling
- deep longitudinal scoring systems
- fully automated memory pipelines
- broad agent swarms

Those should only be considered later if the earlier helper waves prove genuinely useful in practice.

---

## Acceptance criteria for Wave 4 planning complete

Wave 4 planning should be considered complete when:

- the next helper set is clearly identified
- each helper has a defined purpose
- the build order is locked
- the scope is constrained
- out-of-scope items are explicitly separated
- the relationship to the Wave 3 loop is clear

---

## Current planning verdict

Wave 3 created the first real Chess-domain loop.

Wave 4 should strengthen that loop by improving:

- cycle closeout
- concept classification
- session quality feedback

The best next implementation target is:

**study-closeout-helper**

---

## Immediate next step

After this document is in place, the next clean artifact should be:

- `docs/ai/skills/study-closeout-helper/SKILL.md`

That spec should define:
- trigger conditions
- what closeout checks are required
- inputs and outputs
- what counts as complete vs partial
- truth boundaries
- examples