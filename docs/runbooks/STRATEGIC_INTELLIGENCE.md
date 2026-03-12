# Strategic Intelligence Runbook

## Overview

M12C activates intelligence foundations so they meaningfully improve session targeting, review prioritization, difficulty adaptation, and produce transparency artifacts explaining engine decisions.

## Architecture

```
ProgressStore + TrendProfile + ReviewQueue
         │
         ▼
  buildPatternIntelligence()  ──→  PatternIntelligence
         │                              │
         ▼                              ▼
  buildReadinessForecast()   ──→  ReadinessForecast
         │                              │
         ├──→ computeDifficultyPolicy() (enhanced)
         ├──→ rankAdaptiveCandidates()  (recurrence boost)
         ├──→ buildReviewQueue()        (enhanced urgency)
         │
         ▼
  buildCompositionRationale() ──→ CompositionRationale
  buildIntelligenceReport()   ──→ IntelligenceReport
```

## Data Flow

### generateNewSession

1. Load progress store, trend profile
2. **Build base review queue**
3. **Build pattern intelligence** from store + trend profile + review queue
4. **Build readiness forecast** from trend profile + store + review queue + pattern intelligence
5. Compute difficulty policy with readiness + pattern intelligence
6. Rank adaptive candidates with pattern intelligence
7. Select exercises, build session
8. **Build composition rationale** for the session
9. **Build intelligence report**
10. Write strategic artifacts to `out/strategic/` and `out/sessions/<id>/`

### refreshInsights

1. Load progress store, trend profile
2. Build base review queue
3. **Build pattern intelligence**
4. **Rebuild enhanced review queue** with pattern intelligence
5. Use enhanced queue for all downstream builds (focus recs, overview, review report, etc.)
6. Build curriculum
7. **Build readiness forecast**
8. **Build intelligence report**
9. Write strategic artifacts to `out/strategic/`

## Artifact Locations

| Artifact | Path |
|----------|------|
| Pattern Intelligence | `out/strategic/pattern-intelligence.json` |
| Readiness Forecast | `out/strategic/readiness-forecast.json` |
| Intelligence Report | `out/strategic/intelligence-report.json` |
| Composition Rationale | `out/sessions/<sessionId>/composition-rationale.json` |

## Readiness States

| State | Meaning | Effect on Difficulty |
|-------|---------|---------------------|
| `ready_to_expand` | All signals healthy | Allows expansion rule (2/4/4) |
| `hold_steady` | Some signals warning | Moderate difficulty (3/5/2) |
| `repair_mode` | Multiple signals failing | Reduced difficulty (5/3/2) |

## Verifying Intelligence Activation

### Check Strategic Artifacts Exist

Visit `/settings` — the "Strategic Intelligence" group shows pattern-intelligence, readiness-forecast, and intelligence-report with green/amber/red status.

### Inspect Pattern Intelligence

```bash
cat out/strategic/pattern-intelligence.json | node -e "
  const pi = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  console.log('Recurring:', pi.recurringWeaknesses);
  console.log('Top vulnerability:', pi.topVulnerability);
  pi.recurrenceEntries.forEach(e =>
    console.log(e.category, 'score:', e.recurrenceScore.toFixed(2), e.severity, e.isRecurring ? 'RECURRING' : '')
  );
"
```

### Inspect Readiness Forecast

```bash
cat out/strategic/readiness-forecast.json | node -e "
  const rf = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  console.log('State:', rf.state);
  console.log('Reason:', rf.reason);
  rf.signals.forEach(s =>
    console.log(s.name, s.value.toFixed(2), s.passed ? 'PASS' : 'FAIL', 'threshold:', s.threshold)
  );
"
```

### Inspect Composition Rationale

```bash
cat out/sessions/<sessionId>/composition-rationale.json | node -e "
  const cr = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  console.log('Readiness:', cr.readinessState);
  console.log('Explanation:', cr.explanation);
  cr.slots.forEach(s => console.log(s.exerciseId, s.source, '-', s.reason));
"
```

## Backward Compatibility

All modified functions accept the new parameters as optional trailing arguments:

```typescript
// Original call (still works unchanged)
computeReviewUrgency(nextReviewAt, now, tier, correct, incorrect);

// Enhanced call
computeReviewUrgency(nextReviewAt, now, tier, correct, incorrect, {
  categorySeverity: "critical",
  categoryRecurrence: 0.65,
  masteryGap: 0.8,
});
```

The worker package does not import strategic modules and is unaffected.

## Troubleshooting

### Strategic artifacts not generated
- Ensure you have progress data (`out/progress/exercise-progress.json`)
- Run "Generate Session" or "Refresh Insights" from the Settings page
- Both flows generate strategic artifacts

### Readiness stuck in repair_mode
- Check which signals are failing in `readiness-forecast.json`
- Common cause: high overdue ratio or many recurring weaknesses
- Complete sessions to improve metrics

### No recurrence boost visible
- Pattern intelligence requires enough data (exercises must be seen)
- Check `recurrenceEntries` — categories need recurrenceScore >= 0.4 to be boosted
- Fresh installs with few completed sessions won't show strong recurrence patterns
