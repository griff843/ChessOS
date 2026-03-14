import {
  loadCurriculumPlan,
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
import { RefreshInsightsButton } from "@/components/ui/refresh-insights-button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Map, CheckCircle, XCircle, ArrowRight, BookOpen } from "lucide-react";
import { cn, formatCategory, formatRelativeDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function themeLabel(theme: string): string {
  return theme.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function themeBadgeVariant(theme: string) {
  switch (theme) {
    case "blunder_cleanup":
      return "danger" as const;
    case "tactical_repair":
      return "warning" as const;
    case "consolidation":
      return "success" as const;
    case "instability_reduction":
      return "info" as const;
    case "difficulty_expansion":
      return "accent" as const;
    default:
      return "muted" as const;
  }
}

export default async function CurriculumPage() {
  const [plan, objective, objectiveProgress, objectiveEscalation, objectivePortfolio, objectiveCoaching, interventionEffectiveness, interventionMemory, conceptState, openingReport, repertoireReview, repertoireTransfer, repertoireTransferCoaching, repertoireDrillMemory, repertoireDrillQueue, repertoireRepair, repertoireRepairQueue, repertoireRepairOutcomes] = await Promise.all([
    loadCurriculumPlan(),
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

  if (!plan) {
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
        <PageHeader title="Curriculum" subtitle="Your learning roadmap" />
        <EmptyState
          icon={<Map className="h-10 w-10" />}
          title="No curriculum plan yet"
          description={
            readiness.canRefreshInsights
              ? "Your curriculum plan is ready to generate."
              : readiness.canStudy
                ? "Complete a study session first to build your curriculum."
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

  const gates = plan.progressionGates;

  return (
    <>
      <PageHeader title="Curriculum" subtitle={`Updated ${formatRelativeDate(plan.generatedAt)}`} />

      {objective && (
        <div className="mb-6 rounded-xl border border-accent/20 bg-accent-muted px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">Objective Progression</p>
          <p className="mt-1 text-sm font-semibold text-text-primary">
            {objective.currentObjective.replace(/_/g, " ")} - {objective.objectivePhase}
          </p>
          <p className="mt-1 text-xs text-text-secondary">{objective.objectiveExerciseMixRationale}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-text-muted">
            <span>score {objective.progressionState.score.toFixed(2)}</span>
            <span>status {objective.progressionState.status.replace(/_/g, " ")}</span>
            {objectiveProgress && <span>verdict {objectiveProgress.progressVerdict.replace(/_/g, " ")}</span>}
            {objectiveProgress && <span>decision {objectiveProgress.lifecycleDecision.replace(/_/g, " ")}</span>}
            {objectiveCoaching && <span>intervention {objectiveCoaching.interventionType.replace(/_/g, " ")}</span>}
          </div>
          {objectiveProgress && <p className="mt-2 text-[11px] text-text-muted">{objectiveProgress.nextRecommendedAction}</p>}
          {objectiveCoaching && <p className="mt-1 text-[11px] text-text-muted">{objectiveCoaching.nextSessionAdjustmentSummary}</p>}
          {objectiveCoaching?.compareWindows[0] && <p className="mt-1 text-[11px] text-text-muted">Compare Window: {objectiveCoaching.compareWindows[0].summary}</p>}
          {objectiveEscalation && (
            <>
              <p className="mt-1 text-[11px] text-text-muted">Escalation Verdict: {objectiveEscalation.escalationVerdict.replace(/_/g, " ")} - {objectiveEscalation.escalationStrength}</p>
              <p className="mt-1 text-[11px] text-text-muted">Why the verdict happened: {objectiveEscalation.escalationReason}</p>
              <p className="mt-1 text-[11px] text-text-muted">Next action recommendation: {objectiveEscalation.explanation}</p>
              {objectiveEscalation.recommendedObjectivePhaseChange && <p className="mt-1 text-[11px] text-text-muted">Phase-change rationale: {objectiveEscalation.recommendedObjectivePhaseChange.reason}</p>}
              {objectiveEscalation.recommendedNextObjective && <p className="mt-1 text-[11px] text-text-muted">Switch rationale: {objectiveEscalation.recommendedNextObjective.replace(/_/g, " ")}</p>}
            </>
          )}
          {interventionEffectiveness?.priorInterventionType && (
            <p className="mt-1 text-[11px] text-text-muted">
              Previous intervention {interventionEffectiveness.priorInterventionType.replace(/_/g, " ")} was {interventionEffectiveness.interventionOutcome.replace(/_/g, " ")} and the system recommends {interventionEffectiveness.recommendedAction} {interventionEffectiveness.recommendedNextIntervention?.replace(/_/g, " ") ?? "current intervention"}.
            </p>
          )}
          {objectivePortfolio && (
            <>
              <p className="mt-1 text-[11px] text-text-muted">Objective Portfolio: {objectivePortfolio.portfolioSummary}</p>
              {objectivePortfolio.rankedObjectives.slice(0, 3).map((entry) => (
                <p key={entry.objectiveKey} className="mt-1 text-[11px] text-text-muted">
                  Rotation Decision: {entry.objectiveKey.replace(/_/g, " ")} - weight {entry.portfolioRotationWeight.toFixed(2)} - share {entry.trainingShare.toFixed(2)}
                </p>
              ))}
            </>
          )}
          {interventionMemory && interventionMemory.recentEpisodes.length > 0 && (
            <>
              <p className="mt-1 text-[11px] text-text-muted">
                Recent intervention episodes: {interventionMemory.recentEpisodes.slice(0, 2).map((episode) => `${episode.interventionType.replace(/_/g, " ")} ${episode.outcome.replace(/_/g, " ")}`).join("; ")}
              </p>
              <p className="mt-1 text-[11px] text-text-muted">Next-action recommendation: {interventionMemory.nextActionRecommendation.reason}</p>
              <p className="mt-1 text-[11px] text-warning">Repeated Pattern Warning: {interventionMemory.repeatedPatternWarnings[0] ?? "none detected"}</p>
            </>
          )}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-border bg-surface px-6 py-4">
        <p className="text-sm leading-relaxed text-text-secondary">{plan.overallRationale}</p>
      </div>

      <div className="mb-6">
        <SectionCard
          title="Progression Gates"
          subtitle={gates.readinessSummary}
          action={<Badge variant={gates.overallReadiness ? "success" : "warning"}>{gates.overallReadiness ? "Ready to advance" : "Not yet ready"}</Badge>}
        >
          <div className="space-y-4">
            {gates.gates.map((gate) => (
              <div key={gate.gateName} className="rounded-lg border border-border-subtle bg-surface-elevated p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {gate.allPassed ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-danger" />
                    )}
                    <span className="text-sm font-medium text-text-primary">{gate.gateName}</span>
                    <Badge variant="muted">{gate.gateType}</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  {gate.criteria.map((criterion) => (
                    <div key={criterion.name} className="flex items-center gap-3">
                      <span className={cn("h-1.5 w-1.5 rounded-full", criterion.passed ? "bg-success" : "bg-danger")} />
                      <span className="min-w-0 flex-1 text-xs text-text-secondary">{criterion.description}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-mono", criterion.passed ? "text-success" : "text-danger")}>
                          {typeof criterion.currentValue === "number" && criterion.currentValue % 1 !== 0 ? criterion.currentValue.toFixed(2) : criterion.currentValue}
                        </span>
                        <span className="text-xs text-text-muted">-</span>
                        <span className="text-xs font-mono text-text-muted">
                          {typeof criterion.threshold === "number" && criterion.threshold % 1 !== 0 ? criterion.threshold.toFixed(2) : criterion.threshold}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-text-muted">{gate.recommendation}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>


      {openingReport && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Opening Curriculum Focus" subtitle="Opening families under pressure">
            <div className="space-y-3">
              {plan.openingFocuses.slice(0, 4).map((entry) => (
                <div key={`${entry.openingFamily}-${entry.theme}`} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">{entry.openingName}</p>
                    <Badge variant="warning">{entry.theme.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">Count {entry.count}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Detected Families" subtitle="Classified opening families">
            <div className="space-y-3">
              {openingReport.familySummaries.slice(0, 4).map((entry) => (
                <div key={entry.openingKey} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{entry.openingName}</p>
                  <p className="mt-1 text-xs text-text-muted">{entry.openingTags.join(", ")} · confidence {entry.averageConfidence.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
      {repertoireReview && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Repertoire Curriculum Focus" subtitle="Lines to stabilize before broadening scope">
            <div className="space-y-3">
              {plan.repertoireFocuses.slice(0, 4).map((entry) => (
                <div key={`${entry.repertoireKey}-${entry.lineName}`} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                    <Badge variant="warning">Priority {entry.reviewPriority.toFixed(2)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{entry.recommendedAction}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Transfer Metrics" subtitle="How well study is reaching real games">
            <div className="space-y-3">
              {repertoireTransfer?.repertoireBuckets.slice(0, 4).map((entry) => (
                <div key={entry.repertoireKey} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{entry.repertoireName}</p>
                  <p className="mt-1 text-xs text-text-muted">Score {entry.score.toFixed(2)} · in-book depth {entry.averageInBookDepth.toFixed(2)} · deviation {(entry.deviationRate * 100).toFixed(0)}%</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
      {repertoireTransferCoaching && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Transfer Repair Plan" subtitle="Fragile lines to stabilize before expansion">
            <div className="space-y-3">
              {plan.repertoireTransferFocuses.slice(0, 4).map((entry) => (
                <div key={`${entry.repertoireKey}-${entry.lineName}`} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                    <Badge variant="warning">Urgency {entry.urgency.toFixed(2)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{entry.recommendedReviewLine}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="First Bad Moments" subtitle="Where the repertoire actually starts to fail">
            <div className="space-y-3">
              {repertoireTransferCoaching.fragileLines.slice(0, 4).map((entry) => (
                <div key={entry.lineId} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    Ply {entry.firstBadMomentPly ?? "?"}{entry.firstBadMomentMove ? ` with ${entry.firstBadMomentMove}` : ""}: {entry.firstBadMomentReason}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
      {repertoireDrillMemory && repertoireDrillQueue && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Drill Memory Plan" subtitle="Which repertoire lines need spaced review next">
            <div className="space-y-3">
              {plan.repertoireDrillFocuses.slice(0, 4).map((entry) => (
                <div key={entry.lineId} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                    <Badge variant="warning">Urgency {entry.urgency.toFixed(2)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{entry.recommendedAction}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Stable Drill Lines" subtitle="Lines you can safely deprioritize for now">
            <div className="space-y-3">
              {repertoireDrillQueue.strongestLines.slice(0, 4).map((entry) => (
                <div key={entry.lineId} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                  <p className="mt-1 text-xs text-text-muted">Recall confidence {Math.round(entry.recallConfidence * 100)}% · stability {Math.round(entry.stabilityScore * 100)}%</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
      {repertoireRepair && repertoireRepairQueue && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Repair Queue Plan" subtitle="Imported games to convert into exact line repair">
            <div className="space-y-3">
              {plan.repertoireRepairFocuses.slice(0, 4).map((entry) => (
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

          <SectionCard title="Games Needing Repair" subtitle="Urgent imported-game failures behind the plan">
            <div className="space-y-3">
              {repertoireRepairQueue.urgentGames.slice(0, 4).map((entry) => (
                <div key={`${entry.sourceGameId}-${entry.lineName}`} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                  <p className="mt-1 text-xs text-text-muted">Game {entry.sourceGameId} · urgency {entry.urgencyScore.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
      {repertoireRepairOutcomes && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Repair Outcome Plan" subtitle="Repairs that proved out vs lines still under pressure">
            <div className="space-y-3">
              {repertoireRepairOutcomes.nextActions.slice(0, 4).map((entry) => (
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

          <SectionCard title="Repairs That Worked" subtitle="Lines that can cool slightly">
            <div className="space-y-3">
              {repertoireRepairOutcomes.repairsThatWorked.slice(0, 4).map((entry) => (
                <div key={entry.repairId} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                  <p className="mt-1 text-xs text-text-muted">{entry.outcomeReason}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
      {conceptState && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Concept Sequence" subtitle="Curriculum concept order">
            <div className="space-y-3">
              {plan.conceptSequence.slice(0, 4).map((entry) => (
                <div key={`${entry.sessionIndex}-${entry.conceptKey}`} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">Session {entry.sessionIndex + 1}: {entry.conceptName}</p>
                    <Badge variant="accent">{entry.conceptKey}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{entry.rationale}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Cluster Pressure" subtitle="Concept groups needing reinforcement">
            <div className="space-y-3">
              {conceptState.clusterWeaknesses.slice(0, 4).map((cluster) => (
                <div key={cluster.cluster} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">{cluster.cluster}</p>
                    <Badge variant="warning">Priority {cluster.averageReviewPriority.toFixed(2)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{cluster.concepts.join(", ")}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      <SectionCard title="Session Roadmap" subtitle={`${plan.sessionCount} planned sessions`}>
        <div className="space-y-3">
          {plan.sessions.map((session) => (
            <div key={session.sessionIndex} className="rounded-lg border border-border-subtle bg-surface-elevated p-4 transition-colors hover:border-border">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-muted text-xs font-bold text-accent">
                    {session.sessionIndex + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{formatCategory(session.focusCategory)}</span>
                      {session.secondaryCategory && (
                        <>
                          <ArrowRight className="h-3 w-3 text-text-muted" />
                          <span className="text-xs text-text-secondary">{formatCategory(session.secondaryCategory)}</span>
                        </>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">{session.rationale}</p>
                  </div>
                </div>
                <Badge variant={themeBadgeVariant(session.theme)}>{themeLabel(session.theme)}</Badge>
              </div>

              <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
                <span>
                  <BookOpen className="mr-1 inline h-3 w-3" />
                  {session.exerciseQuota.total} exercises
                </span>
                <span className="text-text-muted">-</span>
                <span>{session.exerciseQuota.reviewSlots} review</span>
                <span className="text-text-muted">-</span>
                <span>{session.exerciseQuota.freshSlots} fresh</span>
                <span className="text-text-muted">-</span>
                <span>
                  E{session.difficultyMix.easy}/M{session.difficultyMix.medium}/H{session.difficultyMix.hard}
                </span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}












