import {
  loadReviewQueue,
  loadExerciseProgress,
  exerciseCorpusExists,
  deriveReadiness,
} from "@/lib/artifacts";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { RefreshInsightsButton } from "@/components/ui/refresh-insights-button";
import { MasteryBadge, GradingBadge, Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { formatRelativeDate, formatDate } from "@/lib/utils";
import Link from "next/link";
import { RefreshCw, AlertTriangle, Clock, Shield, ArrowRight } from "lucide-react";
import type { ReviewQueueEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

function urgencyColor(urgency: number): string {
  if (urgency >= 0.8) return "text-danger";
  if (urgency >= 0.5) return "text-warning";
  return "text-text-secondary";
}

function reasonBadge(reason: string) {
  switch (reason) {
    case "overdue":
      return <Badge variant="danger">Overdue</Badge>;
    case "due_soon":
      return <Badge variant="warning">Due Soon</Badge>;
    case "unstable":
      return <Badge variant="info">Unstable</Badge>;
    default:
      return <Badge variant="muted">{reason}</Badge>;
  }
}

export default async function ReviewPage() {
  const queue = await loadReviewQueue();

  if (!queue) {
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
        <PageHeader title="Review Queue" subtitle="Exercises due for review" />
        <EmptyState
          icon={<RefreshCw className="h-10 w-10" />}
          title="No review queue yet"
          description={
            readiness.canRefreshInsights
              ? "Refresh insights to build your review queue."
              : readiness.canStudy
                ? "Complete a study session first to populate the review queue."
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

  const overdue = queue.entries.filter((e) => e.reason === "overdue");
  const dueSoon = queue.entries.filter((e) => e.reason === "due_soon");
  const unstable = queue.entries.filter((e) => e.reason === "unstable");

  const columns = [
    {
      key: "exerciseId",
      header: "Exercise",
      render: (r: ReviewQueueEntry) => (
        <span className="font-mono text-xs text-text-primary">{r.exerciseId}</span>
      ),
    },
    {
      key: "mastery",
      header: "Mastery",
      render: (r: ReviewQueueEntry) => <MasteryBadge state={r.masteryState} />,
    },
    {
      key: "urgency",
      header: "Urgency",
      align: "right" as const,
      render: (r: ReviewQueueEntry) => (
        <span className={`font-mono text-xs font-semibold ${urgencyColor(r.reviewUrgency)}`}>
          {r.reviewUrgency.toFixed(2)}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      render: (r: ReviewQueueEntry) => reasonBadge(r.reason),
    },
    {
      key: "lastGrade",
      header: "Last Grade",
      render: (r: ReviewQueueEntry) =>
        r.lastGradingTier ? (
          <GradingBadge tier={r.lastGradingTier} />
        ) : (
          <span className="text-xs text-text-muted">—</span>
        ),
    },
    {
      key: "quality",
      header: "Quality",
      align: "right" as const,
      render: (r: ReviewQueueEntry) => (
        <span className="text-xs text-text-secondary">
          {(r.rollingQualityScore ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: "interval",
      header: "Interval",
      align: "right" as const,
      render: (r: ReviewQueueEntry) => (
        <span className="text-xs text-text-muted">{r.intervalDays}d</span>
      ),
    },
    {
      key: "nextReview",
      header: "Due",
      render: (r: ReviewQueueEntry) => (
        <span className="text-xs text-text-muted">{formatDate(r.nextReviewAt)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Review Queue"
        subtitle={`${queue.totalEntries} exercises ready for review · Updated ${formatRelativeDate(queue.generatedAt)}`}
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <MetricCard
          label="Overdue"
          value={overdue.length}
          icon={<AlertTriangle className="h-4 w-4" />}
          subtitle="Needs immediate attention"
        />
        <MetricCard
          label="Due Soon"
          value={dueSoon.length}
          icon={<Clock className="h-4 w-4" />}
          subtitle="Coming up for review"
        />
        <MetricCard
          label="Unstable"
          value={unstable.length}
          icon={<Shield className="h-4 w-4" />}
          subtitle="Inconsistent performance"
        />
      </div>

      <SectionCard
        title="All Review Items"
        subtitle={`Sorted by urgency (highest first)`}
        noPadding
      >
        <DataTable
          columns={columns}
          data={queue.entries}
          keyFn={(r) => r.exerciseId}
          compact
        />
      </SectionCard>
    </>
  );
}
