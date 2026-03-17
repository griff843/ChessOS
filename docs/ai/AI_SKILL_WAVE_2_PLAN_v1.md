# AI_SKILL_WAVE_2_PLAN_v1

## Purpose
This document records the early AI helper and skill roadmap for Chess OS.

It originally described the likely first helper wave. After the M-AI-01 upgrade, several of those first-wave helpers are now installed. This document now serves two purposes:

1. record what Wave 2 effectively became in Chess OS
2. define what should come next after the foundational AI operating layer

---

## Current state

Chess OS now has an installed foundational AI workflow layer with these skills:

- `prompt-compose`
- `sprint-proof-bundle`
- `sprint-plan`
- `status-sync`
- `agent-health`

It also has:
- 7 generic agents
- 4 Chess OS-specific rules
- truth wiring and sprint artifact paths
- a manual context bundle surface

This means the original Wave 2 “future helper” concept has partially become reality.

---

## What Wave 2 became in Chess OS

Wave 2 for Chess OS is best understood as the **foundational AI operating layer**.

### Wave 2 outcomes now installed
- prompt composition for implementation work
- sprint planning support
- sprint proof capture
- status synchronization support
- AI operating layer health checks

### Why this matters
This gives Chess OS a real operating spine before deeper chess-domain helpers are introduced.

It means future helpers should now focus less on generic AI workflow infrastructure and more on domain-specific Chess OS intelligence.

---

## 1. Agent-health pattern for Chess OS

### Current status
**Installed**

### Role in Chess OS
The agent-health pattern is now part of the foundational AI layer and should be treated as a system-health helper for the Chess OS operating surface.

### What it should continue to monitor
- presence of required truth docs
- alignment of status/current-state/governance docs
- installed AI operating surfaces
- obvious drift in AI layer structure
- missing or stale operating prerequisites

### Future enhancement direction
Later versions may become more Chess-aware by checking whether:
- game-review surfaces exist
- training-system surfaces exist
- progress-state surfaces exist
- domain helpers are installed and documented

---

## 2. Prompt-compose pattern for Chess OS

### Current status
**Installed**

### Role in Chess OS
Prompt-compose is now one of the central enabling helpers for the Chess OS AI workflow.

### What it should continue to support
- sprint shaping
- Claude implementation prompt generation
- architecture framing
- workflow drafting
- planning requests
- governance-aware execution prompts

### Future enhancement direction
Later versions should gain Chess-domain prompt modes such as:
- game review prompt mode
- training plan prompt mode
- concept diagnosis prompt mode
- progress review prompt mode

This is likely the most important bridge between the generic AI layer and Chess-domain operations.

---

## 3. Incident-triage pattern for Chess OS

### Current status
**Not installed**

### Why it still matters
Although Unit Talk-specific incident tools were correctly excluded, Chess OS may still eventually need a general incident-triage style helper for:

- documentation drift
- conflicting truth docs
- broken operating assumptions
- missing outputs or incomplete closeouts
- workflow confusion between planning, implementation, and verification

### Recommended Chess OS interpretation
This should not be copied from Unit Talk.  
If built later, it should be a lighter operating-triage helper focused on:

- truth-surface mismatch
- sprint closeout gaps
- stale status docs
- missing proof artifacts
- AI operating workflow breakdowns

### Priority
**Secondary**
This is useful, but not the next best move. Chess-domain helpers should likely come first.

---

## 4. Chess-specific future skill ideas

These are the most likely next-phase helpers for Chess OS.

### Game Review Shaper
Converts a rough request, PGN, or game-analysis direction into a structured review workflow.

Likely future uses:
- post-game review structure
- mistake classification
- tactical vs strategic separation
- opening/middlegame/endgame issue framing
- time-management issue capture
- next-step study recommendations

### Training Plan Composer
Turns detected weaknesses or study goals into a structured training plan.

Likely future uses:
- tactical drill planning
- opening repair plans
- endgame work blocks
- concept repetition plans
- short-cycle and long-cycle study planning

### Progress Snapshot Helper
Produces a concise improvement-state summary from recent work.

Likely future uses:
- recurring weakness summaries
- recent improvement themes
- stuck-area detection
- training effectiveness summaries
- next-focus recommendations

### Position / Concept Audit Helper
Helps classify what a reviewed position or lesson is actually about.

Likely future uses:
- tactical motif grouping
- strategic theme tagging
- decision-type classification
- phase-of-game classification
- concept-library alignment

### Study Closeout Helper
Helps verify whether a study cycle, review sprint, or training loop is actually complete.

Likely future uses:
- ensure outputs exist
- ensure next actions are captured
- ensure progress state is updated
- ensure artifacts and summaries are saved

---

## Recommended next implementation order

### Immediate next
**Game Review Shaper**

This should be the first Chess-domain helper because it directly supports the primary operating surface of Chess OS.

### After that
**Training Plan Composer**

### Then
**Progress Snapshot Helper**

### Later
- Position / Concept Audit Helper
- Study Closeout Helper
- lightweight Incident Triage for Chess OS
- deeper Chess-aware Agent Health extensions

---

## Recommended wave model from here

### Wave 2
**Foundational AI operating layer**  
Status: **Installed**

Contents:
- prompt-compose
- sprint-proof-bundle
- sprint-plan
- status-sync
- agent-health
- generic agents
- Chess OS-specific rules
- truth/status/governance wiring

### Wave 3
**Chess-domain diagnostic and planning helpers**  
Status: **Next**

Likely contents:
- game review shaper
- training plan composer
- progress snapshot helper

### Wave 4
**Deeper chess operating intelligence**  
Status: **Future**

Likely contents:
- position / concept audit helper
- study closeout helper
- Chess-aware triage/health extensions
- evidence-backed review orchestration

---

## Current planning verdict

Chess OS should **not** spend more time extending generic AI infrastructure right now unless a real operating gap appears.

The highest-value next move is to begin domain-layer helper design.

That means the next AI helper work should be aimed at:
- game review structure
- training conversion
- progress summarization

---

## Outcome target
After this update, Chess OS should treat:

- Wave 2 as largely complete
- the generic AI operating layer as installed
- the next frontier as Chess-domain helper development

The next major AI operating milestone should be:
**Wave 3 — Chess Diagnostic Helpers**