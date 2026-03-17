# Update Rules — Status Sync

> **Authority:** These rules control how status docs are updated after a Chess OS sprint.

---

## CURRENT_SYSTEM_STATUS.md Update Rules

| Field | Update Rule |
|---|---|
| "Last updated" | Always update to today's date |
| "Active Phase" | Update only if the active phase/milestone changed |
| "What Is Done" | Add newly completed items. Never remove items. |
| "What Is In Progress" | Move completed items out. Add newly started items. |
| "What Is Next" | Update pointer to NEXT_STEPS.md. |
| "Open Gaps" | Add newly discovered gaps from closeout. |

**Never mark something as Done in this doc if:**
- Typecheck is failing for sprint changes
- Build is failing for sprint changes
- Tests introduced by the sprint are failing

---

## PHASE_STATUS.md Update Rules

| Field | Update Rule |
|---|---|
| Milestone row status | Change to ✅ Complete only when FULLY verified |
| "Current Active Work" | Update to reflect current reality |
| "Last updated" | Always update to today's date |

**Never change a milestone to ✅ Complete if:**
- Proof bundle does not exist
- Typecheck or build failed for sprint changes

---

## NEXT_STEPS.md Update Rules

| Field | Update Rule |
|---|---|
| "Immediate" section | Remove completed items. Update in-progress status. |
| "Next Sprint Queue" | Remove completed items. Add newly identified work. |
| "Backlog" | Add low-priority items discovered during sprint. |
| Priority order | Re-evaluate after each sprint — outcomes change priorities |
| "Last updated" | Always update to today's date |

---

## Consistency Rules

After every status sync, confirm:

1. **No item is "Done" in CURRENT_SYSTEM_STATUS.md and still "Immediate" in NEXT_STEPS.md**
2. **No item is "✅ Complete" in PHASE_STATUS.md and still "In Progress" in CURRENT_SYSTEM_STATUS.md**
3. **The "Active Phase" in CURRENT_SYSTEM_STATUS.md matches PHASE_STATUS.md "Current Active Work"**
4. **NEXT_STEPS.md "Immediate" section reflects reality, not the original plan**

---

## What Not to Update Here

Do not update here:
- `docs/ai/AI_PROJECT_ADAPTER_CHESS_v1.md` — only update if domain model changes
- `docs/chess-os/governance/OPERATING_RULES.md` — only update if rules change
- `docs/ai/AI_SKILL_WAVE_2_PLAN_v1.md` — update when new chess skills are built

These have their own update triggers. Status sync only touches the three status docs.
