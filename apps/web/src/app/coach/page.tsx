import {
  loadCoachingSummary,
  loadStudyPlan,
  loadMistakePatterns,
  loadExerciseProgress,
  exerciseCorpusExists,
  deriveReadiness,
  loadTrainingObjective,
  loadObjectiveProgress,
  loadObjectiveEscalation,
  loadObjectivePortfolio,
  loadObjectiveCoaching,
  loadInterventionEffectiveness,
  loadInterventionMemory,
  loadConceptState,
  loadOpeningReport,
  loadRepertoireReview,
  loadRepertoireTransfer,
  loadRepertoireTransferCoaching,
  loadRepertoireDrillMemory,
  loadRepertoireDrillQueue,
  loadRepertoireRepair,
  loadRepertoireRepairQueue,
  loadRepertoireRepairOutcomes,
} from "@/lib/artifacts";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { InsightList } from "@/components/ui/insight-list";
import { RefreshInsightsButton } from "@/components/ui/refresh-insights-button";
import { Badge, DifficultyBadge, TrendBadge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatCategory, formatRelativeDate } from "@/lib/utils";
import Link from "next/link";
import { GraduationCap, AlertTriangle, Clock, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const [summary, plan, patterns, objective, objectiveProgress, objectiveEscalation, objectivePortfolio, objectiveCoaching, interventionEffectiveness, interventionMemory, conceptState, openingReport, repertoireReview, repertoireTransfer, repertoireTransferCoaching, repertoireDrillMemory, repertoireDrillQueue, repertoireRepair, repertoireRepairQueue, repertoireRepairOutcomes] = await Promise.all([
    loadCoachingSummary(),
    loadStudyPlan(),
    loadMistakePatterns(),
    loadTrainingObjective(),
    loadObjectiveProgress(),
    loadObjectiveEscalation(),
    loadObjectivePortfolio(),
    loadObjectiveCoaching(),
    loadInterventionEffectiveness(),
    loadInterventionMemory(),
    loadConceptState(),
    loadOpeningReport(),
    loadRepertoireReview(),
    loadRepertoireTransfer(),
    loadRepertoireTransferCoaching(),
    loadRepertoireDrillMemory(),
    loadRepertoireDrillQueue(),
    loadRepertoireRepair(),
    loadRepertoireRepairQueue(),
    loadRepertoireRepairOutcomes(),
  ]);

  if (!summary) {
    const [progress, corpusReady] = await Promise.all([
      loadExerciseProgress(),
      exerciseCorpusExists(),
    ]);
    const readiness = deriveReadiness({
      overview: null,
      progress,
      corpusExists: corpusReady,
    });
    return (
      <>
        <PageHeader title="Coach" subtitle="Personalized coaching insights" />
        <EmptyState
          icon={<GraduationCap className="h-10 w-10" />}
          title="No coaching data yet"
          description={
            readiness.canRefreshInsights
              ? "Your coaching insights are ready to generate."
              : readiness.canStudy
                ? "Complete a study session first to get coaching advice."
                : "Set up your training pipeline to get started."
          }
          action={
            readiness.canRefreshInsights ? (
              <RefreshInsightsButton />
            ) : readiness.canStudy ? (
              <Link
                href="/sessions"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
              >
                Go to Sessions
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
              >
                View Setup Instructions
                <ArrowRight className="h-4 w-4" />
              </Link>
            )
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Coach" subtitle={`Updated ${formatRelativeDate(summary.generatedAt)}`} />

      <div className="mb-6 rounded-xl border border-accent/20 bg-accent-muted px-6 py-5">
        <p className="text-lg font-semibold text-text-primary">{summary.headline}</p>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{summary.progressStatement}</p>
        <p className="mt-1 text-sm text-accent">{summary.nextStepStatement}</p>
      </div>

      {objective && (
        <div className="mb-6 rounded-xl border border-border bg-surface px-6 py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">Training Objective</p>
          <p className="mt-1 text-sm font-semibold text-text-primary">{objective.currentObjective.replace(/_/g, " ")}</p>
          <p className="mt-1 text-xs text-text-secondary">{objective.objectiveReason}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-surface-elevated px-3 py-2">
              <p className="text-xs font-medium text-text-primary">This Week Plan</p>
              {objective.weeklyPlan.slice(0, 2).map((item, idx) => (
                <p key={idx} className="mt-1 text-[11px] text-text-muted">{item}</p>
              ))}
            </div>
            <div className="rounded-lg bg-surface-elevated px-3 py-2">
              <p className="text-xs font-medium text-text-primary">Success Signals</p>
              {objective.successSignals.slice(0, 2).map((signal) => (
                <p key={signal.metric} className="mt-1 text-[11px] text-text-muted">
                  {signal.signal}: {signal.currentValue.toFixed(2)} / {signal.targetValue.toFixed(2)}
                </p>
              ))}
            </div>
          </div>
          {objectiveProgress && (
            <>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <div className="rounded-lg bg-surface-elevated px-3 py-2">
                  <p className="text-xs font-medium text-text-primary">Progress Verdict</p>
                  <p className="mt-1 text-[11px] text-text-muted">{objectiveProgress.progressVerdict.replace(/_/g, " ")}</p>
                </div>
                <div className="rounded-lg bg-surface-elevated px-3 py-2">
                  <p className="text-xs font-medium text-text-primary">Objective Status</p>
                  <p className="mt-1 text-[11px] text-text-muted">
                    {objectiveProgress.objectiveStatus.replace(/_/g, " ")} · {objectiveProgress.sessionsOnObjective} session(s)
                  </p>
                </div>
                <div className="rounded-lg bg-surface-elevated px-3 py-2">
                  <p className="text-xs font-medium text-text-primary">Decision</p>
                  <p className="mt-1 text-[11px] text-text-muted">{objectiveProgress.lifecycleDecision.replace(/_/g, " ")}</p>
                </div>
                {objectiveCoaching && (
                  <div className="rounded-lg bg-surface-elevated px-3 py-2">
                    <p className="text-xs font-medium text-text-primary">Intervention</p>
                    <p className="mt-1 text-[11px] text-text-muted">
                      {objectiveCoaching.interventionType.replace(/_/g, " ")} · {objectiveCoaching.recommendationStrength}
                    </p>
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-text-muted">{objectiveProgress.objectiveDecisionReason}</p>
              {objectiveEscalation && (
                <div className="mt-3 rounded-lg bg-surface-elevated px-3 py-3">
                  <p className="text-xs font-medium text-text-primary">Objective Escalation</p>
                  <p className="mt-1 text-[11px] text-text-muted">Escalation Verdict: {objectiveEscalation.escalationVerdict.replace(/_/g, " ")} - {objectiveEscalation.escalationStrength}</p>
                  <p className="mt-1 text-[11px] text-text-muted">Why the verdict happened: {objectiveEscalation.escalationReason}</p>
                  <p className="mt-1 text-[11px] text-text-muted">Next Action Recommendation: {objectiveEscalation.explanation}</p>
                  {objectiveEscalation.recommendedObjectivePhaseChange && (
                    <p className="mt-1 text-[11px] text-text-muted">Phase-change rationale: {objectiveEscalation.recommendedObjectivePhaseChange.reason}</p>
                  )}
                  {objectiveEscalation.recommendedNextObjective && (
                    <p className="mt-1 text-[11px] text-text-muted">Switch rationale: {objectiveEscalation.recommendedNextObjective.replace(/_/g, " ")}</p>
                  )}
                </div>
              )}
              {objectiveCoaching && (
                <div className="mt-3 rounded-lg bg-surface-elevated px-3 py-3">
                  <p className="text-xs font-medium text-text-primary">Intervention Reason</p>
                  <p className="mt-1 text-[11px] text-text-muted">{objectiveCoaching.explanation}</p>
                  {objectiveCoaching.compareWindows[0] && (
                    <p className="mt-1 text-[11px] text-text-muted">Compare Window: {objectiveCoaching.compareWindows[0].summary}</p>
                  )}
                  <p className="mt-1 text-[11px] text-text-muted">Next Session Adjustment: {objectiveCoaching.nextSessionAdjustmentSummary}</p>
                </div>
              )}
              {interventionEffectiveness && interventionEffectiveness.priorInterventionType && (
                <div className="mt-3 rounded-lg bg-surface-elevated px-3 py-3">
                  <p className="text-xs font-medium text-text-primary">Previous Intervention Outcome</p>
                  <p className="mt-1 text-[11px] text-text-muted">
                    {interventionEffectiveness.priorInterventionType.replace(/_/g, " ")} was {interventionEffectiveness.interventionOutcome.replace(/_/g, " ")} · {interventionEffectiveness.recommendedAction}
                  </p>
                  <p className="mt-1 text-[11px] text-text-muted">Improved: {interventionEffectiveness.narrativeSummaryData.whatImproved}</p>
                  <p className="mt-1 text-[11px] text-text-muted">Worsened: {interventionEffectiveness.narrativeSummaryData.whatGotWorse}</p>
                  <p className="mt-1 text-[11px] text-text-muted">Next Step: {interventionEffectiveness.narrativeSummaryData.nextStep}</p>
                </div>
              )}
              {objectivePortfolio && (
                <div className="mt-3 rounded-lg bg-surface-elevated px-3 py-3">
                  <p className="text-xs font-medium text-text-primary">Objective Portfolio</p>
                  <p className="mt-1 text-[11px] text-text-muted">Active objective: {objectivePortfolio.activeObjective.replace(/_/g, " ")}</p>
                  {objectivePortfolio.rotationDecisions.slice(0, 3).map((decision) => (
                    <p key={decision.objectiveKey} className="mt-1 text-[11px] text-text-muted">
                      Rotation Decision: {decision.objectiveKey.replace(/_/g, " ")} - {decision.action.replace(/_/g, " ")} - share {decision.trainingShare.toFixed(2)}
                    </p>
                  ))}
                </div>
              )}
              {interventionMemory && interventionMemory.recentEpisodes.length > 0 && (
                <div className="mt-3 rounded-lg bg-surface-elevated px-3 py-3">
                  <p className="text-xs font-medium text-text-primary">Intervention Memory</p>
                  <p className="mt-1 text-[11px] text-text-muted">
                    Last outcome vs prior: {interventionMemory.recentEpisodes[0]?.outcome.replace(/_/g, " ")} vs {interventionMemory.recentEpisodes[1]?.outcome.replace(/_/g, " ") ?? "none"}
                  </p>
                  <p className="mt-1 text-[11px] text-text-muted">Next Action Recommendation: {interventionMemory.nextActionRecommendation.reason}</p>
                  <p className="mt-1 text-[11px] text-warning">Repeated Pattern Warning: {interventionMemory.repeatedPatternWarnings[0] ?? "none detected"}</p>
                  {interventionMemory.recentEpisodes.slice(0, 3).map((episode) => (
                    <p key={episode.interventionEpisodeId} className="mt-1 text-[11px] text-text-muted">
                      {episode.interventionType.replace(/_/g, " ")}: {episode.compareSnapshot.summary}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="mb-6">
        <SectionCard title="Prioritized Insights" subtitle={`${summary.insights.length} insights`}>
          <InsightList insights={summary.insights} />
        </SectionCard>
      </div>

      <div className="mb-6">
        <Link href="/history" className="flex items-center gap-2 text-xs font-medium text-accent transition-colors hover:text-accent/80">
          <Clock className="h-3.5 w-3.5" />
          View History &rarr;
        </Link>
      </div>


      {openingReport && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Opening Focus" subtitle="Opening-specific coaching signal">
            <div className="space-y-3">
              {openingReport.topWeaknesses.slice(0, 3).map((entry) => (
                <div key={`${entry.openingKey}-${entry.theme}`} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">{entry.openingName}</p>
                    <Badge variant="warning">{entry.theme.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{entry.conceptMappings.join(", ")}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Recurring Opening Mistakes" subtitle="Cross-family pressure">
            <div className="space-y-3">
              {openingReport.recurringMistakes.slice(0, 3).map((entry) => (
                <div key={entry.theme} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{entry.theme.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-xs text-text-muted">{entry.count} occurrences across {entry.openings.join(", ")}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
      {repertoireReview && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Repertoire Coaching" subtitle="Lines under practical pressure">
            <div className="space-y-3">
              {plan?.repertoireFocuses.slice(0, 3).map((entry) => (
                <div key={entry.lineId} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                    <Badge variant="warning">Priority {entry.reviewPriority.toFixed(2)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{entry.recommendedAction}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="First-Deviation Patterns" subtitle="Why games are leaving the intended path">
            <div className="space-y-3">
              {repertoireReview.firstDeviationPatterns.slice(0, 3).map((entry) => (
                <div key={entry.deviationType} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{entry.deviationType.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-xs text-text-muted">{entry.count} games across {entry.lines.join(", ")}</p>
                </div>
              ))}
              {repertoireTransfer?.summary.gamesMatched ? (
                <div className="rounded-lg border border-border-subtle bg-surface px-4 py-3 text-xs text-text-muted">
                  Memory miss rate {(repertoireTransfer.summary.memoryMissRate * 100).toFixed(0)}% with {repertoireTransfer.summary.averageInBookDepth.toFixed(2)} average in-book depth.
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>
      )}
      {repertoireTransferCoaching && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Transfer Repair" subtitle="First bad moments to coach directly">
            <div className="space-y-3">
              {repertoireTransferCoaching.fragileLines.slice(0, 3).map((entry) => (
                <div key={entry.lineId} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                    <Badge variant="warning">{entry.transferFailureType.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{entry.coachingSummary}</p>
                  <p className="mt-1 text-xs text-text-muted">{entry.recommendedReviewLine}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Concept-Linked Repair" subtitle="When opening failure is not just memory">
            <div className="space-y-3">
              {repertoireTransferCoaching.conceptReinforcements.slice(0, 3).map((entry) => (
                <div key={entry.concept} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{entry.concept}</p>
                  <p className="mt-1 text-xs text-text-muted">{entry.count} line(s): {entry.lines.join(", ")}</p>
                </div>
              ))}
              {summary.repertoireTransferSnapshot?.topActions[0] && (
                <div className="rounded-lg border border-border-subtle bg-surface px-4 py-3 text-xs text-text-muted">
                  Top action: {summary.repertoireTransferSnapshot.topActions[0].action}
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}
      {repertoireDrillMemory && repertoireDrillQueue && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Drill Memory Coaching" subtitle="When line recall needs direct repair">
            <div className="space-y-3">
              {repertoireDrillMemory.fragileLines.slice(0, 3).map((entry) => (
                <div key={entry.lineId} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                    <Badge variant="warning">{entry.spacedReviewBucket.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">Recall confidence {Math.round(entry.recallConfidence * 100)}% · forgetting risk {Math.round(entry.forgettingRisk * 100)}%</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Studied Vs OTB" subtitle="Where studied lines still fail in games">
            <div className="space-y-3">
              {repertoireDrillMemory.drillVsGameComparisons.slice(0, 4).map((entry) => (
                <div key={entry.comparison} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{entry.comparison.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-xs text-text-muted">{entry.count} line(s): {entry.lines.join(", ")}</p>
                </div>
              ))}
              {repertoireDrillQueue.nextLinesToReview[0] && (
                <div className="rounded-lg border border-border-subtle bg-surface px-4 py-3 text-xs text-text-muted">
                  Next drill: {repertoireDrillQueue.nextLinesToReview[0].lineName}
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}
      {repertoireRepair && repertoireRepairQueue && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Repair Queue" subtitle="Imported games that should hand off into exact line repair">
            <div className="space-y-3">
              {repertoireRepairQueue.entries.slice(0, 3).map((entry) => (
                <div key={`${entry.sourceGameId}-${entry.lineId}`} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                    <Badge variant="warning">{entry.repairType.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{entry.scheduledDrillReason}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Import Repair Signals" subtitle="Why those lines were scheduled next">
            <div className="space-y-3">
              {repertoireRepair.repairByType.slice(0, 4).map((entry) => (
                <div key={entry.repairType} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{entry.repairType.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-xs text-text-muted">{entry.count} line(s): {entry.lines.join(", ")}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
      {repertoireRepairOutcomes && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Repair Outcomes" subtitle="Which repairs actually held up">
            <div className="space-y-3">
              {repertoireRepairOutcomes.repairsThatWorked.slice(0, 3).map((entry) => (
                <div key={entry.repairId} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                    <Badge variant="success">{entry.outcomeVerdict.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{entry.outcomeReason}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Transfer Follow-up" subtitle="When repair still is not reaching games">
            <div className="space-y-3">
              {repertoireRepairOutcomes.repairsStillFragile.slice(0, 3).map((entry) => (
                <div key={entry.repairId} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                    <Badge variant="warning">{entry.outcomeVerdict.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{entry.nextAction}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
      {conceptState && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Recommended Concepts" subtitle="Read-only concept focus from artifacts">
            <div className="space-y-3">
              {conceptState.recommendedFocuses.slice(0, 3).map((focus) => (
                <div key={focus.conceptKey} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">{focus.conceptName}</p>
                    <Badge variant="warning">Priority {focus.reviewPriority.toFixed(2)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{focus.explanation}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Prerequisite Gaps" subtitle="Concept blockers behind visible mistakes">
            <div className="space-y-3">
              {conceptState.prerequisiteHotspots.slice(0, 3).map((spot) => (
                <div key={spot.conceptKey} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{spot.conceptKey}</p>
                  <p className="mt-1 text-xs text-text-muted">{spot.missingPrerequisites.join(", ")}</p>
                </div>
              ))}
              {conceptState.strongestConcepts[0] && (
                <div className="rounded-lg border border-border-subtle bg-surface px-4 py-3 text-xs text-text-muted">
                  Strongest concept: {conceptState.strongestConcepts[0].conceptName} ({Math.round(conceptState.strongestConcepts[0].masteryScore * 100)}% mastery)
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Study Plan" subtitle={plan ? `${plan.suggestedSessionSize} exercises per session` : undefined}>
          {plan ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border-subtle bg-surface-elevated px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-accent-muted text-[10px] font-bold text-accent">1</span>
                    <span className="text-sm font-medium text-text-primary">{formatCategory(plan.primaryFocus.category)}</span>
                    {plan.primaryFocus.difficulty && <DifficultyBadge difficulty={plan.primaryFocus.difficulty} />}
                    <Badge variant="accent">Primary</Badge>
                  </div>
                  <Badge variant="muted">{plan.primaryFocus.exerciseCount} exercises</Badge>
                </div>
                <p className="mt-1 text-xs text-text-muted">{plan.primaryFocus.reason}</p>
              </div>
              {plan.secondaryFocus && (
                <div className="rounded-lg border border-border-subtle bg-surface-elevated px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-surface-hover text-[10px] font-bold text-text-muted">2</span>
                      <span className="text-sm font-medium text-text-primary">{formatCategory(plan.secondaryFocus.category)}</span>
                      {plan.secondaryFocus.difficulty && <DifficultyBadge difficulty={plan.secondaryFocus.difficulty} />}
                      <Badge variant="muted">Secondary</Badge>
                    </div>
                    <Badge variant="muted">{plan.secondaryFocus.exerciseCount} exercises</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{plan.secondaryFocus.reason}</p>
                </div>
              )}
              <div className="mt-2 space-y-1.5">
                {plan.exerciseComposition.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">{c.description}</span>
                    <Badge variant="muted">{c.count}</Badge>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Badge variant="success">Easy {plan.targetDifficultyMix.easy}</Badge>
                <Badge variant="warning">Med {plan.targetDifficultyMix.medium}</Badge>
                <Badge variant="danger">Hard {plan.targetDifficultyMix.hard}</Badge>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-text-muted">No study plan available</div>
          )}
        </SectionCard>

        <SectionCard
          title="Mistake Patterns"
          subtitle={patterns?.recurringWeaknesses.length ? `Recurring: ${patterns.recurringWeaknesses.map(formatCategory).join(", ")}` : undefined}
        >
          {patterns && patterns.categoryPatterns.length > 0 ? (
            <div className="space-y-2">
              {patterns.categoryPatterns.map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-3.5 w-3.5 ${p.severity === "moderate" || p.severity === "high" ? "text-warning" : "text-text-muted"}`} />
                    <span className="text-sm text-text-primary">{formatCategory(p.category)}</span>
                    <TrendBadge direction={p.trendDirection} />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted">{p.incorrectCount}/{p.exerciseCount}</span>
                    <ProgressBar
                      value={p.lifetimeMissRate * 100}
                      color={p.lifetimeMissRate > 0.5 ? "danger" : p.lifetimeMissRate > 0.3 ? "warning" : "success"}
                      className="w-20"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-text-muted">No mistake patterns detected yet</div>
          )}
        </SectionCard>
      </div>
    </>
  );
}












