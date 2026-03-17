# Skill: sprint-plan

> **Portability:** Chess OS adaptation of portable sprint-plan pattern
> **Invocation:** `/sprint-plan`
> **When to use:** At the start of any session when the next sprint has not yet been chosen.

---

## Purpose

Read Chess OS's current status docs and produce a recommendation for the next best sprint: what to do, why, which model to use, and a ready-to-use prompt starter.

---

## When to Use

Use this skill when:
- Starting a new session and not sure what to work on next
- Choosing between several competing sprint candidates
- Wanting a structured recommendation grounded in current project state

Do not use when:
- A sprint is already in progress (continue it instead)
- The next sprint is already clearly decided

---

## Step-by-Step Procedure

### Step 1 — Read Current State

Read these documents in order:

| Source | Path | What to extract |
|---|---|---|
| Current system status | `docs/chess-os/current-state/CURRENT_SYSTEM_STATUS.md` | What is done, what is in progress, open gaps |
| Phase status | `docs/chess-os/status/PHASE_STATUS.md` | Which milestones are complete, what is active |
| Next steps queue | `docs/chess-os/status/NEXT_STEPS.md` | Prioritized sprint candidates |
| Operating rules | `docs/chess-os/governance/OPERATING_RULES.md` | Constraints that affect sprint selection |
| Project adapter | `docs/ai/AI_PROJECT_ADAPTER_CHESS_v1.md` | Domain boundaries, artifact conventions |

---

### Step 2 — Classify Sprint Candidates

For each candidate in NEXT_STEPS.md, classify it:

| Category | Description | Priority signal |
|---|---|---|
| PIPELINE | Worker pipeline work | High if pipeline broken or blocked |
| TRAINING | Training package changes | High if session quality degraded |
| WEB-UI | Web app pages, components, actions | Medium unless blocking user flows |
| REVIEW | Game review and coaching surfaces | High if core review flow broken |
| REPERTOIRE | Branch repair, drill, line matching | Medium unless actively in use |
| COACH | Coach overview, memory, curriculum | Medium unless coaching workflow blocked |
| TESTING | E2E, smoke, unit tests | High if test suite is failing |
| AI-LAYER | Skills, agents, rules, context bundle | High during AI OS installation |
| ARCH | Architecture, refactors, type contracts | Medium unless blocking other work |
| DATA | Data integrity, validators, paths | High if artifact corruption risk |

---

### Step 3 — Select Best Next Sprint

Apply these selection rules in order:

1. **Broken first:** If any surface is broken or failing verification, fix it before expanding
2. **Active work first:** Complete in-progress sprints before starting new ones
3. **Highest leverage:** Prefer sprints that unblock multiple downstream improvements
4. **Feasibility:** Prefer sprints with clear scope and available context
5. **Queue order:** Among equally prioritized candidates, follow NEXT_STEPS.md order

---

### Step 4 — Model Routing

Select the correct model for the sprint:

| Sprint type | Recommended first tool |
|---|---|
| Architecture ambiguity, roadmap decisions | ChatGPT + context bundle |
| System state diagnosis | Skills/MCP first |
| Clear implementation, scoped repo work | Claude Code direct |
| Verification, closeout, proof | Claude OS |

If the sprint type is unclear, default to ChatGPT first with a fresh context bundle.

---

### Step 5 — Output the Recommendation

Produce a recommendation in this format:

```markdown
## Sprint Recommendation

**Recommended Sprint:** <SPRINT-ID — short description>
**Category:** <CATEGORY>
**Why This Sprint:** <2–3 sentences: why now, what it unblocks, why it's the best next move>

**Model Routing:**
- Start with: <ChatGPT / Claude Code / Claude Skills>
- Context required: <context bundle / specific docs / repo files>

**Prompt Starter:**
Run `/prompt-compose` with this direction:

> <2–4 sentence sprint direction that feeds into prompt-compose>

**Exit Criterion:**
<Observable condition that defines this sprint as done>

**Alternatives Considered:**
| Sprint | Why Skipped |
|---|---|
| <alt 1> | <reason> |
| <alt 2> | <reason> |
```

---

## Failure Protocol

If the status docs are stale or contradictory:
- Do not guess at the current state
- Flag the inconsistency explicitly
- Recommend running `/status-sync` or manually reviewing truth docs before proceeding

---

## Integration

- Feeds into: `/prompt-compose` (use the prompt starter from Step 5)
- After sprint: `/sprint-proof-bundle` then `/status-sync`
- Context bundle: `out/chess-os/ai/context/context_bundle.md` (manual until automation built)
