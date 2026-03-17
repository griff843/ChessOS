# Model Selection Guide — Chess OS Sprints

> Use this to select the right AI tool for a given sprint type.

---

## Primary Routing Table

| Task | First Tool | Why |
|---|---|---|
| Unresolved architecture decision | ChatGPT | Needs reasoning and tradeoff analysis |
| Roadmap sequencing | ChatGPT | Strategic judgment |
| Sprint shaping (rough idea → structured plan) | ChatGPT | Needs context synthesis |
| Clear implementation (scoped, context exists) | Claude Code | Execution not reasoning |
| System health / state diagnosis | Claude Skills | Structured truth access |
| Code review or audit | ChatGPT or Claude Code | Depends on scope |
| Verification, proof, closeout | Claude OS | Governance function |

---

## Chess OS–Specific Routing

| Chess OS Sprint Type | Recommended Start | Context Required |
|---|---|---|
| Pipeline stage bug | Claude Code (if scoped) or Skills (if unclear) | Relevant pipeline module files |
| Training package change | Claude Code | `packages/training/src/` pattern |
| Web app feature | Claude Code | `apps/web/src/` + current page pattern |
| E2E test addition | Claude Code | Existing test file patterns in `tests/` |
| Coach/curriculum change | Claude Code | Existing coach output types |
| Strategic analysis (what to build next) | ChatGPT | Fresh context bundle |
| Architecture refactor | ChatGPT | Context bundle + affected files |
| AI OS layer work | Claude Code | This skills directory |

---

## Context Bundle Rule

Use a fresh context bundle when:
- Starting a ChatGPT session
- The task requires reasoning about the whole system
- More than 3 days have passed since the last bundle

Current context bundle location: `out/chess-os/ai/context/context_bundle.md`
(Manual update until `pnpm ai:context` automation is built)

---

## Claude Code Direct

Go directly to Claude Code when:
- The implementation path is clear
- The files to change are known
- The constraints are explicit
- A handoff prompt exists (from `/prompt-compose`)

Do not go directly to Claude Code when:
- The task is ambiguous
- Multiple approaches are possible
- Architecture implications are not settled
