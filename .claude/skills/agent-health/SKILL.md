# Skill: agent-health

> **Portability:** Chess OS adaptation of portable agent-health pattern
> **Invocation:** `/agent-health`
> **When to use:** Periodically, or when the AI operating layer feels stale, misaligned, or missing pieces.

---

## Purpose

Diagnose the health of the Chess OS AI operating layer. Identify which skills, rules, agents, and docs are operational vs. missing vs. stale.

---

## When to Use

Use this skill when:
- Starting a new session and unsure if the AI OS layer is current
- After a long gap between sessions
- Something feels wrong with skill or agent behavior
- After major changes to the project structure
- Quarterly review of AI OS health

---

## Step-by-Step Procedure

### Step 1 — Check AI Docs Layer

| Source | Path | Check |
|---|---|---|
| Project adapter | `docs/ai/AI_PROJECT_ADAPTER_CHESS_v1.md` | Exists and reflects current project identity |
| Bootstrap checklist | `docs/ai/AI_BOOTSTRAP_READINESS_CHECKLIST_v1.md` | Exists and checklist items are current |
| Skill wave plan | `docs/ai/AI_SKILL_WAVE_2_PLAN_v1.md` | Exists and reflects current skill roadmap |
| Portable doctrine | `docs/ai-core/doctrine/AI_OPERATING_DOCTRINE_PORTABLE_v1.md` | Exists |
| Handoff template | `docs/ai-core/doctrine/CHATGPT_TO_CLAUDE_HANDOFF_TEMPLATE_PORTABLE_v1.md` | Exists |
| Task routing matrix | `docs/ai-core/doctrine/AI_TASK_ROUTING_MATRIX_PORTABLE_v1.md` | Exists |
| Preflight checklist | `docs/ai-core/doctrine/AI_PREFLIGHT_CHECKLIST_PORTABLE_v1.md` | Exists |

---

### Step 2 — Check Rules Layer

| Rule | Path | Status |
|---|---|---|
| 00-workflow | `.claude/rules/00-workflow.md` | Exists / Missing |
| 01-safety-and-proof | `.claude/rules/01-safety-and-proof.md` | Exists / Missing |
| 04-testing-and-verification | `.claude/rules/04-testing-and-verification.md` | Exists / Missing |
| 05-output-formats | `.claude/rules/05-output-formats.md` | Exists / Missing |

---

### Step 3 — Check Skills Layer

| Skill | Path | Status |
|---|---|---|
| prompt-compose | `.claude/skills/prompt-compose/SKILL.md` | Exists / Missing |
| sprint-proof-bundle | `.claude/skills/sprint-proof-bundle/SKILL.md` | Exists / Missing |
| sprint-plan | `.claude/skills/sprint-plan/SKILL.md` | Exists / Missing |
| status-sync | `.claude/skills/status-sync/SKILL.md` | Exists / Missing |
| agent-health | `.claude/skills/agent-health/SKILL.md` | Exists / Missing |

---

### Step 4 — Check Agents Layer

| Agent | Path | Status |
|---|---|---|
| ai-prompt-optimizer | `.claude/agents/ai-prompt-optimizer.md` | Exists / Missing |
| documentation-maintainer | `.claude/agents/documentation-maintainer.md` | Exists / Missing |
| repo-audit-specialist | `.claude/agents/repo-audit-specialist.md` | Exists / Missing |
| code-optimizer | `.claude/agents/code-optimizer.md` | Exists / Missing |
| codebase-navigator | `.claude/agents/codebase-navigator.md` | Exists / Missing |
| proof-bundler | `.claude/agents/proof-bundler.md` | Exists / Missing |
| sprint-manager | `.claude/agents/sprint-manager.md` | Exists / Missing |

---

### Step 5 — Check Status Doc Currency

| Doc | Path | Check |
|---|---|---|
| Current system status | `docs/chess-os/current-state/CURRENT_SYSTEM_STATUS.md` | Last updated within 2 sprints? |
| Phase status | `docs/chess-os/status/PHASE_STATUS.md` | Reflects current milestone state? |
| Next steps | `docs/chess-os/status/NEXT_STEPS.md` | Completed items removed? |
| Context bundle | `out/chess-os/ai/context/context_bundle.md` | Exists? Recent? |

---

### Step 6 — Check Artifact Paths

| Artifact | Path | Status |
|---|---|---|
| Sprint proofs dir | `out/chess-os/sprints/` | Exists |
| Reports dir | `out/chess-os/reports/` | Exists |
| Context bundle dir | `out/chess-os/ai/context/` | Exists |

---

### Step 7 — Produce Health Report

```markdown
## Agent Health Report — Chess OS
**Date:** <YYYY-MM-DD>
**Overall health:** GREEN / AMBER / RED

### AI Docs Layer
| Doc | Status | Notes |
|---|---|---|

### Rules Layer
| Rule | Status | Notes |
|---|---|---|

### Skills Layer
| Skill | Status | Notes |
|---|---|---|

### Agents Layer
| Agent | Status | Notes |
|---|---|---|

### Status Docs
| Doc | Status | Notes |
|---|---|---|

### Issues Found
<List any missing, stale, or misaligned components>

### Recommended Actions
<Ordered list of what to fix first>
```

Health classification:
- **GREEN:** All layer components exist, status docs current, no contradictions
- **AMBER:** Minor gaps (1–2 missing components, status docs slightly stale)
- **RED:** Major gaps (skills missing, status docs contradictory, rules missing)

---

## Failure Protocol

If the report is RED:
- Do not start new implementation sprints until AI OS layer is restored
- Treat the restoration as a sprint (AI-LAYER category in `/sprint-plan`)
