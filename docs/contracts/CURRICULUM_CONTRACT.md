# Curriculum Planner Contract (M9B)

## Purpose

Deterministic curriculum-planning layer that converts learner state into a short-horizon multi-session training roadmap with themed sessions, progression gates, and per-session roadmaps.

## Inputs

| Source | Type | Description |
|--------|------|-------------|
| `exercise-progress.json` | `ProgressStore` | Canonical progress state (read-only) |
| `session-history.jsonl` | `SessionHistoryRecord[]` | Session completion records |
| M8B intermediates | `LearnerOverview`, `FocusRecommendation[]`, `ReviewReport` | Built in-process |
| M9A intermediates | `MistakePatterns` | Built in-process |

## Outputs

| Artifact | Path | Format |
|----------|------|--------|
| Curriculum Plan (JSON) | `out/curriculum/curriculum-plan.json` | `CurriculumPlan` |
| Curriculum Plan (MD) | `out/curriculum/curriculum-plan.md` | Markdown |
| Session Roadmaps (JSON) | `out/curriculum/session-roadmaps.json` | `SessionRoadmap[]` |
| Session Roadmaps (MD) | `out/curriculum/session-roadmaps.md` | Markdown |
| Progression Gates (JSON) | `out/curriculum/progression-gates.json` | `ProgressionGates` |
| Progression Gates (MD) | `out/curriculum/progression-gates.md` | Markdown |

## Invariants

1. **Read-only**: Canonical `exercise-progress.json` is never mutated. Deep-copy + `refreshDueStatus` on copy only.
2. **Deterministic**: All builders are pure functions. Same inputs produce same outputs (except `generatedAt` timestamps).
3. **No LLM calls**: All text is deterministically assembled from data.
4. **No web UI**: CLI-only output.

## Curriculum Themes

| Theme | Priority | Trigger |
|-------|----------|---------|
| `blunder_cleanup` | 1 (highest) | totalBlunders >= 3 OR critical severity pattern |
| `tactical_repair` | 2 | Tactical/calculation categories worsening |
| `instability_reduction` | 3 | unstableCount/totalSeen >= 25% |
| `consolidation` | 4 | Improving categories exist + unstable exercises, or default fill |
| `difficulty_expansion` | 5 (lowest) | All progression gates pass |

## Difficulty Mix by Theme

| Theme | Easy | Medium | Hard |
|-------|------|--------|------|
| `blunder_cleanup` | 5 | 3 | 2 |
| `tactical_repair` | 3 | 4 | 3 |
| `consolidation` | 2 | 5 | 3 |
| `instability_reduction` | 4 | 4 | 2 |
| `difficulty_expansion` | 2 | 3 | 5 |

## Review Quota by Pressure

| Pressure | Overdue Count | Review Slots |
|----------|---------------|--------------|
| High | >= 10 | 5 |
| Normal | >= 3 | 3 |
| Low | >= 1 | 1 |
| None | 0 | 0 |

Theme modifier: +1 for `blunder_cleanup` and `instability_reduction`. Capped at sessionSize - 2.

## Progression Gates

| Gate | Type | Condition | Threshold |
|------|------|-----------|-----------|
| Accuracy | accuracy | recentAccuracy (or lifetime) | >= 75% |
| Mastery | mastery | (improving + mastered) / totalSeen | >= 50% |
| Review Load | review_load | overdueCount | < 5 |
| Trends | trend | worsening categories count | = 0 |
| Eval Loss | eval_loss | avg evalLossCp across seen exercises | < 150cp |

## Dependencies

- `@chess-os/training`: All builder and formatter functions
- `@chess-os/db`: `getProgressDir()`, `getCurriculumDir()`
- M8B dashboard builders: `buildFocusRecommendations`, `buildLearnerOverview`, `buildReviewReport`
- M9A coach builders: `buildMistakePatterns`
