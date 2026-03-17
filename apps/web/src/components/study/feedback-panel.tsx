import { cn } from "@/lib/utils";
import { CoachingInsightPanel } from "./coaching-insight-panel";
import { CheckCircle, XCircle, AlertTriangle, ArrowRight } from "lucide-react";
import type {
  AdaptiveDifficultyPlan,
  GradeResult,
  MoveCoachingInsight,
} from "@/lib/study-types";

interface FeedbackPanelProps {
  result: GradeResult;
  onContinue: () => void;
  coaching?: MoveCoachingInsight;
  adaptivePlan?: AdaptiveDifficultyPlan;
}

const tierConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: "check" | "warn" | "x" }
> = {
  exact: { label: "Exact Match", color: "text-success", bgColor: "bg-success-muted border-success/20", icon: "check" },
  acceptable: { label: "Acceptable", color: "text-info", bgColor: "bg-info-muted border-info/20", icon: "check" },
  inaccuracy: { label: "Inaccuracy", color: "text-warning", bgColor: "bg-warning-muted border-warning/20", icon: "warn" },
  mistake: { label: "Mistake", color: "text-danger", bgColor: "bg-danger-muted border-danger/20", icon: "x" },
  blunder: { label: "Blunder", color: "text-danger", bgColor: "bg-danger-muted border-danger/20", icon: "x" },
};

export function FeedbackPanel({
  result,
  onContinue,
  coaching,
  adaptivePlan,
}: FeedbackPanelProps) {
  if (!result.attempt) return null;
  const { attempt } = result;
  const config = tierConfig[attempt.gradingTier] ?? tierConfig.inaccuracy;

  const IconComponent =
    config.icon === "check"
      ? CheckCircle
      : config.icon === "warn"
        ? AlertTriangle
        : XCircle;

  return (
    <div className={cn("rounded-xl border p-5", config.bgColor)}>
      <div className="flex items-center gap-2">
        <IconComponent className={cn("h-5 w-5", config.color)} />
        <span className={cn("text-sm font-semibold", config.color)}>
          {config.label}
        </span>
        {attempt.evalLossCp !== null && attempt.evalLossCp > 0 && (
          <span className="text-xs text-text-muted">
            ({attempt.evalLossCp}cp loss)
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="rounded-lg bg-surface px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Your move</p>
          <p className={cn("mt-0.5 font-mono text-sm font-semibold", attempt.isCorrect ? "text-success" : "text-text-primary")}>
            {attempt.userMove}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-text-muted" />
        <div className="rounded-lg bg-surface px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Best move</p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-success">
            {attempt.engineMove}
          </p>
        </div>
      </div>

      {coaching && adaptivePlan && (
        <div className="mt-4">
          <CoachingInsightPanel coaching={coaching} adaptivePlan={adaptivePlan} />
        </div>
      )}

      <button
        onClick={onContinue}
        className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface"
      >
        Continue
      </button>
    </div>
  );
}

export function InvalidMoveBanner({
  error,
  onDismiss,
}: {
  error: string;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-lg border border-danger/20 bg-danger-muted px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-danger" />
          <span className="text-sm text-danger">{error}</span>
        </div>
        <button
          onClick={onDismiss}
          className="text-xs text-text-muted hover:text-text-secondary"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

