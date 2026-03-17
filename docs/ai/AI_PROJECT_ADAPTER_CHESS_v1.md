# AI_PROJECT_ADAPTER_CHESS_v1

## Project identity

### Project name
**Chess OS**

### Domain summary
Chess OS is a structured chess improvement and training operating system. It is designed to turn games, analysis, mistakes, concepts, study plans, and performance trends into a durable working system instead of a scattered set of notes, tools, and isolated reviews.

### Primary purpose
The primary purpose of Chess OS is to create a truth-based environment for chess improvement by organizing analysis, surfacing weaknesses, guiding training, tracking progress, and turning insights into repeatable study and coaching workflows.

### Main operating surfaces
- Game review and mistake analysis
- Training plans and intervention tracking
- Study queues and concept reinforcement
- Progress dashboards and coaching views
- Reports, summaries, and proof artifacts
- Governance, roadmap, and current-state documentation

---

## Canonical documentation map

### Roadmap docs
Roadmap and phase planning should live under:

- `docs/chess-os/roadmap/`
- `docs/chess-os/phases/`

Recommended canonical files:
- `docs/chess-os/roadmap/MASTER_ROADMAP.md`
- `docs/chess-os/phases/PHASE-CORE-SURFACE-ACTIVATION-001.md`

### Architecture docs
Architecture truth should live under:

- `docs/chess-os/architecture/`

Recommended canonical files:
- `docs/chess-os/architecture/SYSTEM_OVERVIEW.md`
- `docs/chess-os/architecture/DOMAIN_MODEL.md`
- `docs/chess-os/architecture/ARTIFACT_FLOW.md`

### Current-state docs
Current implementation and working truth should live under:

- `docs/chess-os/current-state/`

Recommended canonical files:
- `docs/chess-os/current-state/CURRENT_SYSTEM_STATUS.md`
- `docs/chess-os/current-state/WORK_IN_PROGRESS.md`
- `docs/chess-os/current-state/OPEN_GAPS.md`

### Governance docs
Governance and operating rules should live under:

- `docs/chess-os/governance/`

Recommended canonical files:
- `docs/chess-os/governance/OPERATING_RULES.md`
- `docs/chess-os/governance/DEFINITION_OF_DONE.md`
- `docs/chess-os/governance/TRUTH_SOURCES.md`

### Status docs
Status tracking docs should live under:

- `docs/chess-os/status/`

Recommended canonical files:
- `docs/chess-os/status/PHASE_STATUS.md`
- `docs/chess-os/status/NEXT_STEPS.md`
- `docs/chess-os/status/CHANGELOG.md`

---

## Roadmap / phase model

### What phases or milestones Chess OS uses
Chess OS should use a phased model where each phase produces a more capable and more durable training/coaching system.

Suggested phase model:

1. **Phase 001 — Core Surface Activation**  
   Establish project identity, canonical documentation, truth sources, and the foundational working surface.

2. **Phase 002 — Game Review & Diagnosis Foundation**  
   Standardize game ingestion, review structure, mistake tagging, and weakness detection.

3. **Phase 003 — Training Plan System**  
   Convert findings into drills, interventions, study queues, and practice plans.

4. **Phase 004 — Memory & Progress Layer**  
   Track recurring weaknesses, concept growth, consistency, and long-term development.

5. **Phase 005 — Analysis & Evidence Integration**  
   Add engine-backed evaluation, annotated examples, evidence trails, and deeper study support.

6. **Phase 006 — Coaching Command Surface**  
   Build higher-level dashboards and operating views for oversight, planning, and prioritization.

7. **Phase 007 — Verification & Performance Loop**  
   Measure whether training interventions are producing real improvement in decisions and outcomes.

### Current active phase
**Phase 001 — Core Surface Activation**

---

## Status surfaces

### Where current progress is tracked
Current progress should be tracked in:

- `docs/chess-os/current-state/CURRENT_SYSTEM_STATUS.md`
- `docs/chess-os/status/PHASE_STATUS.md`
- `docs/chess-os/status/NEXT_STEPS.md`

### What the latest truth docs are
Until the full doc system is built out, the latest truth docs should be:

1. `docs/ai/AI_PROJECT_ADAPTER_CHESS_v1.md`
2. Active phase document in `docs/chess-os/phases/`
3. `docs/chess-os/current-state/CURRENT_SYSTEM_STATUS.md`
4. Canonical architecture docs in `docs/chess-os/architecture/`

If there is conflict, the order above should control unless a later governance doc explicitly overrides it.

---

## Truth sources

### Repo truth
The repository is the primary truth source for:
- Actual implemented code
- Real file/folder structure
- Existing surfaces, scripts, and contracts
- Current technical capabilities

### Artifacts
Artifacts are truth for:
- Generated reports
- Proof bundles
- Analysis outputs
- Summaries
- Verification results

### Runtime truth
Runtime truth only exists if Chess OS has a live running app, dashboard, CLI output surface, or other executable system component.  
If no runtime surface exists yet, runtime truth is not yet established and repo truth plus artifacts remain canonical.

### Diagnostics surfaces
Diagnostics surfaces may include:
- Typecheck results
- Test results
- Validation logs
- Audit outputs
- Report generation logs
- Proof bundles

If formalized later, diagnostics docs should live under:

- `docs/chess-os/diagnostics/`

---

## Artifact conventions

### Where outputs / proof / reports should live
All outputs should live under:

- `out/chess-os/`

Recommended subfolders:
- `out/chess-os/reports/`
- `out/chess-os/proof/`
- `out/chess-os/diagnostics/`
- `out/chess-os/summaries/`

### Naming convention
Artifacts should use deterministic, readable names that identify phase, purpose, and date.

Examples:
- `out/chess-os/reports/phase-001-core-surface-report.md`
- `out/chess-os/proof/phase-001-verification.json`
- `out/chess-os/diagnostics/typecheck-2026-03-16.txt`

---

## Governance / closeout path

### How work is considered complete
Work is considered complete only when:

- Relevant docs are updated
- Implementation exists in the repo if implementation was in scope
- Verification has been run
- Outputs/proof have been saved in expected artifact locations
- Status/current-state docs reflect reality
- Any open gaps or non-goals are explicitly stated

### What verification / proof is required
At minimum, completion should include:

- Scope summary
- Files changed or created
- Verification run results
- Artifact paths
- Updated truth/status docs
- Clear statement of remaining gaps

Where applicable, verification should include:
- Typecheck/build pass
- Test pass
- Report generation pass
- Runtime or UI validation if applicable
- Sample artifact creation

---

## Domain-sensitive boundaries

### What is chess-specific and should never be treated as portable core
The following are chess-specific and should never be treated as portable core:

- Chess domain models such as games, positions, openings, lines, middlegames, endgames, tactics, strategy, evaluation, and time controls
- Chess-specific mistake taxonomies such as blunders, inaccuracies, missed tactics, calculation errors, strategic misunderstandings, and time-management failures
- Training logic tied to chess improvement, including opening prep, tactical drilling, endgame study, pattern work, and annotated review
- Engine-backed analysis, evaluation interpretation, variation trees, and chess theory guidance
- Rating progression logic, pool-specific analysis, and chess performance metrics
- Coaching systems designed specifically for chess skill development

Portable core should only include reusable operating patterns such as:
- Documentation structure
- Install/setup scaffolding
- Governance/status/roadmap patterns
- Artifact/report conventions
- General operating rules

Anything that encodes chess knowledge, chess evaluation, or chess training behavior belongs in the Chess OS project layer, not the portable core.