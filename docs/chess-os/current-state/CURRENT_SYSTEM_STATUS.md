# Chess OS — Current System Status

> **Last updated:** 2026-03-17 (M-UX-REDESIGN-01 — full UX audit + 11-item redesign; Wave 4 complete)
> **Branch:** codex/m15-runtime-complete
> **Authority:** This doc is the primary current-state truth source. Update after every sprint.

---

## Active Phase

**Phase: M15+ Runtime Productization**

The core pipeline (M1–M9) is fully operational. The web application (M10–M12) is feature-complete with E2E testing. Current work (M13–M15+) focuses on runtime polish, review flows, repertoire drills, coach workflows, and AI operating layer setup.

---

## What Is Done

### Pipeline Layer (M1–M9) — Complete
- PGN ingestion → snapshots → engine eval → feature extraction → mistake classification → dataset generation
- Stockfish UCI integration, stub engine for dev
- Training targets, study sessions, adaptive sessions, progress tracking
- Coach layer: reports, curriculum, patterns
- Worker commands: batch, train, score, ablation, targets, exercises, sessions, dashboard, coach, curriculum, patterns

### Web Application (M10–M12) — Feature Complete
- Next.js 16 + React 19 + Tailwind v4 web app
- Pages: Home, Study, Games, Repertoire, Coach, Import, Settings
- Interactive study session: chessboard, grading, cognitive exercises (recall, visualization, reconstruction)
- Game review: unified CoachingReview surface, static board, game context loader
- Opening branch repair UI, repertoire drill console
- Coach overview panel, coaching memory summary
- E2E test suite (Playwright, 61+ tests)
- Data integrity: safe-parse, validators, atomic writes
- Strategic intelligence: pattern library, readiness forecast, composition rationale

### AI Operating Layer (M-AI-01) — Complete
- `docs/ai/AI_PROJECT_ADAPTER_CHESS_v1.md` ✅
- `docs/ai/AI_BOOTSTRAP_READINESS_CHECKLIST_v1.md` ✅
- `docs/ai/AI_SKILL_WAVE_2_PLAN_v1.md` ✅
- `docs/ai/AI_SKILL_WAVE_3_CHESS_DIAGNOSTICS_v1.md` ⚠️ (file empty — content missing)
- `docs/ai/AI_SKILL_WAVE_4_CHESS_EXPANSION_v1.md` ✅
- `docs/ai-core/` portable doctrine ✅
- `docs/chess-os/architecture/CHESS_DIAGNOSTIC_LOOP.md` ✅
- `docs/chess-os/architecture/CHESS_OS_AI_SNAPSHOT_LAYER.md` ✅
- `.claude/skills/` — 11 skills: prompt-compose, sprint-proof-bundle, sprint-plan, status-sync, agent-health, game-review-shaper, training-plan-composer, progress-snapshot-helper, study-closeout-helper, position-concept-audit, session-quality-evaluator ✅
- `.claude/agents/` — 7 generic agents ✅
- `.claude/rules/` — 4 rules (workflow, safety/proof, testing, output formats) ✅
- `docs/chess-os/` — truth docs (current-state, status, governance) ✅
- `out/chess-os/` — sprint proof path + context bundle ✅

### AI Snapshot Layer (M-SNAPSHOT-01) — Complete
- `out/chess-os/ai/context/context_bundle.md` ✅ (updated)
- `out/chess-os/ai/context/context_bundle.json` ✅ (new — machine-readable)
- `out/chess-os/ai/snapshots/repo_snapshot.json` ✅ (new)
- `out/chess-os/ai/snapshots/repo_map.md` ✅ (new)
- `out/chess-os/ai/snapshots/web_app_snapshot.json` ✅ (new)
- `out/chess-os/ai/snapshots/skills_snapshot.json` ✅ (new)
- `out/chess-os/ai/snapshots/status_snapshot.json` ✅ (new)
- `out/chess-os/ai/snapshots/runtime_snapshot.json` ✅ (new)
- **Key findings at time of snapshot:** Stockfish binary path mismatch (resolved in M-PIPELINE-01); web app does NOT use Stockfish directly (worker-only); 9 of 9 skills confirmed installed; AI_SKILL_WAVE_3_CHESS_DIAGNOSTICS_v1.md is empty

### Pipeline Run (M-PIPELINE-01) — Complete
- Real game processed: `griff843_vs_Dinernur_2026.03.11` (104 plies, 103 rows, 10 blunder targets)
- Model trained: Decision Tree F1=93.3%
- Session generated: `session-c60ab339` (8 exercises: endgame_technique + material_loss)
- All output directories populated: datasets, sessions, models, progress, coach, dashboard, curriculum, patterns ✅
- `find-stockfish.ts` fixed: scans for any `.exe` in `data/stockfish/` (binary: stockfish-windows-x86-64-avx2.exe)
- **M-DIAG-01 diagnostic loop: COMPLETE** — all 6 stages evidenced
- Known gap resolved: demo-game-001 old schema → schema guard added in M-DATA-01, pipeline no longer requires `GAME_ID` env

### Architecture Docs (M-ARCH-01) — Complete
- `docs/chess-os/architecture/SYSTEM_OVERVIEW.md` ✅ — 314 lines, 10 sections: monorepo, pipeline data flow, web surfaces, type contracts, AI layer, artifact paths, commands, known gaps
- Companion docs `DOMAIN_MODEL.md` and `ARTIFACT_FLOW.md` remain unwritten (backlog)

### UX Audit + Redesign (M-UX-REDESIGN-01) — Complete
- Live Playwright audit (`scripts/ux-audit.mjs`) — all 7 routes + session + game detail + mobile
- `out/ux-audit/audit-report.json` + full screenshot set
- 11 redesign items shipped across critical / high / polish tiers:
  - Mobile sidebar overlap fixed (`pl-14` on `<main>`)
  - Algorithm jargon scrubbed — `humanizeId()` + `humanizeObjectiveText()` + `humanizeText()` across dashboard, coach, curriculum, CoachOverviewPanel
  - Dashboard hero CTA — `DashboardHeroCta` component: "Start Today's Session" / "Refresh Insights"
  - Demo game filtered from `/games` list (demo-game-001 + demo-* placeholders)
  - Nav primary/secondary split — daily workflow vs utility pages, visual separator
  - Quick Actions added to dashboard
  - Study back nav deduplicated → "All Sessions"
  - History empty state improved; Repertoire repair queue empty state; mobile status bar responsive
- Open gaps: mobile overflow on home/import pages (structural refactor deferred); additional raw ID strings in stored artifact free-text beyond current coverage

### Wave 4 Skills (M-SKILL-01 + M-SKILL-02) — Complete
- `.claude/skills/position-concept-audit/SKILL.md` ✅ — classifies reviewed positions/issues by chess concept
  - 39 concept tags across 6 families: Tactical Motifs, Calculation Errors, Strategic Themes, Opening Concepts, Endgame Technique, Practical/Time/Discipline
  - Root-vs-symptom analysis step — targets root cause, not just surface symptom
- `.claude/skills/session-quality-evaluator/SKILL.md` ✅ — evaluates whether a generated session matched the target weakness
  - 7 quality dimensions: target match, concept alignment, depth calibration, sequencing, volume, coverage gaps, completion
  - 4-level usefulness verdict: well-matched / partially-matched / mismatched / insufficient-evidence
  - Feeds into `study-closeout-helper` and `progress-snapshot-helper`
- **Wave 4 primary skill set complete** — all 3 skills installed (study-closeout-helper, position-concept-audit, session-quality-evaluator)

### Demo-Game Schema Guard (M-DATA-01) — Complete
- `generate-training-targets.ts`: schema guard skips old flat-row datasets (missing `features` object) with actionable warning
- `generate-targets` now runs without `GAME_ID` env var — multi-game pipeline unblocked
- demo-game-001 preserved as reference artifact; safely skipped at runtime

### Perspective Bug Fix (M-WEB-VERIFY-01) — Complete
- `generate-session.ts`: filters exercises to `perspective === "hero"` — sessions now train only the player's own mistakes
- `EnrichedExercise` / `ExerciseView`: `heroColor` field added and threaded through enrichment → server action → board component
- `StudyBoard`: board orientation now defaults to `heroColor ?? sideToMove` — correct perspective for the player
- Session `session-054cd81e` regenerated: 2 exercises, both `heroColor=white`, `sideToMove=white`, `perspective=hero` ✅

### Context Bundle Automation (M-AI-CONTEXT-01) — Complete
- `scripts/ai-context.mjs` ✅ — 500-line ESM script, Node.js builtins only, no new deps
- `package.json` ✅ — wired as `"ai:context": "node scripts/ai-context.mjs"`
- `pnpm ai:context` regenerates all 8 AI artifacts in one pass (context_bundle.md/.json + 6 snapshots)
- Bug fixed: agents correctly detected as .md files (7 agents), not directories

---

## What Is In Progress

- **Web app session verification:** `/study/session-054cd81e` — perspective fix active, browser verification pending
- **Runtime E2E gap coverage:** New routes (games list, game detail, coach overview, repertoire drill) not yet covered by E2E suite

---

## What Is Next

See `docs/chess-os/status/NEXT_STEPS.md` for prioritized queue.

Top candidates:
1. Verify web app session execution (`/study/session-054cd81e`) — perspective fix active
2. Runtime E2E gap coverage for new routes
3. Linear issue integration

---

## Key File Locations

| Surface | Location |
|---|---|
| Web app | `apps/web/` |
| Training package | `packages/training/` |
| Worker | `apps/worker/` |
| Artifacts | `out/` (games, sessions, coach, strategic, patterns, etc.) |
| AI docs | `docs/ai/` |
| AI portable core | `docs/ai-core/` |
| Chess OS truth docs | `docs/chess-os/` |
| Sprint proofs | `out/chess-os/sprints/` |
| Context bundles | `out/chess-os/ai/context/` |

---

## Dev Commands

| Command | Purpose |
|---|---|
| `cd apps/web && npx next dev --webpack -p 3001` | Start web dev server |
| `pnpm -r run typecheck` | Full typecheck |
| `pnpm --filter web run build` | Build web app |
| `pnpm test:e2e` | Full E2E suite (port 3401) |
| `pnpm test:e2e:smoke` | Smoke tests only |
| `pnpm --filter worker run start` | Batch pipeline |
| `pnpm --filter worker run generate-dashboard` | Generate dashboard |

---

## Open Gaps

- demo-game-001 uses old flat row schema — skipped gracefully by schema guard; no longer crashes. Can be removed later or migrated to `tests/fixtures/`.
- Web app session execution pending browser verification (`/study/session-054cd81e` — perspective fix active)
- Mobile overflow on home and import pages — horizontal scroll still present; structural layout refactor deferred
- Additional raw ID strings in stored artifact free-text beyond current INTERNAL_ID_LABELS coverage (e.g., `unstable_ratio`, `worsening_count`) — data layer cleanup deferred
- `pnpm --filter web run build` not run for M-UX-REDESIGN-01 — dev server confirmed functional; build proof deferred
- Linear issue tracking not yet connected to sprint workflow
- `docs/chess-os/architecture/DOMAIN_MODEL.md` and `ARTIFACT_FLOW.md` not yet written (SYSTEM_OVERVIEW.md complete)
- Wave 4 primary skills complete — secondary candidates (opening-repair-planner, endgame-focus-planner, recurring-blunder-classifier) remain in backlog
- Runtime E2E suite does not cover new routes: /games list, /games/[gameId], coach overview panel, repertoire drill console
