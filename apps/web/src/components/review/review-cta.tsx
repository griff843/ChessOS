"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateNewSession } from "@/app/actions/generation";
import { Loader2, Dumbbell, CheckCircle, AlertTriangle } from "lucide-react";

export function ReviewCTA() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleClick = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await generateNewSession("hero");
      if (result.success && result.sessionId) {
        router.push(`/sessions/${result.sessionId}`);
      } else {
        setFeedback({
          type: "error",
          message: result.error ?? "Failed to generate session",
        });
      }
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Dumbbell className="h-4 w-4" />
        )}
        {pending ? "Generating Session..." : "Train This Weakness"}
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
