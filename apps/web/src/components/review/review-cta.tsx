"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateNewSession } from "@/app/actions/generation";
import { Loader2, Dumbbell, CheckCircle, AlertTriangle } from "lucide-react";
import type {
  RepairTarget,
  EvidenceStatus,
  CoachingEmphasis,
  ReviewWeightingStrength,
} from "@/lib/types";

/**
 * Derive boost strength from coaching emphasis + evidence status.
 * Mirrors deriveEmphasisAwareBoostStrength from @chess-os/training
 * (inlined to avoid barrel-import fs issue in client components).
 */
function deriveBoostStrength(
  evidenceStatus: EvidenceStatus | null,
  emphasis: CoachingEmphasis | null | undefined
): ReviewWeightingStrength {
  switch (emphasis) {
    case "increase":
      return "strong";
    case "maintain":
      return "moderate";
    case "reduce":
      return "weak";
  }
  if (evidenceStatus === null) return "moderate";
  switch (evidenceStatus) {
    case "recurring":
    case "persistent":
      return "strong";
    case "emerging":
      return "moderate";
    case "isolated":
      return "weak";
    case "improving":
      return "none";
  }
}

export interface ReviewCTAProps {
  sourceGameId: string;
  primaryTarget: RepairTarget;
  secondaryTargets: RepairTarget[];
  evidenceStatus: EvidenceStatus | null;
  branchRepairMatched: boolean;
  coachingEmphasis?: CoachingEmphasis | null;
}

export function ReviewCTA({
  sourceGameId,
  primaryTarget,
  secondaryTargets,
  evidenceStatus,
  branchRepairMatched,
  coachingEmphasis,
}: ReviewCTAProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const targetBoostStrength = deriveBoostStrength(evidenceStatus, coachingEmphasis);
  const isTargeted = targetBoostStrength !== "none";

  const handleClick = () => {
    setFeedback(null);
    startTransition(async () => {
      const reviewRequest = isTargeted
        ? {
            sourceGameId,
            primaryTarget,
            secondaryTargets,
            evidenceStatus,
            branchRepairMatched,
            targetBoostStrength,
            coachingEmphasis: coachingEmphasis ?? null,
          }
        : null;
      const result = await generateNewSession("hero", reviewRequest);
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
        aria-label="Generate a targeted training session for this weakness"
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Dumbbell className="h-4 w-4" />
        )}
        {pending
          ? isTargeted
            ? "Generating Targeted Session..."
            : "Generating Session..."
          : "Train This Weakness"}
      </button>
      {isTargeted && !pending && (
        <span className="text-xs text-text-muted">
          Session will prioritize exercises matching your diagnosed weakness
        </span>
      )}
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
