import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { formatCategory, formatPercentRaw } from "@/lib/utils";
import type { ProgressReport } from "@/lib/progress-engine";

interface ImprovementReportProps {
  report: ProgressReport;
}

function deltaLabel(delta: number | null): string {
  if (delta === null) return "new";
  const pct = (delta * 100).toFixed(1);
  return `${delta >= 0 ? "+" : ""}${pct} pts`;
}

export function ImprovementReport({ report }: ImprovementReportProps) {
  return (
    <SectionCard
      title="Improvement Report"
      subtitle={
        report.recommendedNextTheme
          ? `Recommended next training theme: ${formatCategory(report.recommendedNextTheme)}`
          : "Complete more sessions to unlock a recommendation"
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-lg bg-surface px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Most improved themes
          </p>
          {report.topImprovements.length > 0 ? (
            report.topImprovements.map((theme) => (
              <div key={theme.theme} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {formatCategory(theme.theme)}
                  </p>
                  <p className="text-xs text-text-muted">
                    Current accuracy {formatPercentRaw(theme.accuracy * 100)}
                  </p>
                </div>
                <Badge variant="success">{deltaLabel(theme.delta)}</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-text-secondary">Need at least two sessions per theme to measure improvement.</p>
          )}
        </div>

        <div className="space-y-3 rounded-lg bg-surface px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Struggling themes
          </p>
          {report.topWeaknesses.length > 0 ? (
            report.topWeaknesses.map((theme) => (
              <div key={theme.theme} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {formatCategory(theme.theme)}
                  </p>
                  <p className="text-xs text-text-muted">
                    {theme.attempts} attempts tracked
                  </p>
                </div>
                <Badge variant="warning">
                  {formatPercentRaw(theme.accuracy * 100)}
                </Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-text-secondary">No weaknesses recorded yet.</p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

