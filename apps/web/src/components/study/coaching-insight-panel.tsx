"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/utils";
import type {
  AdaptiveDifficultyPlan,
  MoveCoachingInsight,
} from "@/lib/study-types";

interface CoachingInsightPanelProps {
  coaching: MoveCoachingInsight;
  adaptivePlan: AdaptiveDifficultyPlan;
}

const difficultyVariant = {
  reinforce: "warning",
  steady: "muted",
  stretch: "accent",
} as const;

export function CoachingInsightPanel({
  coaching,
  adaptivePlan,
}: CoachingInsightPanelProps) {
  const [hintLevel, setHintLevel] = useState(0);

  useEffect(() => {
    setHintLevel(0);
  }, [coaching.explanation, coaching.pattern]);

  const nextHintLabel =
    hintLevel === 0
      ? "Reveal Hint 1"
      : hintLevel === 1
        ? "Reveal Hint 2"
        : "All hints shown";

  return (
    <SectionCard title="Coaching Insight" className="border-accent/20">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">{coaching.pattern}</Badge>
            <Badge variant={difficultyVariant[adaptivePlan.themeDifficulty]}>
              {adaptivePlan.themeDifficulty === "reinforce"
                ? "Ease theme difficulty"
                : adaptivePlan.themeDifficulty === "stretch"
                  ? "Increase theme difficulty"
                  : "Hold theme difficulty"}
            </Badge>
          </div>
          <p className="text-sm text-text-primary">{coaching.explanation}</p>
        </div>

        <div className="rounded-lg bg-surface-elevated px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-text-muted">
            Improvement tip
          </p>
          <p className="mt-1 text-sm text-text-primary">
            {coaching.improvement_tip}
          </p>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-text-muted">
                Hints
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Reveal them progressively if you want a nudge without spoiling the full idea.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHintLevel((current) => Math.min(current + 1, 2))}
              disabled={hintLevel >= 2}
              className={cn(
                "rounded-lg border border-accent/30 px-3 py-2 text-xs font-medium text-accent transition-colors",
                hintLevel >= 2
                  ? "cursor-not-allowed opacity-50"
                  : "hover:bg-accent-muted"
              )}
            >
              {nextHintLabel}
            </button>
          </div>

          {hintLevel >= 1 && (
            <p className="mt-3 text-sm text-text-primary">{coaching.hint1}</p>
          )}
          {hintLevel >= 2 && (
            <p className="mt-2 border-t border-border-subtle pt-2 text-sm text-text-primary">
              {coaching.hint2}
            </p>
          )}
        </div>

        <div className="rounded-lg bg-surface-elevated px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-text-muted">
            Adaptive difficulty
          </p>
          <p className="mt-1 text-sm text-text-primary">{adaptivePlan.rationale}</p>
          <p className="mt-2 text-xs text-text-secondary">
            Depth target: {adaptivePlan.exerciseDepth} ply. {adaptivePlan.nextFocus}
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

