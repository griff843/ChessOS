# Skill: status-sync

> **Portability:** Chess OS adaptation of portable status-sync pattern
> **Invocation:** `/status-sync <SPRINT-ID>`
> **When to use:** After every sprint closeout, to keep status docs current.

---

## Purpose

Sync Chess OS status docs after a sprint completes. Prevents drift between what the code does, what docs say, and what the project's sprint queue shows.

---

## When to Use

Use after:
- A sprint proof bundle is complete (`/sprint-proof-bundle` done)
- Implementation is verified (typecheck + build + tests pass)
- You are ready to close the sprint officially

Do not use before proof bundle is complete. Status docs should reflect reality, not optimism.

---

## Decision Gate

Before running this skill, confirm:

- [ ] The sprint is actually done (not just implementation, but verification too)
- [ ] Proof bundle exists in `out/chess-os/sprints/<SPRINT>/<DATE>/`
- [ ] The closeout report is written with honest COMPLETE / PARTIAL / BLOCKED status

If any of the above are false, stop. Complete the proof bundle first.

---

## Step-by-Step Procedure

### Step 1 — Read the Closeout Report

Read `out/chess-os/sprints/<SPRINT>/<DATE>/closeout.md`.

Extract:
- What was delivered
- What was not delivered (non-goals / gaps)
- Verification results (typecheck, build, tests)
- Status: COMPLETE / PARTIAL / BLOCKED

---

### Step 2 — Update CURRENT_SYSTEM_STATUS.md

File: `docs/chess-os/current-state/CURRENT_SYSTEM_STATUS.md`

Update rules:
- Move completed items from "In Progress" to "What Is Done"
- Add any new gaps to "Open Gaps"
- Update the "Last updated" date
- If new capabilities landed, add them to the relevant "What Is Done" section
- Do not add things that are partial or blocked as "done"

---

### Step 3 — Update PHASE_STATUS.md

File: `docs/chess-os/status/PHASE_STATUS.md`

Update rules:
- If a milestone is now fully complete, change its status to ✅ Complete
- If work is in progress, update the description in the "Current Active Work" section
- Update the "Last updated" date

---

### Step 4 — Update NEXT_STEPS.md

File: `docs/chess-os/status/NEXT_STEPS.md`

Update rules:
- Remove or check off completed items
- Add newly discovered work items (from the closeout's "Open Gaps" section)
- Re-prioritize if sprint outcomes changed the priority ordering
- Update the "Last updated" date

---

### Step 5 — Verify Sync Quality

After updating, confirm:

- [ ] CURRENT_SYSTEM_STATUS.md accurately reflects what is now done
- [ ] PHASE_STATUS.md shows correct milestone status
- [ ] NEXT_STEPS.md does not list completed items as pending
- [ ] No contradictions between the three docs

---

### Step 6 — Output

Produce a sync summary:

```markdown
## Status Sync: <SPRINT-ID> — <DATE>

### CURRENT_SYSTEM_STATUS.md
- Moved to Done: <items>
- Added to Open Gaps: <items>

### PHASE_STATUS.md
- Updated: <milestone> → ✅ Complete (or updated description)

### NEXT_STEPS.md
- Removed: <completed items>
- Added: <new items from gaps>
- Re-prioritized: <if any>

### Sync Quality
- [ ] No contradictions between docs
- [ ] Reality matches docs
```

---

## Failure Protocol

If docs are contradictory or unclear after updating:
- Flag the contradiction explicitly
- Do not guess which version is correct
- Return to the closeout report and proof artifacts as the authoritative source
