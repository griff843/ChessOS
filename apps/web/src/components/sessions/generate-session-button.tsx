"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateNewSession } from "@/app/actions/generation";
import { Plus, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

interface GenerateSessionButtonProps {
  hasExercises: boolean;
}

export function GenerateSessionButton({
  hasExercises,
}: GenerateSessionButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleClick = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await generateNewSession();
      if (result.success && result.sessionId) {
        setFeedback({
          type: "success",
          message: `${result.sessionId.slice(0, 20)} (${result.exerciseCount} exercises)`,
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: result.error ?? "Unknown error",
        });
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
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
      <button
        onClick={handleClick}
        disabled={!hasExercises || pending}
        className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        title={
          !hasExercises
            ? "Generate exercises first: pnpm --filter worker run generate-exercises"
            : undefined
        }
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {pending ? "Generating..." : "New Session"}
      </button>
    </div>
  );
}
