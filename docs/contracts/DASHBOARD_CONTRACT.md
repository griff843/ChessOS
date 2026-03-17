# Learner Analytics Dashboard Contract (M8B)

## Overview

Read-only analytics layer that produces JSON + markdown dashboard artifacts from progress store, session history, trend profile, review queue, and session analytics data. No mutation to canonical state.

## Types

### SessionSnapshot

Aggregated stats from a completed session.

| Field | Type | Description |
|-------|------|-------------|
| sessionId | string | Session identifier |
| completedAt | string | ISO timestamp |
| exerciseCount | number | Total exercises |
| correctCount | number | Correct answers |
| incorrectCount | number | Incorrect answers |
| accuracy | number | correctCount / exerciseCount |
| difficultyDistribution | Record<string, number> | Difficulty breakdown |
| categoryDistribution | Record<string, number> | Category breakdown |

### LearnerOverview

Top-level dashboard artifact combining all data sources.

| Field | Type | Description |
|-------|------|-------------|
| generatedAt | string | ISO timestamp |
| totalExercises | number | From progress store |
| totalSeen / totalUnseen | number | Exercise counts |
| totalCorrect / totalIncorrect | number | Lifetime attempt counts |
| lifetimeAccuracy | number | Lifetime correct / total |
| recentSessionCount | number | Number of recent sessions used |
| recentAccuracy | number \| null | Accuracy over recent sessions |
| masteryDistribution | Record<MasteryState, number> | Count per mastery state |
| reviewLoad | ReviewLoad | Overdue, due soon, unstable counts |
| topWeakCategories | WeaknessHighlight[] | Top 3 by miss rate |
| topWeakDifficulties | WeaknessHighlight[] | Top 3 by miss rate |
| trendSummary | TrendSummary | Categories grouped by trend direction |
| recentSessions | SessionSnapshot[] | Last 5 sessions |
| focusRecommendations | FocusRecommendation[] | Top 5 recommendations |

### TrendReport

| Field | Type | Description |
|-------|------|-------------|
| generatedAt | string | ISO timestamp |
| recentWindowSize | number | Attempts per bucket for recency |
| overallAccuracy | number | Lifetime accuracy |
| categoryTrends | TrendEntry[] | Sorted by adaptive weight desc |
| difficultyTrends | TrendEntry[] | easy/medium/hard order |
| evalLossTrend | EvalLossTrendEntry[] \| null | From session analytics |
| sessionTimeline | SessionTimelineEntry[] | All completed sessions |

### ReviewReport

| Field | Type | Description |
|-------|------|-------------|
| generatedAt | string | ISO timestamp |
| totalOverdue / totalDueSoon / totalUnstable | number | Counts |
| urgentItems | ReviewReportEntry[] | Overdue, by urgency desc |
| dueSoonItems | ReviewReportEntry[] | Due soon, by urgency desc |
| unstableItems | ReviewReportEntry[] | Unstable mastery state |
| blunderProneItems | ReviewReportEntry[] | Last grade was blunder/mistake |
| categoryUrgency | CategoryUrgency[] | Per-category review pressure |

### FocusRecommendation

| Field | Type | Description |
|-------|------|-------------|
| rank | number | 1-based rank |
| category | LessonCategory | Recommended focus category |
| difficulty | DifficultyEstimate \| null | Specific difficulty or any |
| reason | string | Human-readable explanation |
| focusScore | number | Composite score |
| factors | FocusFactors | Component weights |

## Functions

### Builders (pure, no I/O)

```
buildSessionSnapshots(history) → SessionSnapshot[]
buildFocusRecommendations(store, trendProfile, reviewQueue, config?) → FocusRecommendation[]
buildLearnerOverview(store, trendProfile, reviewQueue, snapshots, recs, recentN?) → LearnerOverview
buildTrendReport(trendProfile, snapshots, analyticsMap?) → TrendReport
buildReviewReport(reviewQueue, store) → ReviewReport
```

### Formatters (pure, no I/O)

```
formatLearnerOverviewMd(overview) → string
formatTrendReportMd(report) → string
formatReviewReportMd(report) → string
```

## Focus Score Algorithm

Per lesson category with ≥1 exercise:

```
focusScore = weaknessWeight × 0.35
           + trendPenalty   × 0.25
           + reviewPressure × 0.20
           + masteryGap     × 0.20
```

- weaknessWeight: lifetime miss rate from trend profile [0, 1]
- trendPenalty: worsening=0.30, stable=0.10, improving=0.00, insufficient=0.15
- reviewPressure: (overdue + unstable in category) / totalReviewable [0, 1]
- masteryGap: (unseen + learning in category) / total in category [0, 1]

Top 5 returned, sorted by focusScore descending.

## Artifacts

| File | Format | Description |
|------|--------|-------------|
| `out/dashboard/learner-overview.json` | JSON | Full overview |
| `out/dashboard/learner-overview.md` | Markdown | Overview report |
| `out/dashboard/trend-report.json` | JSON | Trend analysis |
| `out/dashboard/trend-report.md` | Markdown | Trend report |
| `out/dashboard/review-report.json` | JSON | Review analysis |
| `out/dashboard/review-report.md` | Markdown | Review report |

## Read-Only Guarantee

The dashboard worker deep-copies the progress store before calling `refreshDueStatus`. The canonical `exercise-progress.json` and `session-history.jsonl` are never modified.
