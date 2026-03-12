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
  const [summary, plan, patterns, objective, objectiveProgress, objectiveEscalation, objectivePortfolio, objectiveCoaching, interventionEffectiveness, interventionMemory] = await Promise.all([
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
