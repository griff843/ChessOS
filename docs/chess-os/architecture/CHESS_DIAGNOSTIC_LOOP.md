# Chess OS — Canonical Diagnostic Loop

> **Authority:** This document defines the canonical AI-assisted diagnostic loop for Chess OS.
> **Last updated:** 2026-03-16

---

## Purpose

The Chess OS diagnostic loop is the primary repeating workflow for turning real games into structured improvement work. It is the backbone of the AI helper layer installed in Waves 2–4.

---

## The Loop

```
game-review-shaper
       ↓
training-plan-composer
       ↓
Chess OS session execution
       ↓
progress-snapshot-helper
       ↓
context update
       ↓
study-closeout-helper  ←── closes the loop / gates next cycle
       ↓
[next cycle or new game]
```

---

## Stage Definitions

### Stage 1: game-review-shaper
**Invocation:** `/game-review-shaper`
**Input:** PGN, game summary, or rough review request
**Output:** Structured review frame with issue categories, recurring themes, suggested next actions
**Required before:** training-plan-composer

### Stage 2: training-plan-composer
**Invocation:** `/training-plan-composer`
**Input:** Review output from Stage 1; optionally Chess OS training targets
**Output:** Staged training plan with study blocks, cadence, expected improvement signals
**Required before:** session execution

### Stage 3: Chess OS Session Execution
**Invocation:** Web app study flow or `pnpm --filter worker run generate-session`
**Input:** Training plan target weakness
**Output:** Session artifact in `out/sessions/`, grading results, session notes
**Note:** A *generated* session is not a *completed* session. Only actual execution counts.

### Stage 4: progress-snapshot-helper
**Invocation:** `/progress-snapshot-helper`
**Input:** 2+ reviews and/or training notes; optionally Chess OS pipeline artifacts
**Output:** Progress summary with trend analysis (improving / stable / worsening / unknown)
**Required before:** context update

### Stage 5: Context Update
**Action:** Update `out/chess-os/ai/context/context_bundle.md` with new current state
**Minimum content to update:** What was worked on, primary weakness status, best next focus
**May be intentionally deferred** — but deferral must be explicit, not silent

### Stage 6: study-closeout-helper
**Invocation:** `/study-closeout-helper`
**Input:** Outputs from stages 1–5
**Output:** Closeout verdict (Complete / Partial / Blocked / Not Started), completion matrix, next actions
**Role:** Closes the loop and gates entry into the next cycle

---

## Completion Criteria

A cycle is **Complete** when ALL of the following are true:
- Review shaped (Stage 1 output exists)
- Training plan created (Stage 2 output exists)
- Session actually executed (not just generated)
- Progress snapshot generated (Stage 4 output exists)
- Context updated or explicitly deferred with reason
- Next focus is clear

A cycle is **Partial** when meaningful work was done but one or more stages are missing.

A cycle is **Blocked** when a dependency is missing or contradictory.

A cycle is **Not Started** when there is not enough evidence the cycle began.

---

## Loop Artifacts

| Stage | Artifact Location |
|---|---|
| Review output | User session / pasted output |
| Training plan | User session / pasted output |
| Session execution | `out/sessions/<sessionId>/` |
| Progress snapshot | User session / pasted output |
| Context bundle | `out/chess-os/ai/context/context_bundle.md` |
| Closeout report | `out/chess-os/sprints/<SPRINT>/<DATE>/closeout.md` |

---

## Helper Wave Map

| Wave | Helper | Role in Loop |
|---|---|---|
| Wave 2 | `prompt-compose` | Shapes implementation sprints before Claude Code |
| Wave 2 | `sprint-proof-bundle` | Captures sprint closeout evidence |
| Wave 2 | `sprint-plan` | Selects next sprint from status docs |
| Wave 2 | `status-sync` | Keeps truth docs current after sprints |
| Wave 2 | `agent-health` | Diagnoses AI OS layer health |
| Wave 3 | `game-review-shaper` | Stage 1 — structures game review |
| Wave 3 | `training-plan-composer` | Stage 2 — converts findings into training plan |
| Wave 3 | `progress-snapshot-helper` | Stage 4 — synthesizes improvement state |
| Wave 4 | `study-closeout-helper` | Stage 6 — closes loop, gates next cycle |

---

## Design Principles

1. **Evidence over implication** — planned work is not completed work
2. **Honesty about uncertainty** — qualitative findings are marked `~`, not stated as precise
3. **No fake completion** — a loop is not closed unless the closeout helper confirms it
4. **Practical outputs** — every stage produces something actionable, not decorative
5. **Compatible structure** — later helper outputs should be usable by earlier helpers in the next cycle

---

## Related Docs

| Doc | Purpose |
|---|---|
| `docs/ai/AI_SKILL_WAVE_3_CHESS_DIAGNOSTICS_v1.md` | Wave 3 helper spec |
| `docs/ai/AI_SKILL_WAVE_4_CHESS_EXPANSION_v1.md` | Wave 4 helper spec |
| `docs/chess-os/governance/OPERATING_RULES.md` | Sprint-level rules |
| `out/chess-os/ai/context/context_bundle.md` | Current context bundle |
