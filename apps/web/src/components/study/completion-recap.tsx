"use client";

import { useState, useTransition } from "react";
import { cn, formatCategory, formatPercent } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { SegmentedBar } from "@/components/ui/progress-bar";
import { refreshInsights } from "@/app/actions/generation";
import {
  Trophy,
  Target,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  Eye,
  Brain,
  History,
} from "lucide-react";
import Link from "next/link";
import type {
  AdaptiveDifficultyPlan,
  CompletionResult,
  SessionCoachingFeedback,
} from "@/lib/study-types";

interface CompletionRecapProps {
  result: CompletionResult;
  exerciseTypes?: Array<{ exerciseType: string; isCorrect: boolean }>;
  coachingSummary?: SessionCoachingFeedback;
}

const TYPE_ICONS: Record<string, typeof Target> = {
  tactical: Target,
  recall: Eye,
  visualization: Brain,
  reconstruction: History,
};

const TYPE_LABELS: Record<string, string> = {
  tactical: "Tactical",
  recall: "Recall",
  visualization: "Visualization",
  reconstruction: "Reconstruction",
};

function adaptiveCopy(plan: AdaptiveDifficultyPlan): string {
  if (plan.themeDifficulty === "stretch") {
    return `Increase depth to ${plan.exerciseDepth} ply and stretch the next theme.`;
  }
  if (plan.themeDifficulty === "reinforce") {
    return `Reduce depth to ${plan.exerciseDepth} ply and reinforce the core motif first.`;
  }
  return `Hold depth at ${plan.exerciseDepth} ply and keep the current theme stable.`;
}

export function CompletionRecap({
  result,
  exerciseTypes,
  coachingSummary,
}: CompletionRecapProps) {
  const [refreshPending, startRefreshTransition] = useTransition();
  const [refreshDone, setRefreshDone] = useState(false);

  const handleRefresh = () => {
    startRefreshTransition(async () => {
      const res = await refreshInsights();
      if (res.success) setRefreshDone(true);
    });
  };

  const accuracy = result.accuracy;
  const isGood = accuracy >= 0.7;
  const isOk = accuracy >= 0.4;

  const tierColors: Record<string, string> = {
    exact: "bg-success",
    acceptable: "bg-info",
    inaccuracy: "bg-warning",
    mistake: "bg-danger",
    blunder: "bg-red-700",
  };

  const segments = Object.entries(result.gradeDistribution)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      value,
      color: tierColors[key] || "bg-surface-hover",
      label: key,
    }));

  const changedMastery = result.masteryChanges.filter((m) => m.changed);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div
        className={cn(
          "rounded-xl border p-8 text-center",
          isGood
            ? "border-success/20 bg-success-muted"
            : isOk
              ? "border-warning/20 bg-warning-muted"
              : "border-danger/20 bg-danger-muted"
        )}
      >
        <Trophy
          className={cn(
            "mx-auto h-10 w-10",
            isGood ? "text-success" : isOk ? "text-warning" : "text-danger"
          )}
        />
        <h2 className="mt-3 text-2xl font-bold text-text-primary">
          Session Complete
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {result.correctCount} of {result.totalExercises} correct
        </p>
        <p
          className={cn(
            "mt-2 text-3xl font-bold",
            isGood ? "text-success" : isOk ? "text-warning" : "text-danger"
          )}
        >
          {formatPercent(accuracy)}
        </p>
      </div>

      {coachingSummary && (
        <SectionCard
          title="Session Feedback"
          subtitle={`Today's focus: ${coachingSummary.todaysFocus}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-surface px-4 py-3">
                <p className="text-xs text-text-muted">Correct</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">
                  {coachingSummary.correct}
                </p>
              </div>
              <div className="rounded-lg bg-surface px-4 py-3">
                <p className="text-xs text-text-muted">Incorrect</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">
                  {coachingSummary.incorrect}
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-lg bg-surface px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Themes improved
              </p>
              <p className="text-sm text-text-primary">
                {coachingSummary.themesImproved.join(", ") ||
                  "No theme stood out yet."}
              </p>
            </div>

            <div className="space-y-2 rounded-lg bg-surface px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Themes struggling
              </p>
              <p className="text-sm text-text-primary">
                {coachingSummary.themesStruggling.join(", ") ||
                  "No major recurring struggle in this session."}
              </p>
            </div>

            <div className="rounded-lg border border-warning/20 bg-warning-muted px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Recurring weakness
              </p>
              <p className="mt-1 text-sm text-text-primary">
                {coachingSummary.recurringWeakness ??
                  "No single weakness dominated this run."}
              </p>
              <p className="mt-2 text-sm text-text-primary">
                Recommended next session: {coachingSummary.recommendedNextSession}
              </p>
            </div>

            <div className="rounded-lg border border-accent/20 bg-accent-muted/40 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Adaptive plan
              </p>
              <p className="mt-1 text-sm text-text-primary">
                {adaptiveCopy(coachingSummary.adaptivePlan)}
              </p>
              <p className="mt-2 text-xs text-text-secondary">
                {coachingSummary.adaptivePlan.rationale}
              </p>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Grade Distribution">
        <SegmentedBar segments={segments} total={result.totalExercises} />
        <div className="mt-3 flex flex-wrap gap-3">
          {Object.entries(result.gradeDistribution)
            .filter(([, v]) => v > 0)
            .map(([tier, count]) => (
              <div key={tier} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    tierColors[tier] || "bg-surface-hover"
                  )}
                />
                <span className="text-xs capitalize text-text-secondary">
                  {tier}
                </span>
                <span className="text-xs font-medium text-text-primary">
                  {count}
                </span>
              </div>
            ))}
        </div>
      </SectionCard>

      {exerciseTypes && exerciseTypes.length > 0 && (() => {
        const types = new Set(exerciseTypes.map((e) => e.exerciseType));
        if (types.size <= 1) return null;

        const typeStats = Array.from(types).map((type) => {
          const ofType = exerciseTypes.filter((e) => e.exerciseType === type);
          const correct = ofType.filter((e) => e.isCorrect).length;
          return {
            type,
            total: ofType.length,
            correct,
            accuracy: ofType.length > 0 ? correct / ofType.length : 0,
          };
        });

        return (
          <SectionCard title="By Exercise Type">
            <div className="grid grid-cols-2 gap-3">
              {typeStats.map(({ type, total, correct, accuracy: acc }) => {
                const Icon = TYPE_ICONS[type] ?? Target;
                return (
                  <div
                    key={type}
                    className="flex items-center justify-between rounded-lg bg-surface px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-text-muted" />
                      <span className="text-sm text-text-primary">
                        {TYPE_LABELS[type] ?? type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">
                        {correct}/{total}
                      </span>
                      <Badge
                        variant={
                          acc >= 0.7 ? "accent" : acc >= 0.4 ? "warning" : "danger"
                        }
                      >
                        {formatPercent(acc)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        );
      })()}

      {result.evalLossStats.average !== null && (
        <SectionCard title="Evaluation Loss">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-text-muted">Average</p>
              <p className="mt-0.5 font-mono text-lg font-semibold text-text-primary">
                {result.evalLossStats.average?.toFixed(0) ?? "-"}cp
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted">Median</p>
              <p className="mt-0.5 font-mono text-lg font-semibold text-text-primary">
                {result.evalLossStats.median?.toFixed(0) ?? "-"}cp
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted">Worst</p>
              <p className="mt-0.5 font-mono text-lg font-semibold text-danger">
                {result.evalLossStats.max?.toFixed(0) ?? "-"}cp
              </p>
            </div>
          </div>
        </SectionCard>
      )}

      {result.hardestMissed.length > 0 && (
        <SectionCard title="Hardest Misses" subtitle="Exercises to revisit">
          <div className="space-y-2">
            {result.hardestMissed.map((miss) => (
              <div
                key={miss.exerciseId}
                className="flex items-center justify-between rounded-lg bg-surface px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="h-4 w-4 text-danger" />
                  <div>
                    <span className="text-sm text-text-primary">
                      #{miss.exerciseIndex + 1}
                    </span>
                    <span className="ml-2 text-xs text-text-muted">
                      {formatCategory(miss.lessonCategory)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-danger">{miss.userMove}</span>
                  <ArrowRight className="h-3 w-3 text-text-muted" />
                  <span className="text-success">{miss.engineMove}</span>
                  {miss.evalLossCp !== null && (
                    <span className="text-text-muted">{miss.evalLossCp}cp</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {changedMastery.length > 0 && (
        <SectionCard title="Mastery Changes">
          <div className="space-y-2">
            {changedMastery.map((m) => (
              <div
                key={m.exerciseId}
                className="flex items-center justify-between rounded-lg bg-surface px-4 py-3"
              >
                <span className="font-mono text-xs text-text-primary">
                  {m.exerciseId}
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="muted">{m.before}</Badge>
                  <ArrowRight className="h-3 w-3 text-text-muted" />
                  <Badge variant="accent">{m.after}</Badge>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <div className="flex gap-3">
        <Link
          href="/"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
        >
          <Target className="h-4 w-4" />
          Dashboard
        </Link>
        <Link
          href="/history"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
        >
          <Clock className="h-4 w-4" />
          History
        </Link>
        <Link
          href="/coach"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
        >
          <TrendingUp className="h-4 w-4" />
          Coach
        </Link>
        <button
          onClick={handleRefresh}
          disabled={refreshPending || refreshDone}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-accent/30 bg-surface px-4 py-3 text-sm font-medium text-accent transition-colors hover:bg-accent-muted disabled:opacity-50"
        >
          {refreshPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : refreshDone ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {refreshPending
            ? "Refreshing..."
            : refreshDone
              ? "Updated"
              : "Refresh Insights"}
        </button>
        <Link
          href="/sessions"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <ArrowRight className="h-4 w-4" />
          Next Session
        </Link>
      </div>
    </div>
  );
}

