import { loadAllSessions, loadAllSessionResults, exerciseCorpusExists } from "@/lib/artifacts";
import { GenerateSessionButton } from "@/components/sessions/generate-session-button";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge, DifficultyBadge } from "@/components/ui/badge";
import { TrainingWorkflowGuide } from "@/components/onboarding/training-workflow-guide";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatCategory, formatRelativeDate, formatPercent } from "@/lib/utils";
import { deriveSessionLabel } from "@/lib/session-label";
import { Play, BookOpen, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const [sessions, resultsMap, hasExercises] = await Promise.all([
    loadAllSessions(),
    loadAllSessionResults(),
    exerciseCorpusExists(),
  ]);

  const readiness = {
    pipelineReady: hasExercises,
    progressReady: resultsMap.size > 0,
    insightsReady: false,
    canStudy: hasExercises,
    canRefreshInsights: resultsMap.size > 0,
  };

  if (sessions.length === 0) {
    return (
      <>
        <PageHeader
          title="Study Sessions"
          subtitle="Launch and review study sessions"
          action={<GenerateSessionButton hasExercises={hasExercises} />}
        />
        <div className="mt-6">
          <TrainingWorkflowGuide readiness={readiness} />
        </div>
        <EmptyState
          icon={<Play className="h-10 w-10" />}
          title="No sessions generated yet"
          description={
            hasExercises
              ? 'Click "New Session" above to generate your first study session.'
              : "Chess OS cannot generate sessions until the PGN analysis pipeline has produced training exercises."
          }
        />
      </>
    );
  }

  const completedSessions = sessions.filter((s) => resultsMap.has(s.sessionId));
  const pendingSessions = sessions.filter((s) => !resultsMap.has(s.sessionId));
  const sortedCompletedSessions = [...completedSessions].sort(
    (a, b) =>
      new Date(resultsMap.get(b.sessionId)!.completedAt).getTime() -
      new Date(resultsMap.get(a.sessionId)!.completedAt).getTime()
  );
  const latestCompletedAt = sortedCompletedSessions[0]
    ? resultsMap.get(sortedCompletedSessions[0].sessionId)!.completedAt
    : null;

  return (
    <>
      <PageHeader
        title="Study Sessions"
        subtitle={`${sessions.length} sessions · ${completedSessions.length} completed`}
        action={<GenerateSessionButton hasExercises={hasExercises} />}
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <MetricCard
          label="Total Sessions"
          value={sessions.length}
          icon={<BookOpen className="h-4 w-4" />}
        />
        <MetricCard
          label="Completed"
          value={completedSessions.length}
          icon={<CheckCircle className="h-4 w-4" />}
          subtitle={
            latestCompletedAt ? `Last: ${formatRelativeDate(latestCompletedAt)}` : undefined
          }
        />
        <MetricCard
          label="Pending"
          value={pendingSessions.length}
          icon={<Clock className="h-4 w-4" />}
          subtitle="Ready to study"
        />
      </div>

      {/* Pending sessions — ready to launch */}
      {pendingSessions.length > 0 && (
        <div className="mb-6">
          <SectionCard title="Ready to Study" subtitle="Sessions awaiting completion">
            <div className="space-y-3">
              {pendingSessions.map((session) => (
                <Link
                  key={session.sessionId}
                  href={`/study/${session.sessionId}`}
                  className="block rounded-lg border border-border-subtle bg-surface-elevated p-4 transition-colors hover:border-accent/30 hover:bg-surface-hover"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-accent" />
                        <span className="text-sm font-medium text-text-primary">
                          {deriveSessionLabel(session)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-text-muted">
                        Created {formatRelativeDate(session.createdAt)} · {session.exerciseCount} exercises
                      </p>
                    </div>
                    <Badge variant="accent">Study Now</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(session.metadata.categoryDistribution).map(([cat, count]) => (
                      <Badge key={cat} variant="muted">
                        {formatCategory(cat)} ×{count}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="success">Easy {session.metadata.difficultyDistribution.easy}</Badge>
                    <Badge variant="warning">Med {session.metadata.difficultyDistribution.medium}</Badge>
                    <Badge variant="danger">Hard {session.metadata.difficultyDistribution.hard}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Completed sessions */}
      {completedSessions.length > 0 && (
        <SectionCard title="Completed Sessions" subtitle="Past study results">
          <div className="space-y-2">
            {sortedCompletedSessions.map((session) => {
                const results = resultsMap.get(session.sessionId)!;
                const correct = results.results?.filter((r) => r.result === "correct").length ?? 0;
                const total = results.results?.length ?? session.exerciseCount;
                const accuracy = total > 0 ? correct / total : 0;

                return (
                  <Link
                    key={session.sessionId}
                    href={`/sessions/${session.sessionId}`}
                    className="flex items-center justify-between rounded-lg bg-surface-elevated px-4 py-3 transition-colors hover:bg-surface-hover"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {deriveSessionLabel(session)}
                        </p>
                        <p className="text-xs text-text-muted">
                          {formatRelativeDate(results.completedAt)} · {total} exercises
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-text-secondary">
                        {correct}/{total}
                      </span>
                      <ProgressBar
                        value={accuracy * 100}
                        color={accuracy >= 0.7 ? "success" : accuracy >= 0.4 ? "warning" : "danger"}
                        className="w-24"
                      />
                      <span className="w-12 text-right text-sm font-medium text-text-primary">
                        {formatPercent(accuracy)}
                      </span>
                    </div>
                  </Link>
                );
              })}
          </div>
        </SectionCard>
      )}
    </>
  );
}




