import Link from "next/link";
import {
  loadLearnerOverview,
  loadTrendReport,
  loadExerciseProgress,
  exerciseCorpusExists,
  deriveReadiness,
  loadTrainingObjective,
  loadObjectiveProgress,
  loadAllSessions,
  loadAllSessionResults,
  loadObjectiveEscalation,
  loadObjectivePortfolio,
  loadObjectiveCoaching,
  loadInterventionEffectiveness,
  loadInterventionMemory,
} from "@/lib/artifacts";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { Badge, TrendBadge } from "@/components/ui/badge";
import { ProgressBar, SegmentedBar } from "@/components/ui/progress-bar";
import { FocusList } from "@/components/ui/insight-list";
import { RefreshInsightsButton } from "@/components/ui/refresh-insights-button";
import { AccuracyChart } from "@/components/charts/accuracy-chart";
import { ProgressChart } from "@/components/charts/progress-chart";
import { ThemeTrendChart } from "@/components/charts/theme-trend-chart";
import { ImprovementReport } from "@/components/progress/improvement-report";
import { MasteryChart } from "@/components/charts/mastery-chart";
import { TrainingWorkflowGuide } from "@/components/onboarding/training-workflow-guide";
import { formatPercent, formatCategory, formatRelativeDate } from "@/lib/utils";
import { buildProgressReport } from "@/lib/progress-engine";
import {
  Target,
  Eye,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Play,
  ListChecks,
  Clock,
  GraduationCap,
  Settings,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

function StepRow({
  step,
  label,
  done,
  hint,
  action,
}: {
  step: number;
  label: string;
  done: boolean;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-surface-elevated px-4 py-3">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-subtle">
        {done ? (
          <CheckCircle className="h-4 w-4 text-success" />
        ) : (
          <span className="text-xs font-bold text-text-muted">{step}</span>
        )}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${done ? "text-success" : "text-text-primary"}`}>
          {label}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">{hint}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const [overview, progress, corpusReady, objective, objectiveProgress, objectiveEscalation, objectivePortfolio, objectiveCoaching, interventionEffectiveness, interventionMemory, allSessions, allSessionResults] = await Promise.all([
    loadLearnerOverview(),
    loadExerciseProgress(),
    exerciseCorpusExists(),
    loadTrainingObjective(),
    loadObjectiveProgress(),
    loadObjectiveEscalation(),
    loadObjectivePortfolio(),
    loadObjectiveCoaching(),
    loadInterventionEffectiveness(),
    loadInterventionMemory(),
    loadAllSessions(),
    loadAllSessionResults(),
  ]);
  const readiness = deriveReadiness({
    overview,
    progress,
    corpusExists: corpusReady,
  });

  if (!overview) {
    return (
      <>
        <PageHeader title="Welcome to Chess OS" subtitle="Your adaptive chess training system" />
        <div className="mx-auto max-w-lg">
          <SectionCard title="Getting Started" subtitle="Complete these steps to begin training">
            <div className="space-y-3">
              <StepRow
                step={1}
                label="Import & Analyze Games"
                done={readiness.pipelineReady}
                hint={
                  readiness.pipelineReady
                    ? "Exercise corpus ready"
                    : "Import PGNs and run analysis to generate exercises"
                }
                action={
                  !readiness.pipelineReady ? (
                    <Link
                      href="/import"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80"
                    >
                      Open Import & Analyze
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  ) : undefined
                }
              />
              <StepRow
                step={2}
                label="Complete a Study Session"
                done={readiness.progressReady}
                hint={
                  readiness.progressReady
                    ? "Progress data available"
                    : readiness.canStudy
                      ? "Generate and complete a session to build progress data"
                      : "Requires pipeline data first"
                }
                action={
                  readiness.canStudy && !readiness.progressReady ? (
                    <Link
                      href="/sessions"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80"
                    >
                      Go to Sessions
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  ) : undefined
                }
              />
              <StepRow
                step={3}
                label="Generate Insights"
                done={readiness.insightsReady}
                hint={
                  readiness.insightsReady
                    ? "Dashboard, Coach, and Curriculum ready"
                    : readiness.canRefreshInsights
                      ? "Click below to generate your dashboard, coach, and curriculum"
                      : "Complete a session first"
                }
                action={readiness.canRefreshInsights && !readiness.insightsReady ? <RefreshInsightsButton /> : undefined}
              />
            </div>
          </SectionCard>

          <div className="mt-4 flex justify-center gap-3">
            {readiness.canStudy && (
              <Link
                href="/sessions"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
              >
                <Play className="h-4 w-4" />
                Go to Sessions
              </Link>
            )}
            <Link
              href="/import"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >
              <Settings className="h-4 w-4" />
              Import & Analyze
            </Link>
          </div>

          <div className="mt-6">
            <TrainingWorkflowGuide readiness={readiness} />
          </div>
        </div>
      </>
    );
  }

  const masteryTotal = Object.values(overview.masteryDistribution).reduce((a, b) => a + b, 0);
  const progressReport = buildProgressReport({
    sessions: allSessions,
    resultsMap: allSessionResults,
  });
  const objectiveMix = objective?.objectiveExerciseMix;
  const masteredPct = masteryTotal > 0 ? (overview.masteryDistribution.mastered / masteryTotal) * 100 : 0;

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Last updated ${formatRelativeDate(overview.generatedAt)}`} />

      {objective && (
        <div className="mb-6 rounded-xl border border-accent/20 bg-accent-muted px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-accent">Current Objective</p>
              <p className="mt-1 text-sm font-semibold text-text-primary">{objective.currentObjective.replace(/_/g, " ")}</p>
              <p className="mt-1 text-xs text-text-secondary">{objective.objectiveReason}</p>
            </div>
            <div className="text-right text-xs text-text-muted">
              <p>
                Phase: <span className="font-medium text-text-primary">{objective.objectivePhase}</span>
              </p>
              {objectiveMix && (
                <p className="mt-1">
                  Mix T{objectiveMix.tactical}/R{objectiveMix.recall}/V{objectiveMix.visualization}/G{objectiveMix.reconstruction}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {objective.successSignals.slice(0, 2).map((signal) => (
              <div key={signal.metric} className="rounded-lg bg-surface-elevated px-3 py-2">
                <p className="text-xs font-medium text-text-primary">{signal.signal}</p>
                <p className="text-[11px] text-text-muted">
                  current {signal.currentValue.toFixed(2)} Ã‚Â· target {signal.targetValue.toFixed(2)} Ã‚Â· {signal.direction}
                </p>
              </div>
            ))}
          </div>
          {objectiveProgress && (
            <div className="mt-4 grid gap-2 md:grid-cols-4">
              <div className="rounded-lg bg-surface-elevated px-3 py-2">
                <p className="text-xs font-medium text-text-primary">Objective Status</p>
                <p className="mt-1 text-[11px] text-text-muted">
                  {objectiveProgress.objectiveStatus.replace(/_/g, " ")} Ã‚Â· {objectiveProgress.progressVerdict.replace(/_/g, " ")}
                </p>
              </div>
              <div className="rounded-lg bg-surface-elevated px-3 py-2">
                <p className="text-xs font-medium text-text-primary">Time On Objective</p>
                <p className="mt-1 text-[11px] text-text-muted">
                  {objectiveProgress.sessionsOnObjective} session(s) Ã‚Â· {objectiveProgress.activeDays.toFixed(1)} day(s)
                </p>
              </div>
              <div className="rounded-lg bg-surface-elevated px-3 py-2">
                <p className="text-xs font-medium text-text-primary">Next Coaching Action</p>
                <p className="mt-1 text-[11px] text-text-muted">{objectiveProgress.nextRecommendedAction}</p>
              </div>
              {objectiveEscalation && (
            <div className="mt-3 rounded-lg bg-surface-elevated px-3 py-3">
              <p className="text-xs font-medium text-text-primary">Objective Escalation</p>
              <p className="mt-1 text-[11px] text-text-muted">Escalation Verdict: {objectiveEscalation.escalationVerdict.replace(/_/g, " ")} - {objectiveEscalation.escalationStrength}</p>
              <p className="mt-1 text-[11px] text-text-muted">{objectiveEscalation.escalationReason}</p>
              <p className="mt-1 text-[11px] text-text-muted">Next action recommendation: {objectiveEscalation.explanation}</p>
              {objectiveEscalation.recommendedObjectivePhaseChange && (
                <p className="mt-1 text-[11px] text-text-muted">Phase-change rationale: {objectiveEscalation.recommendedObjectivePhaseChange.reason}</p>
              )}
              {objectiveEscalation.recommendedNextObjective && (
                <p className="mt-1 text-[11px] text-text-muted">Switch rationale: {objectiveEscalation.recommendedNextObjective.replace(/_/g, " ")}</p>
              )}
            </div>
          )}
          {objectiveCoaching && (
                <div className="rounded-lg bg-surface-elevated px-3 py-2">
                  <p className="text-xs font-medium text-text-primary">Recommended Intervention</p>
                  <p className="mt-1 text-[11px] text-text-muted">
                    {objectiveCoaching.interventionType.replace(/_/g, " ")} Ã‚Â· {objectiveCoaching.recommendationStrength}
                  </p>
                </div>
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
            </div>
          )}
          {interventionEffectiveness && interventionEffectiveness.priorInterventionType && (
            <div className="mt-3 rounded-lg bg-surface-elevated px-3 py-3">
              <p className="text-xs font-medium text-text-primary">Previous Intervention Outcome</p>
              <p className="mt-1 text-[11px] text-text-muted">
                {interventionEffectiveness.priorInterventionType.replace(/_/g, " ")} was {interventionEffectiveness.interventionOutcome.replace(/_/g, " ")} Ã‚Â· {interventionEffectiveness.outcomeStrength}
              </p>
              <p className="mt-1 text-[11px] text-text-muted">{interventionEffectiveness.narrativeSummaryData.summary}</p>
            </div>
          )}
          {objectivePortfolio && (
            <div className="mt-3 rounded-lg bg-surface-elevated px-3 py-3">
              <p className="text-xs font-medium text-text-primary">Objective Portfolio</p>
              <p className="mt-1 text-[11px] text-text-muted">Active objective: {objectivePortfolio.activeObjective.replace(/_/g, " ")} - {objectivePortfolio.portfolioSummary}</p>
              <div className="mt-2 space-y-1">
                {objectivePortfolio.rankedObjectives.slice(0, 3).map((entry, index) => (
                  <p key={entry.objectiveKey} className="text-[11px] text-text-muted">
                    Rank {index + 1}: {entry.objectiveKey.replace(/_/g, " ")} - priority {entry.portfolioPriority.toFixed(2)} - share {entry.trainingShare.toFixed(2)} - {entry.portfolioStatus.replace(/_/g, " ")}
                  </p>
                ))}
                {objectivePortfolio.rotationDecisions.slice(0, 1).map((decision) => (
                  <p key={decision.objectiveKey} className="text-[11px] text-text-muted">
                    Rotation Decision: {decision.objectiveKey.replace(/_/g, " ")} - {decision.action.replace(/_/g, " ")} - share {decision.trainingShare.toFixed(2)}
                  </p>
                ))}
              </div>
            </div>
          )}
          {interventionMemory && interventionMemory.recentEpisodes.length > 0 && (
            <div className="mt-3 rounded-lg bg-surface-elevated px-3 py-3">
              <p className="text-xs font-medium text-text-primary">Intervention Memory</p>
              <p className="mt-1 text-[11px] text-text-muted">
                Next action: {interventionMemory.nextActionRecommendation.action.replace(/_/g, " ")} {interventionMemory.nextActionRecommendation.interventionType?.replace(/_/g, " ") ?? ""}
              </p>
              <p className="mt-1 text-[11px] text-text-muted">{interventionMemory.nextActionRecommendation.reason}</p>
              <p className="mt-1 text-[11px] text-warning">Repeated Pattern Warning: {interventionMemory.repeatedPatternWarnings[0] ?? "none detected"}</p>
              <div className="mt-2 space-y-1">
                {interventionMemory.recentEpisodes.slice(0, 3).map((episode, index) => (
                  <p key={episode.interventionEpisodeId} className="text-[11px] text-text-muted">
                    Episode {index + 1}: {episode.interventionType.replace(/_/g, " ")} was {episode.outcome.replace(/_/g, " ")} Ã‚Â· {episode.compareSnapshot.summary}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="Progress Summary" subtitle={`${progressReport.summary.sessionCount} completed sessions`}>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-elevated px-4 py-3">
              <p className="text-xs text-text-muted">Average accuracy</p>
              <p className="mt-1 text-xl font-semibold text-text-primary">
                {formatPercent(progressReport.summary.averageAccuracy)}
              </p>
            </div>
            <div className="rounded-lg bg-surface-elevated px-4 py-3">
              <p className="text-xs text-text-muted">Latest accuracy</p>
              <p className="mt-1 text-xl font-semibold text-text-primary">
                {formatPercent(progressReport.summary.latestAccuracy ?? 0)}
              </p>
            </div>
          </div>
          {progressReport.sessionTrend.length > 0 && (
            <div className="mt-4">
              <ProgressChart sessions={progressReport.sessionTrend} />
            </div>
          )}
        </SectionCard>

        <SectionCard title="Theme Trends" subtitle="How your themes are moving over time">
          {progressReport.themeTrend.themes.length > 0 ? (
            <ThemeTrendChart
              themes={progressReport.themeTrend.themes}
              points={progressReport.themeTrend.points}
            />
          ) : (
            <div className="flex h-[220px] items-center justify-center text-xs text-text-muted">
              Complete more sessions to unlock theme trend lines
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mb-6">
        <ImprovementReport report={progressReport} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Exercises"
          value={overview.totalExercises}
          subtitle={`${overview.totalSeen} seen - ${overview.totalUnseen} unseen`}
          icon={<Target className="h-4 w-4" />}
        />
        <MetricCard
          label="Lifetime Accuracy"
          value={formatPercent(overview.lifetimeAccuracy)}
          subtitle={overview.recentAccuracy !== null ? `Recent: ${formatPercent(overview.recentAccuracy)}` : "No recent sessions"}
          icon={<BarChart3 className="h-4 w-4" />}
          trend={
            overview.recentAccuracy !== null
              ? overview.recentAccuracy > overview.lifetimeAccuracy
                ? "up"
                : overview.recentAccuracy < overview.lifetimeAccuracy
                  ? "down"
                  : "flat"
              : undefined
          }
        />
        <MetricCard
          label="Review Load"
          value={overview.reviewLoad.totalReviewable}
          subtitle={`${overview.reviewLoad.overdueCount} overdue - ${overview.reviewLoad.dueSoonCount} due soon`}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <MetricCard
          label="Mastery"
          value={`${masteredPct.toFixed(0)}%`}
          subtitle={`${overview.masteryDistribution.mastered} of ${masteryTotal} mastered`}
          icon={<CheckCircle className="h-4 w-4" />}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="/sessions" className="flex items-center gap-3 rounded-xl border border-accent/30 bg-surface p-4 transition-colors hover:bg-surface-hover">
          <Play className="h-5 w-5 text-accent" />
          <span className="text-sm font-medium text-text-primary">Study Next</span>
        </Link>
        <Link href="/review" className="flex items-center gap-3 rounded-xl border border-warning/30 bg-surface p-4 transition-colors hover:bg-surface-hover">
          <ListChecks className="h-5 w-5 text-warning" />
          <div>
            <span className="text-sm font-medium text-text-primary">Review</span>
            {overview.reviewLoad.overdueCount > 0 && <span className="ml-2 text-xs text-warning">{overview.reviewLoad.overdueCount} overdue</span>}
          </div>
        </Link>
        <Link href="/history" className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-hover">
          <Clock className="h-5 w-5 text-info" />
          <span className="text-sm font-medium text-text-primary">History</span>
        </Link>
        <Link href="/coach" className="flex items-center gap-3 rounded-xl border border-success/30 bg-surface p-4 transition-colors hover:bg-surface-hover">
          <GraduationCap className="h-5 w-5 text-success" />
          <span className="text-sm font-medium text-text-primary">Coach</span>
        </Link>
      </div>

      <div className="mb-6">
        <TrainingWorkflowGuide readiness={readiness} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="Mastery Distribution">
          <MasteryChart distribution={overview.masteryDistribution} />
          <div className="mt-4">
            <SegmentedBar
              segments={[
                { value: overview.masteryDistribution.mastered, color: "bg-success", label: "Mastered" },
                { value: overview.masteryDistribution.improving, color: "bg-accent", label: "Improving" },
                { value: overview.masteryDistribution.learning, color: "bg-info", label: "Learning" },
                { value: overview.masteryDistribution.unstable, color: "bg-warning", label: "Unstable" },
                { value: overview.masteryDistribution.unseen, color: "bg-surface-hover", label: "Unseen" },
              ]}
              total={masteryTotal}
            />
          </div>
        </SectionCard>

        <SectionCard title="Session Accuracy" subtitle={overview.recentSessions.length > 0 ? `${overview.recentSessions.length} sessions tracked` : undefined}>
          {overview.recentSessions.length > 0 ? (
            <AccuracyChart sessions={overview.recentSessions} />
          ) : (
            <div className="flex h-[200px] items-center justify-center text-xs text-text-muted">
              Complete sessions to see accuracy trends
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="Focus Recommendations" subtitle="Ranked by impact">
          {overview.focusRecommendations.length > 0 ? (
            <FocusList
              items={overview.focusRecommendations.map((f) => ({
                rank: f.rank,
                category: formatCategory(f.category),
                reason: f.reason,
                score: f.focusScore,
              }))}
            />
          ) : (
            <div className="py-4 text-center text-xs text-text-muted">
              Complete more sessions to get focus recommendations
            </div>
          )}
        </SectionCard>

        <SectionCard title="Trend Summary">
          <div className="space-y-4">
            {overview.trendSummary.improvingCategories.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-success">Improving</p>
                <div className="flex flex-wrap gap-1.5">
                  {overview.trendSummary.improvingCategories.map((c) => (
                    <Badge key={c} variant="success">{formatCategory(c)}</Badge>
                  ))}
                </div>
              </div>
            )}
            {overview.trendSummary.worseningCategories.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-danger">Needs Attention</p>
                <div className="flex flex-wrap gap-1.5">
                  {overview.trendSummary.worseningCategories.map((c) => (
                    <Badge key={c} variant="danger">{formatCategory(c)}</Badge>
                  ))}
                </div>
              </div>
            )}
            {overview.trendSummary.stableCategories.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-text-muted">Stable</p>
                <div className="flex flex-wrap gap-1.5">
                  {overview.trendSummary.stableCategories.map((c) => (
                    <Badge key={c} variant="muted">{formatCategory(c)}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {overview.recentSessions.length > 0 && (
        <SectionCard title="Recent Sessions" subtitle={`${overview.recentSessionCount} sessions completed`} action={<Link href="/history" className="text-xs font-medium text-accent hover:text-accent/80">View all &rarr;</Link>}>
          <div className="space-y-2">
            {[...overview.recentSessions]
              .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
              .map((s) => (
              <Link
                key={`${s.sessionId}-${s.completedAt}`}
                href={`/history/session/${s.sessionId}`}
                className="flex items-center justify-between rounded-lg bg-surface-elevated px-4 py-3 transition-colors hover:bg-surface-hover"
              >
                <div className="flex items-center gap-3">
                  <Eye className="h-4 w-4 text-text-muted" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{s.sessionId.slice(0, 20)}</p>
                    <p className="text-xs text-text-muted">{formatRelativeDate(s.completedAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-text-secondary">{s.correctCount}/{s.exerciseCount}</span>
                  <ProgressBar
                    value={s.accuracy * 100}
                    color={s.accuracy >= 0.7 ? "success" : s.accuracy >= 0.4 ? "warning" : "danger"}
                    className="w-24"
                  />
                  <span className="w-12 text-right text-sm font-medium text-text-primary">{formatPercent(s.accuracy)}</span>
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>
      )}

      {overview.topWeakCategories.length > 0 && (
        <div className="mt-6">
          <SectionCard title="Weakest Categories" subtitle="Areas needing the most work">
            <div className="space-y-3">
              {overview.topWeakCategories.map((w) => (
                <div key={w.key} className="flex items-center justify-between rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-text-primary">{formatCategory(w.key)}</span>
                    <TrendBadge direction={w.trendDirection} />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-text-muted">{w.dueCount} due</span>
                    <ProgressBar
                      value={w.accuracy * 100}
                      color={w.accuracy >= 0.6 ? "success" : w.accuracy >= 0.3 ? "warning" : "danger"}
                      className="w-24"
                    />
                    <span className="w-12 text-right text-sm font-medium text-text-primary">{formatPercent(w.accuracy)}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
    </>
  );
}































