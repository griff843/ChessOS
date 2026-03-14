import { loadSession, loadSessionResults } from "@/lib/artifacts";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge, DifficultyBadge } from "@/components/ui/badge";
import { formatCategory, formatRelativeDate, formatPercent } from "@/lib/utils";
import { deriveSessionLabel } from "@/lib/session-label";
import { Play, CheckCircle, XCircle, BookOpen } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const [session, results] = await Promise.all([
    loadSession(sessionId),
    loadSessionResults(sessionId),
  ]);

  if (!session) {
    return (
      <>
        <PageHeader title="Session" subtitle={sessionId} />
        <EmptyState
          icon={<BookOpen className="h-10 w-10" />}
          title="Session not found"
          description={`No session data found for ${sessionId}`}
          action={
            <Link href="/sessions" className="text-xs text-accent hover:underline">
              Back to sessions
            </Link>
          }
        />
      </>
    );
  }

  const resultMap = new Map(
    results?.results?.map((r) => [r.exerciseId, r]) ?? []
  );
  const isCompleted = !!results;

  return (
    <>
      <PageHeader
        title={deriveSessionLabel(session)}
        subtitle={`Created ${formatRelativeDate(session.createdAt)}${
          isCompleted ? ` · Completed ${formatRelativeDate(results.completedAt)}` : " · Not yet completed"
        } · ${session.exerciseCount} exercises`}
        action={
          <Link
            href="/sessions"
            className="text-xs text-text-secondary hover:text-text-primary"
          >
            ← All sessions
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-4 gap-4">
        <MetricCard
          label="Exercises"
          value={session.exerciseCount}
          icon={<BookOpen className="h-4 w-4" />}
        />
        <MetricCard
          label="Status"
          value={isCompleted ? "Completed" : "Pending"}
          icon={isCompleted ? <CheckCircle className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        />
        {isCompleted && results.summary && (
          <>
            <MetricCard
              label="Accuracy"
              value={formatPercent(results.summary.accuracy)}
            />
            <MetricCard
              label="Correct"
              value={`${results.summary.correctCount}/${results.summary.totalExercises}`}
            />
          </>
        )}
      </div>

      {!isCompleted && (
        <div className="mb-6 rounded-xl border border-accent/20 bg-accent-muted px-6 py-5 text-center">
          <Play className="mx-auto mb-2 h-8 w-8 text-accent" />
          <p className="text-sm font-medium text-text-primary">Ready to study</p>
          <Link
            href={`/study/${sessionId}`}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <Play className="h-4 w-4" />
            Start Study Session
          </Link>
        </div>
      )}

      <SectionCard
        title="Exercises"
        subtitle={`${session.exerciseCount} positions`}
        noPadding
      >
        <div className="divide-y divide-border-subtle/50">
          {session.exercises.map((ex, i) => {
            const result = resultMap.get(ex.exerciseId);
            return (
              <div
                key={ex.exerciseId}
                className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-surface-hover"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-surface-hover text-[11px] font-semibold text-text-muted">
                    {i + 1}
                  </span>
                  {result ? (
                    result.result === "correct" ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-danger" />
                    )
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-border" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-text-primary">
                        {ex.exerciseId}
                      </span>
                      <DifficultyBadge difficulty={ex.difficultyEstimate} />
                      <Badge variant="muted">{formatCategory(ex.lessonCategory)}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {ex.phase} · {ex.sideToMove} to move · played {ex.playedMoveSan} · best {ex.bestMoveSan}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span>risk {(ex.predictedRisk * 100).toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </>
  );
}
