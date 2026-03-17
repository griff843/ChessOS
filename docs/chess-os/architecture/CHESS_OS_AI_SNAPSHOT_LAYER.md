# CHESS_OS_AI_SNAPSHOT_LAYER

## Purpose
This document defines the Chess OS AI snapshot layer.

Chess OS is a web-first application, not a CLI-first product.  
The AI snapshot layer exists to keep ChatGPT, Claude, and internal operating workflows grounded in current project truth without requiring manual repo re-explanation every time.

The snapshot layer is an internal support surface for:
- AI context handoff
- repo structure awareness
- current-state awareness
- product-surface awareness
- sprint/status grounding

It is not the primary user product surface.

---

## Why this exists

Chess OS now has:
- a web application surface
- status docs
- governance docs
- AI skills
- a domain diagnostic loop
- proof/artifact paths

As the project grows, manual restatement of current structure, status, and surfaces becomes fragile and inefficient.

The snapshot layer exists to:
- reduce AI drift
- improve prompt grounding
- expose current structure cleanly
- create repeatable status/context artifacts
- support governed sprint planning and closeout

---

## Core principle

Chess OS should follow the same general operating pattern as other mature projects:

- product surfaces remain primary
- docs remain canonical
- snapshots summarize current truth for AI and operators
- internal commands/scripts may generate those snapshots
- the snapshot layer supports the web product; it does not define the product

---

## Snapshot layer responsibilities

The Chess OS AI snapshot layer should provide a compact, repeatable view of:

1. current repo structure
2. current status and phase state
3. current product/web surface state
4. current AI/helper surface state
5. current architecture and operating truth
6. current next-step priorities

---

## Canonical outputs

The Chess OS snapshot layer should produce both human-readable and machine-readable artifacts.

### Context bundle outputs
These are the primary AI handoff surfaces.

#### Human-readable
- `out/chess-os/ai/context/context_bundle.md`

#### Machine-readable
- `out/chess-os/ai/context/context_bundle.json`

### Repo / structure snapshot outputs
These summarize the current repository and operating structure.

#### Machine-readable
- `out/chess-os/ai/snapshots/repo_snapshot.json`

#### Human-readable
- `out/chess-os/ai/snapshots/repo_map.md`

### Product surface snapshot outputs
These summarize the current web/app state and major operating surfaces.

#### Machine-readable
- `out/chess-os/ai/snapshots/web_app_snapshot.json`

Optional later human-readable companion:
- `out/chess-os/ai/snapshots/web_app_snapshot.md`

### Status / operating snapshot outputs
These summarize current progress and active priorities.

Optional future outputs:
- `out/chess-os/ai/snapshots/status_snapshot.json`
- `out/chess-os/ai/snapshots/skills_snapshot.json`

---

## Snapshot categories

### 1. Context bundle
The context bundle is the highest-level AI grounding artifact.

It should summarize:
- project identity
- active architecture
- current phase/milestone state
- current web surfaces
- installed AI helpers/skills
- current diagnostic loop state
- recent key accomplishments
- active next priorities
- known gaps or blockers

### 2. Repo snapshot
The repo snapshot should summarize:
- main folders
- major apps/packages
- key docs
- major skill/helper locations
- artifact/output paths
- important architecture surfaces

This is for machine consumption and structured reasoning.

### 3. Repo map
The repo map is the human-readable counterpart to repo snapshot.

It should summarize:
- current structure
- important directories
- what each major area is for
- where current truth docs live
- where AI surfaces live
- where product surfaces live

### 4. Web app snapshot
Because Chess OS is web-first, this is one of the most important snapshot types.

It should summarize:
- major app surfaces/pages
- major user workflows
- current implemented loop surfaces
- major missing surfaces
- major live or intended state transitions
- current UI/workflow maturity

This should reflect the actual product surface, not generic architecture wishes.

### 5. Status snapshot
This may later summarize:
- active milestone
- latest completed milestone
- current next steps
- stale docs warnings
- recently installed helpers
- recent verification state

---

## Source-of-truth inputs

The snapshot layer must not invent state.  
It should be generated from actual Chess OS truth surfaces.

Primary inputs should include:

- `docs/chess-os/current-state/CURRENT_SYSTEM_STATUS.md`
- `docs/chess-os/status/PHASE_STATUS.md`
- `docs/chess-os/status/NEXT_STEPS.md`
- `docs/chess-os/governance/OPERATING_RULES.md`
- `docs/chess-os/architecture/CHESS_DIAGNOSTIC_LOOP.md`
- `docs/chess-os/architecture/CHESS_OS_AI_SNAPSHOT_LAYER.md`

AI-layer inputs may include:
- `docs/ai/AI_PROJECT_ADAPTER_CHESS_v1.md`
- `docs/ai/AI_BOOTSTRAP_READINESS_CHECKLIST_v1.md`
- `docs/ai/AI_SKILL_WAVE_3_CHESS_DIAGNOSTICS_v1.md`
- `docs/ai/AI_SKILL_WAVE_4_CHESS_EXPANSION_v1.md`

Operational helper inventory may include:
- `.claude/skills/**`

Repo structure inputs may include:
- actual folder tree
- package/app metadata
- known output paths
- known web app structure

---

## Truth rules

### Rule 1 — Docs remain canonical
The snapshot layer summarizes truth.  
It does not replace canonical docs.

### Rule 2 — Web app truth must be real
The web app snapshot must reflect actual implemented or verified surfaces, not aspirational ideas.

### Rule 3 — No fabricated completeness
If something is partial, stale, missing, or uncertain, the snapshot must say so.

### Rule 4 — Machine and human artifacts should align
The `.json` and `.md` outputs should describe the same underlying reality.

### Rule 5 — Snapshot generation should be repeatable
A regenerated snapshot should follow stable conventions so AI workflows stay predictable.

---

## Recommended initial artifact set

The first version of the Chess OS AI snapshot layer should aim to generate:

### Required
- `out/chess-os/ai/context/context_bundle.md`
- `out/chess-os/ai/context/context_bundle.json`
- `out/chess-os/ai/snapshots/repo_snapshot.json`
- `out/chess-os/ai/snapshots/repo_map.md`

### Strongly recommended next
- `out/chess-os/ai/snapshots/web_app_snapshot.json`

### Optional later
- `out/chess-os/ai/snapshots/status_snapshot.json`
- `out/chess-os/ai/snapshots/skills_snapshot.json`

---

## Relationship to Chess OS web product

The AI snapshot layer is an internal support layer.

### It should support the web product by:
- grounding AI planning
- grounding implementation prompts
- grounding status reviews
- making current product surfaces easier to inspect
- reducing ambiguity about what Chess OS currently is

### It should not:
- replace the product UI
- become the main user workflow
- redefine Chess OS as a CLI-based product
- become more important than the real app surfaces

---

## Relationship to skills and workflow

The snapshot layer should support existing Chess OS AI workflow patterns such as:
- sprint planning
- prompt composition
- proof capture
- status sync
- agent/AI layer health checks

It should also support domain helper work by making it easier to see:
- what surfaces exist
- what loop components exist
- what docs and outputs are current
- what the next build target should be

---

## Suggested internal generation surface

Chess OS may eventually have a lightweight internal command/script for generating these snapshot artifacts.

That internal surface should be treated as:
- support tooling
- operator tooling
- AI-context tooling

It should not be treated as the product itself.

A future implementation may include a command or script that:
- scans current docs
- scans repo structure
- summarizes the web surface
- emits context and snapshot artifacts

But this document is defining the architecture, not requiring a specific implementation method yet.

---

## Minimum fields for `context_bundle.json`

A useful first version should likely include fields such as:
- `project_name`
- `project_type`
- `primary_surfaces`
- `active_phase`
- `latest_completed_phase`
- `current_priorities`
- `key_docs`
- `installed_skills`
- `diagnostic_loop`
- `known_gaps`
- `artifact_paths`
- `web_surface_summary`

---

## Minimum sections for `context_bundle.md`

A useful first version should likely include:
- project identity
- current status
- current architecture summary
- current web/product surface summary
- current AI/helper surface summary
- current diagnostic loop summary
- current priorities
- known gaps
- key artifact paths

---

## Minimum fields for `web_app_snapshot.json`

A useful first version should likely include:
- main routes/pages
- major user-facing surfaces
- major internal/operator surfaces
- current diagnostic loop touchpoints in the UI
- current implemented vs missing workflow stages
- notes on maturity or known gaps

---

## Acceptance criteria

This architecture is considered defined when:

- the role of the snapshot layer is clear
- it is explicitly separated from the product surface
- output artifact paths are defined
- required first artifacts are identified
- source-of-truth docs are identified
- truth rules are explicit
- the web-first orientation of Chess OS is preserved

---

## Recommended next step

The next clean implementation step is to define the first generator spec or sprint for producing:

- `context_bundle.md`
- `context_bundle.json`
- `repo_snapshot.json`
- `repo_map.md`

After that, add the first Chess OS `web_app_snapshot.json`.