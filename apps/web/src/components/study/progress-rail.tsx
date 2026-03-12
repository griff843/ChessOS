import { cn } from "@/lib/utils";
import type { GradeResult } from "@/lib/study-types";

interface ProgressRailProps {
  total: number;
  current: number;
  results: Array<GradeResult["attempt"]>;
}

export function ProgressRail({ total, current, results }: ProgressRailProps) {
  const correct = results.filter((r) => r?.isCorrect).length;
  const answered = results.filter((r) => r !== null).length;
  const accuracy = answered > 0 ? correct / answered : 0;

  return (
    <div className="space-y-3">
      {/* Dots rail */}
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => {
          const result = results[i];
          const isActive = i === current;
          return (
            <div
              key={i}
              className={cn(
                "h-2 flex-1 rounded-full transition-all duration-300",
                isActive
                  ? "bg-accent ring-1 ring-accent ring-offset-1 ring-offset-surface"
                  : result === null || result === undefined
                    ? "bg-surface-elevated"
                    : result.isCorrect
                      ? "bg-success"
                      : result.gradingTier === "acceptable"
                        ? "bg-info"
                        : "bg-danger"
              )}
            />
          );
        })}
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">
          {current + 1} / {total}
        </span>
        {answered > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-success">{correct} correct</span>
            <span className="text-text-muted">·</span>
            <span className="text-text-secondary">
              {(accuracy * 100).toFixed(0)}% accuracy
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface GradeDistributionProps {
  results: Array<GradeResult["attempt"]>;
}

export function GradeDistribution({ results }: GradeDistributionProps) {
  const answered = results.filter((r) => r !== null && r !== undefined);
  if (answered.length === 0) return null;

  const counts: Record<string, number> = {};
  for (const r of answered) {
    if (r) {
      counts[r.gradingTier] = (counts[r.gradingTier] || 0) + 1;
    }
  }

  const tiers = [
    { key: "exact", label: "Exact", color: "bg-success" },
    { key: "acceptable", label: "OK", color: "bg-info" },
    { key: "inaccuracy", label: "Inac.", color: "bg-warning" },
    { key: "mistake", label: "Mistake", color: "bg-danger" },
    { key: "blunder", label: "Blunder", color: "bg-danger" },
  ];

  return (
    <div className="flex items-center gap-2">
      {tiers
        .filter((t) => (counts[t.key] || 0) > 0)
        .map((t) => (
          <div key={t.key} className="flex items-center gap-1">
            <span className={cn("h-2 w-2 rounded-full", t.color)} />
            <span className="text-[11px] text-text-muted">
              {t.label} {counts[t.key]}
            </span>
          </div>
        ))}
    </div>
  );
}
