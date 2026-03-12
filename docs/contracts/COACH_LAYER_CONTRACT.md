# Coach Layer Contract (M9A)

## Purpose

Deterministic coaching layer that converts learner analytics into actionable study guidance: mistake-pattern summaries, a prescribed next-session plan, and a coaching summary with prioritized insights.

## Inputs

| Source | Type | Description |
|--------|------|-------------|
| `exercise-progress.json` | `ProgressStore` | Canonical progress state (read-only) |
| `session-history.jsonl` | `SessionHistoryRecord[]` | Session completion records |
| M8B intermediates | `LearnerOverview`, `ReviewReport`, `FocusRecommendation[]` | Built in-process |

## Outputs

| Artifact | Path | Format |
|----------|------|--------|
| Mistake Patterns (JSON) | `out/coach/mistake-patterns.json` | `MistakePatterns` |
| Mistake Patterns (MD) | `out/coach/mistake-patterns.md` | Markdown |
| Study Plan (JSON) | `out/coach/study-plan.json` | `StudyPlan` |
| Study Plan (MD) | `out/coach/study-plan.md` | Markdown |
| Coaching Summary (JSON) | `out/coach/coaching-summary.json` | `CoachingSummary` |
| Coaching Summary (MD) | `out/coach/coaching-summary.md` | Markdown |

## Invariants

1. **Read-only**: Canonical `exercise-progress.json` is never mutated. Deep-copy + `refreshDueStatus` on copy only.
2. **Deterministic**: All builders are pure functions. Same inputs produce same outputs (except `generatedAt` timestamps).
3. **No LLM calls**: All text is deterministically assembled from data.
4. **No web UI**: CLI-only output.

## Mistake Pattern Severity

| Severity | Condition |
|----------|-----------|
| Critical | missRate >= 0.50 OR (worsening AND missRate >= 0.30) |
| Moderate | missRate >= 0.25 |
| Minor | Otherwise |

## Study Plan Difficulty Mix

| Condition | Easy | Medium | Hard |
|-----------|------|--------|------|
| Hard missRate > 0.50 | 4 | 4 | 2 |
| Easy missRate < 0.15 AND hard missRate < 0.30 | 2 | 4 | 4 |
| Default | 3 | 4 | 3 |

## Coaching Insight Priorities

| Priority | Type | Trigger |
|----------|------|---------|
| 9 | Review | Overdue exercises exist |
| 8 | Weakness | Critical severity patterns |
| 7 | Trend | Worsening categories |
| 6 | Review | Unstable mastery exercises |
| 5 | Milestone | 25%/50%/75%/100% seen thresholds |
| 4 | Trend | Improving categories |
| 3 | Strength | Categories with accuracy >= 80% |

## Dependencies

- `@chess-os/training`: All builder and formatter functions
- `@chess-os/db`: `getProgressDir()`, `getCoachDir()`
- M8B dashboard builders: `buildFocusRecommendations`, `buildLearnerOverview`, `buildReviewReport`
