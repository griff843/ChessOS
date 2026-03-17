"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateNewSession, refreshInsights } from "@/app/actions/generation";
import { Play, RefreshCw, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

interface DashboardHeroCtaProps {
  objectiveName?: string;
  canStudy: boolean;
}

export function DashboardHeroCta({ objectiveName, canStudy }: DashboardHeroCtaProps) {
  const router = useRouter();
  const [sessionPending, startSessionTransition] = useTransition();
  const [refreshPending, startRefreshTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleStartSession = () => {
    setFeedback(null);
    startSessionTransition(async () => {
      const result = await generateNewSession("hero");
      if (result.success && result.sessionId) {
        router.push(`/study/${result.sessionId}`);
      } else {
        setFeedback({
          type: "error",
          message: result.error ?? "Could not generate session",
        });
      }
    });
  };

  const handleRefreshInsights = () => {
    setFeedback(null);
    startRefreshTransition(async () => {
      const res = await refreshInsights();
      if (res.success) {
        setFeedback({ type: "success", message: "Insights updated" });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error ?? "Unknown error" });
      }
    });
  };

  const isPending = sessionPending || refreshPending;

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface-elevated px-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            {objectiveName ? `Continue your ${objectiveName} work` : "Ready to train?"}
          </h2>
          {objectiveName && (
            <p className="mt-1 text-xs text-text-muted">
              Targeting: <span className="font-medium text-text-secondary">{objectiveName}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshInsights}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-50"
            title="Refresh all coaching insights"
          >
            {refreshPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh Insights
          </button>
          <button
            onClick={handleStartSession}
            disabled={!canStudy || isPending}
            className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
            title={!canStudy ? "Import and analyze games first" : undefined}
          >
            {sessionPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {sessionPending ? "Generating..." : "Start Today's Session"}
          </button>
        </div>
      </div>
      {feedback && (
        <div className="mt-3 flex items-center gap-1.5">
          {feedback.type === "success" ? (
            <CheckCircle className="h-3.5 w-3.5 text-success" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-danger" />
          )}
          <span className={`text-xs ${feedback.type === "success" ? "text-success" : "text-danger"}`}>
            {feedback.message}
          </span>
        </div>
      )}
    </div>
  );
}
