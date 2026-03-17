"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateNewSession, refreshInsights } from "@/app/actions/generation";
import { Plus, RefreshCw, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

export function SettingsActions() {
  const router = useRouter();
  const [sessionPending, startSessionTransition] = useTransition();
  const [insightsPending, startInsightsTransition] = useTransition();
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleGenerateSession = () => {
    setResult(null);
    startSessionTransition(async () => {
      const res = await generateNewSession();
      if (res.success) {
        setResult({
          type: "success",
          message: `Session ${res.sessionId?.slice(0, 20)} created (${res.exerciseCount} exercises)`,
        });
        router.refresh();
      } else {
        setResult({ type: "error", message: res.error ?? "Unknown error" });
      }
    });
  };

  const handleRefreshInsights = () => {
    setResult(null);
    startInsightsTransition(async () => {
      const res = await refreshInsights();
      if (res.success) {
        setResult({
          type: "success",
          message: "Dashboard, coach, and curriculum updated",
        });
        router.refresh();
      } else {
        setResult({ type: "error", message: res.error ?? "Unknown error" });
      }
    });
  };

  const anyPending = sessionPending || insightsPending;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <button
          onClick={handleGenerateSession}
          disabled={anyPending}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {sessionPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {sessionPending ? "Generating..." : "Generate Session"}
        </button>
        <button
          onClick={handleRefreshInsights}
          disabled={anyPending}
          className="flex items-center gap-2 rounded-lg border border-accent/30 bg-surface px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent-muted disabled:opacity-50"
        >
          {insightsPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {insightsPending ? "Refreshing..." : "Refresh Insights"}
        </button>
      </div>
      {result && (
        <div className="flex items-center gap-2 rounded-lg bg-surface-elevated px-4 py-2.5">
          {result.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-success" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-danger" />
          )}
          <span
            className={`text-xs ${result.type === "success" ? "text-success" : "text-danger"}`}
          >
            {result.message}
          </span>
        </div>
      )}
    </div>
  );
}
