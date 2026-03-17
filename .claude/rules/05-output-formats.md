# Rule 05 — Output Formats

> **Authority:** This rule defines required formats for sprint artifacts, proof bundles, and status doc conventions.

---

## Sprint Proof Bundle Structure

```
out/chess-os/sprints/<SPRINT-ID>/<YYYY-MM-DD>/
  git-status.txt
  git-diff-stat.txt
  git-log.txt
  typecheck.txt
  build.txt               (if web changes)
  test-e2e.txt            (if E2E run)
  test-smoke.txt          (if smoke run)
  closeout.md
```

Sprint ID format: `<MILESTONE-ID>-<short-description>`
- Examples: `M-AI-01-truth-wiring`, `M013-context-bundle`, `M-CHESS-01-game-review-shaper`

---

## Closeout Report Format

```markdown
# Sprint Closeout: <SPRINT-ID>

**Date:** YYYY-MM-DD
**Branch:** <branch name>
**Status:** COMPLETE | PARTIAL | BLOCKED

## Objective
<One to two sentences>

## Scope Delivered
- <item>

## Non-Goals
- <item>

## Verification Results
| Check | Result |
|---|---|
| Typecheck | PASS / FAIL |
| Build | PASS / FAIL |
| E2E Tests | N / N pass |

## Proof Artifacts
- git-status.txt ✅
- typecheck.txt ✅
- ...

## Open Gaps
<Items not delivered or newly discovered>

## Next Step
<Follow-on sprint or reference to NEXT_STEPS.md>
```

---

## Status Doc Format Standards

### CURRENT_SYSTEM_STATUS.md

Required sections:
- `## Active Phase` — one line identifying current milestone
- `## What Is Done` — grouped by phase/milestone
- `## What Is In Progress` — current active work
- `## What Is Next` — pointer to NEXT_STEPS.md
- `## Open Gaps` — known gaps
- `> Last updated: YYYY-MM-DD` at top

### PHASE_STATUS.md

Required sections:
- Table of all milestones with emoji status (✅ / 🔄 / ⏳)
- `## Current Active Work` — what is actively in progress

### NEXT_STEPS.md

Required sections:
- `## Immediate` — current in-progress sprint(s) with checkbox tracking
- `## Next Sprint Queue (Prioritized)` — numbered list
- `## Backlog` — unprioritized future candidates

---

## Context Bundle Format

File: `out/chess-os/ai/context/context_bundle.md`

Sections to include (for ChatGPT paste):
1. Project identity (from AI_PROJECT_ADAPTER_CHESS_v1.md §1)
2. Current phase (from CURRENT_SYSTEM_STATUS.md)
3. What is done (last 3–5 milestones)
4. What is in progress
5. Next sprint candidates (top 3)
6. Key constraints (from OPERATING_RULES.md)
7. Architecture summary (key subsystems)

Update before any ChatGPT architecture session.

---

## Agent Health Report Format

```markdown
## Agent Health Report — Chess OS
**Date:** YYYY-MM-DD
**Overall:** GREEN | AMBER | RED

### AI Docs Layer    [GREEN/AMBER/RED]
### Rules Layer      [GREEN/AMBER/RED]
### Skills Layer     [GREEN/AMBER/RED]
### Agents Layer     [GREEN/AMBER/RED]
### Status Docs      [GREEN/AMBER/RED]

### Issues Found
- <list>

### Recommended Actions
1.
```

---

## General Output Rules

- All dates in `YYYY-MM-DD` format
- All file paths use forward slashes
- All status fields use explicit PASS/FAIL/COMPLETE/PARTIAL/BLOCKED — not implied or assumed
- All artifact paths must be exact — no approximate references
