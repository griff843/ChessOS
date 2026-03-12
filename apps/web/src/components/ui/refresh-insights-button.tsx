"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshInsights } from "@/app/actions/generation";
import { RefreshCw, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

export function RefreshInsightsButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleClick = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await refreshInsights();
      if (res.success) {
        setFeedback({ type: "success", message: "Insights generated!" });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error ?? "Unknown error" });
      }
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        {pending ? "Generating..." : "Refresh Insights"}
      </button>
      {feedback && (
        <div className="flex items-center gap-1.5">
          {feedback.type === "success" ? (
            <CheckCircle className="h-3.5 w-3.5 text-success" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-danger" />
          )}
          <span
            className={`text-xs ${feedback.type === "success" ? "text-success" : "text-danger"}`}
          >
            {feedback.message}
          </span>
        </div>
      )}
    </div>
  );
}
