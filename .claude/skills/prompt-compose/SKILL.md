# Skill: prompt-compose

> **Portability:** Chess OS adaptation of portable prompt-compose pattern
> **Invocation:** `/prompt-compose`
> **When to use:** Before any non-trivial implementation sprint. Converts a rough direction into a complete, Claude-ready implementation prompt.

---

## Purpose

Convert an approved sprint direction into a structured, Claude Code-ready implementation prompt.

This skill enforces scope, constraints, acceptance criteria, and proof expectations before handoff. It prevents vague prompts from producing vague implementations.

---

## When to Use

Use this skill when:
- You have a sprint idea but no structured prompt yet
- You want to harden the scope before implementation
- You are transitioning from ChatGPT architecture output to Claude Code execution
- The task touches more than one file or subsystem

Do not use this skill for:
- Tiny one-line fixes with no ambiguity
- Already-in-progress sprints that have an established context

---

## Step-by-Step Procedure

### Step 1 — Gather Context

Read the following before composing the prompt:

| Source | Path |
|---|---|
| Current system status | `docs/chess-os/current-state/CURRENT_SYSTEM_STATUS.md` |
| Phase status | `docs/chess-os/status/PHASE_STATUS.md` |
| Next steps queue | `docs/chess-os/status/NEXT_STEPS.md` |
| Operating rules | `docs/chess-os/governance/OPERATING_RULES.md` |
| Project adapter | `docs/ai/AI_PROJECT_ADAPTER_CHESS_v1.md` |

Also read any directly relevant files in the repo for the sprint scope (types, existing implementations, test patterns).

---

### Step 2 — Classify the Sprint

Identify which sprint category applies:

| Category | Description |
|---|---|
| PIPELINE | Worker pipeline stages (PGN, engine, features, classification, datasets) |
| TRAINING | Training package (sessions, adaptive, coach, repair, cognitive) |
| WEB-UI | Web app features (pages, components, server actions) |
| REVIEW | Game review flows, coaching surfaces, diagnosis |
| REPERTOIRE | Repertoire branch repair, drill console, line matching |
| COACH | Coach layer (overview, memory, curriculum, patterns) |
| TESTING | E2E tests, unit tests, smoke tests, fixtures |
| AI-LAYER | AI OS layer (skills, agents, rules, status docs, context bundle) |
| ARCH | Architecture, refactor, type changes, contracts |
| DATA | Data integrity, validators, artifact paths, atomic writes |

---

### Step 3 — Fill the Handoff Template

Fill every field. A missing field is a known ambiguity risk.

```markdown
## Handoff: <SPRINT-ID — short description>

**Objective**
<One sentence: what must be true when this is done?>

**Why It Matters**
<One to two sentences: what breaks or degrades without this? What does it unlock?>

**Scope**
<Explicit files, subsystems, behaviors in scope. Be specific.>

**Non-Goals**
<Explicit boundaries of what is NOT included.>

**Source of Truth**
<The canonical reference for this sprint. Name the exact file or pattern to consult.>

**Constraints / Invariants**
- Web app MUST use --webpack flag
- ChessColor type is "white" | "black" (not "w" | "b")
- exerciseId = positionId format (gameId:ply)
- E2E tests run on port 3401 (dev on 3001)
- All JSON artifact writes use atomicWriteFile
- No direct DB writes — go through adapter
- <any sprint-specific constraints>

**Implementation Tasks**
1.
2.
3.

**Verification Steps**
- [ ] `pnpm -r run typecheck` passes
- [ ] `pnpm --filter web run build` passes (if web changes)
- [ ] `pnpm test:e2e` passes (or relevant subset)
- [ ] <sprint-specific behavioral check>

**Output Format**
<Code diffs / file list / proof artifact / test result — specify what to deliver>

**Success Criteria**
- <Observable, unambiguous condition 1>
- <Observable, unambiguous condition 2>
```

---

### Step 4 — Governance Reminders

Before handing off to Claude Code, confirm:

- [ ] Scope is explicit and bounded
- [ ] Non-goals are explicit (prevents scope creep)
- [ ] Source of truth is named (prevents guessing)
- [ ] Constraints include Chess OS invariants (types, ports, webpack flag)
- [ ] Verification steps include typecheck + build + relevant tests
- [ ] Proof location defined: `out/chess-os/sprints/<SPRINT>/<DATE>/`

Reference docs:
- Operating rules: `docs/chess-os/governance/OPERATING_RULES.md`
- Handoff template: `docs/ai-core/doctrine/CHATGPT_TO_CLAUDE_HANDOFF_TEMPLATE_PORTABLE_v1.md`

---

### Step 5 — Output

Deliver the completed handoff template as the implementation prompt.

The output should be pasteable directly into Claude Code with no further setup required.

---

## Failure Protocol

If you cannot fill a field with confidence:
- Do not guess. Leave it as `<UNKNOWN — needs decision>`
- Escalate to ChatGPT for architectural clarification before proceeding
- Do not hand off to Claude Code with unresolved fields

---

## Integration

- Feeds into: Claude Code implementation
- Follows from: ChatGPT sprint shaping or `/sprint-plan` output
- After implementation: run `/sprint-proof-bundle` to capture proof
- After proof: run `/status-sync` to update status docs
