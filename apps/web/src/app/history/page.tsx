import Link from "next/link";
import {
  loadAllSessions,
  loadAllSessionResults,
  loadSessionHistory,
} from "@/lib/artifacts";
import { buildProgressReport } from "@/lib/progress-engine";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { ProgressChart } from "@/components/charts/progress-chart";
import { ThemeTrendChart } from "@/components/charts/theme-trend-chart";
import { ImprovementReport } from "@/components/progress/improvement-report";
import { formatCategory, formatDateTime, formatPercent } from "@/lib/utils";
import { Clock, Trophy, BarChart3, Target } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const [sessions, resultsMap, history] = await Promise.all([
    loadAllSessions(),
    loadAllSessionResults(),
    loadSessionHistory(),
  ]);
  const report = buildProgressReport({ sessions, resultsMap });

  if (history.length === 0 || report.sessions.length === 0) {
    return (
      <>
        <PageHeader title="History" subtitle="Your completed study sessions" />
        <EmptyState
          icon={<Clock className="h-10 w-10" />}
          title="No completed sessions yet"
          description="Complete a study session to see your history here. Go to Sessions to start one."
          action={
            <Link
              href="/sessions"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              Browse Sessions
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="History"
        subtitle={`${report.summary.sessionCount} completed sessions`}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Completed Sessions"
          value={report.summary.sessionCount}
          icon={<Clock className="h-4 w-4" />}
        />
        <MetricCard
          label="Average Accuracy"
          value={formatPercent(report.summary.averageAccuracy)}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <MetricCard
          label="Latest Accuracy"
          value={formatPercent(report.summary.latestAccuracy ?? 0)}
          icon={<Trophy className="h-4 w-4" />}
        />
        <MetricCard
          label="Exercises Solved"
          value={report.summary.totalExercises}
          icon={<Target className="h-4 w-4" />}
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="Accuracy Over Time">
          <ProgressChart sessions={report.sessionTrend} />
        </SectionCard>
        <SectionCard title="Theme Accuracy Over Time">
          <ThemeTrendChart
            themes={report.themeTrend.themes}
            points={report.themeTrend.points}
          />
        </SectionCard>
      </div>

      <div className="mb-6">
        <ImprovementReport report={report} />
      </div>

      <SectionCard
        title="Completed Sessions"
        subtitle="Open any run to replay it move by move"
      >
        <DataTable
          data={report.sessions}
          keyFn={(row) => row.sessionId}
          columns={[
            {
              key: "date",
              header: "Date",
              render: (row) => (
                <Link
                  href={`/history/session/${row.sessionId}`}
                  className="font-medium text-text-primary hover:text-accent"
                >
                  {formatDateTime(row.completedAt)}
                </Link>
              ),
            },
            {
              key: "theme",
              header: "Theme",
              render: (row) => (
                <Badge variant="muted">{formatCategory(row.theme)}</Badge>
              ),
            },
            {
              key: "accuracy",
              header: "Accuracy",
              render: (row) => formatPercent(row.accuracy),
              align: "right",
            },
            {
              key: "count",
              header: "Exercise Count",
              render: (row) => row.exerciseCount,
              align: "right",
            },
            {
              key: "difficulty",
              header: "Difficulty",
              render: (row) => <Badge variant="accent">{row.difficulty}</Badge>,
              align: "center",
            },
          ]}
        />
      </SectionCard>
    </>
  );
}
