# Chess OS — Next Steps

> **Last updated:** 2026-03-17 (M-UX-REDESIGN-01 complete — full UX audit + 11-item redesign)
> **Authority:** Prioritized queue of next sprint candidates. Update after each sprint.

---

## Immediate (In Progress)

- [x] **M-DIAG-01:** First E2E diagnostic loop validation — **COMPLETE** (closed by M-PIPELINE-01)
  - All 6 stages evidenced: review → training plan → session → progress → context update → closeout
  - Session `session-c60ab339` generated; web app verification pending
  - Initial proof (PARTIAL): `out/chess-os/sprints/M-DIAG-01-loop-validation/2026-03-16/`
  - Closed by: `out/chess-os/sprints/M-PIPELINE-01-pipeline-run/2026-03-17/`

- [x] **M-SNAPSHOT-01:** First AI snapshot layer — **COMPLETE**
  - 8 artifacts generated (context_bundle.md/.json, repo_snapshot.json, repo_map.md, web_app_snapshot.json, skills_snapshot.json, status_snapshot.json, runtime_snapshot.json)
  - Stockfish truth confirmed: binary missing, worker-only (web app does not use directly)
  - Session pipeline truth confirmed: all 11 commands blocked; root cause is Stockfish binary
  - Skills truth confirmed: 9 of 9 skills installed; AI_SKILL_WAVE_3_CHESS_DIAGNOSTICS_v1.md is empty
  - Proof: `out/chess-os/sprints/M-SNAPSHOT-01-ai-snapshot-layer/2026-03-16/`

- [x] **M-AI-CONTEXT-01:** Context bundle automation — **COMPLETE**
  - `scripts/ai-context.mjs` + `pnpm ai:context` command live
  - Regenerates all 8 AI artifacts in one pass from direct repo inspection + truth docs
  - Fixed: agent count correctly reads .md files (7 agents, not 0 dirs)
  - Proof: `out/chess-os/sprints/M-AI-CONTEXT-01-ai-context-command/2026-03-17/`

- [x] **M-PIPELINE-01:** Pipeline run — **COMPLETE**
  - `griff843_vs_Dinernur_2026.03.11` processed end-to-end (104 plies, 103 rows, 10 targets, 8 exercises)
  - Session `session-c60ab339` generated; all 12 output directories populated
  - `find-stockfish.ts` fixed to detect `stockfish-windows-x86-64-avx2.exe`
  - **M-DIAG-01 diagnostic loop: COMPLETE** — all 6 stages evidenced
  - Known gap: demo-game-001 old schema (resolved in M-DATA-01 — schema guard added)
  - Proof: `out/chess-os/sprints/M-PIPELINE-01-pipeline-run/2026-03-17/`

- [x] **M-WEB-VERIFY-01:** Perspective bug fix — **COMPLETE**
  - Hero-only filter added to `generate-session.ts` — sessions now train player's own mistakes only
  - `heroColor` threaded through `EnrichedExercise` → `ExerciseView` → `StudyBoard`
  - Board orientation defaults to `heroColor ?? sideToMove` — White player sees White's perspective
  - Session `session-054cd81e` regenerated: 2 exercises, both `heroColor=white`, `sideToMove=white`
  - Proof: `out/chess-os/sprints/M-WEB-VERIFY-01-perspective-fix/2026-03-17/`

- [x] **M-DATA-01:** Demo-game schema guard — **COMPLETE**
  - Schema guard added to `generate-training-targets.ts` — skips old flat-row datasets with warning
  - `generate-targets` now runs without `GAME_ID` env var; multi-game pipeline unblocked
  - demo-game-001 preserved, safely skipped at runtime
  - Proof: `out/chess-os/sprints/M-DATA-01-demo-game-schema-fix/2026-03-17/`

- [x] **M-ARCH-01:** System Overview — **COMPLETE**
  - `docs/chess-os/architecture/SYSTEM_OVERVIEW.md` written (314 lines)
  - Covers: monorepo structure, pipeline data flow, web app surfaces, key type contracts, AI layer, artifact paths, common commands, known gaps
  - Proof: `out/chess-os/sprints/M-ARCH-01-system-overview/2026-03-17/`

- [x] **M-SKILL-01:** Wave 4 Skill 2 — position-concept-audit — **COMPLETE**
  - `.claude/skills/position-concept-audit/SKILL.md` written
  - 39 concept tags across 6 families (Tactical, Calculation, Strategic, Opening, Endgame, Practical)
  - Root-vs-symptom analysis, concept clusters, study directions output format
  - Proof: `out/chess-os/sprints/M-SKILL-01-position-concept-audit/2026-03-17/`

- [x] **M-SKILL-02:** Wave 4 Skill 3 — session-quality-evaluator — **COMPLETE**
  - `.claude/skills/session-quality-evaluator/SKILL.md` written
  - 7 quality dimensions: target match, concept alignment, depth calibration, sequencing, volume, coverage gaps, completion
  - 4-level usefulness verdict: well-matched / partially-matched / mismatched / insufficient-evidence
  - **Wave 4 primary skill set complete** — all 3 skills installed
  - Proof: `out/chess-os/sprints/M-SKILL-02-session-quality-evaluator/2026-03-17/`

- [x] **M-UX-REDESIGN-01:** Full UX audit + redesign — **COMPLETE**
  - Live Playwright audit (`scripts/ux-audit.mjs`) — all 7 routes + session + game + mobile
  - 11 redesign items: mobile fix, jargon scrub, hero CTA, demo filter, nav split, quick actions, back nav dedup, empty states (history, repertoire, improvement report), responsive status bar
  - Typecheck: PASS; dev server verified live
  - Open gaps: mobile overflow on home/import (deferred), additional raw IDs in stored free-text (deferred), build not formally run
  - Proof: `out/chess-os/sprints/M-UX-REDESIGN-01-ux-polish/2026-03-17/`

---

## Next Sprint Queue (Prioritized)

### 1. Verify web app session execution
Start dev server (`cd apps/web && npx next dev --webpack -p 3001`), load `/study/session-054cd81e`, confirm board shows White's perspective and exercises render correctly.

### 2. Runtime E2E Gap Coverage
Add E2E tests for new routes not covered: `/games` list, `/games/[gameId]`, coach overview panel, repertoire drill console.

### 3. Linear Integration
Connect sprint workflow to Linear issue tracking.

---

## Backlog (Not Scheduled)

- agent-health v2 (chess-domain signals)
- opening-repair-planner
- endgame-focus-planner
- recurring-blunder-classifier
- Coaching memory long-term trend tracking
- Rating progression analytics
