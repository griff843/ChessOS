# Chess OS — Operating Rules

> **Authority:** These rules govern how Chess OS work is executed, verified, and closed out.
> **Last updated:** 2026-03-16

---

## Rule 1 — Definition of Done

Work is complete only when ALL of the following are true:

- [ ] Implementation exists in the repo (if implementation was in scope)
- [ ] `pnpm -r run typecheck` passes
- [ ] `pnpm --filter web run build` passes (if web changes)
- [ ] Relevant tests pass (unit and/or E2E)
- [ ] Relevant docs updated (status, current-state, phase)
- [ ] Proof artifacts saved to `out/chess-os/sprints/<SPRINT>/<DATE>/`
- [ ] Open gaps explicitly documented

---

## Rule 2 — Sprint Naming

Sprints use the milestone identifier as the primary name.

Format: `<MILESTONE-ID>` or `<MILESTONE-ID>-<short-description>`

Examples:
- `M-AI-01-truth-wiring`
- `M-CHESS-01-game-review-shaper`
- `M013-context-bundle`

---

## Rule 3 — Proof Required

Every sprint that changes system behavior requires a proof bundle saved in:

```
out/chess-os/sprints/<SPRINT>/<DATE>/
  git-status.txt
  typecheck.txt
  build.txt
  test-results.txt
  closeout.md
```

Use `/sprint-proof-bundle` to generate this automatically.

---

## Rule 4 — No Silent Changes

Changes to contracts, types, or canonical interfaces require explicit documentation.
If a type changes, update the type doc or add a comment explaining the change.
Silent breaking changes to exported types are forbidden.

---

## Rule 5 — Status Doc Currency

After every sprint:
- Update `CURRENT_SYSTEM_STATUS.md` to reflect what is now done
- Update `PHASE_STATUS.md` if a phase/milestone completed
- Update `NEXT_STEPS.md` to remove completed items and add newly discovered work

Use `/status-sync` to assist with this.

---

## Rule 6 — AI Tool Routing

Follow the routing matrix in `docs/ai-core/doctrine/AI_TASK_ROUTING_MATRIX_PORTABLE_v1.md`:

- Architecture / ambiguous → ChatGPT first
- System state / health → Skills first
- Clear implementation → Claude Code direct
- Verification / closeout → Claude OS

---

## Rule 7 — Scope Discipline

Every sprint should have an explicit scope and explicit non-goals before implementation begins.
Use `/prompt-compose` to enforce this discipline.

---

## Rule 8 — Web App

The web app MUST always use `--webpack` flag. Turbopack cannot resolve `.js→.ts` extension aliases.

```bash
cd apps/web && npx next dev --webpack -p 3001
pnpm --filter web run build  # (--webpack in next.config.js)
```

---

## Rule 9 — Test Ports

- Dev server: port 3001
- E2E test server: port 3401 (via `scripts/dev-web-e2e.mjs`)

Do not mix these ports.

---

## Rule 10 — Engine Mode

Default engine mode is `stub`. Stockfish requires `ENGINE_MODE=stockfish` and `data/stockfish/stockfish.exe`.
Do not commit Stockfish binary.
