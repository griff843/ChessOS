import Link from "next/link";
import { ArrowRight, Target, TrendingUp, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CoachOverview } from "@chess-os/training";

// ── Humanization maps ──────────────────────────────────────────────────

const TARGET_LABELS: Record<string, string> = {
  opening_line_recall: "Opening recall",
  opening_concept_understanding: "Opening concepts",
  calculation_discipline: "Calculation discipline",
  tactical_pattern_recognition: "Tactical patterns",
  candidate_move_generation: "Candidate moves",
  strategic_planning: "Strategic planning",
  time_management: "Time management",
  endgame_technique: "Endgame technique",
  practical_stabilization: "Practical stabilization",
};

const PERSISTENCE_LABELS: Record<string, string> = {
  persistent_despite_training: "Persisting despite training",
  improving_after_training: "Improving after training",
  recurring_no_training: "Recurring (no training yet)",
  recurring_limited_data: "Recurring (limited data)",
  emerging: "Emerging weakness",
  first_occurrence: "First occurrence",
};

const READINESS_BADGE: Record<
  string,
  { label: string; variant: "warning" | "info" | "success" | "muted" }
> = {
  repair: { label: "Repair Mode", variant: "warning" },
  consolidate: { label: "Consolidating", variant: "info" },
  expand: { label: "Ready to Expand", variant: "success" },
  insufficient_data: { label: "Gathering Data", variant: "muted" },
};

function humanizeTarget(target: string): string {
  return TARGET_LABELS[target] ?? target.replace(/_/g, " ");
}

function humanizeText(text: string): string {
  let result = text;
  for (const [id, label] of Object.entries(TARGET_LABELS)) {
    result = result.replace(new RegExp(`\\b${id}\\b`, "g"), label);
  }
  return result;
}

// ── Component ──────────────────────────────────────────────────────────

interface CoachOverviewPanelProps {
  overview: CoachOverview;
}

export function CoachOverviewPanel({ overview }: CoachOverviewPanelProps) {
  // Don't render when there's no data and no useful CTA
  if (
    overview.readiness === "insufficient_data" &&
    overview.nextAction.type === "monitor"
  ) {
    return null;
  }

  const badge = READINESS_BADGE[overview.readiness];

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface px-6 py-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <span className="text-xs font-medium text-text-muted">Coach Overview</span>
      </div>

      <div className="mt-4 space-y-3">
        {/* Primary focus */}
        {overview.primaryFocus && (
          <div className="flex items-start gap-2.5">
            <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" />
            <div>
              <span className="text-xs font-medium text-text-primary">
                {humanizeTarget(overview.primaryFocus.target)}
              </span>
              <span className="ml-1.5 text-xs text-text-muted">
                · {overview.primaryFocus.gamesAffected} game
                {overview.primaryFocus.gamesAffected !== 1 ? "s" : ""}
              </span>
              <p className="mt-0.5 text-[11px] text-text-muted">
                {PERSISTENCE_LABELS[overview.primaryFocus.persistenceState] ??
                  overview.primaryFocus.persistenceState.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        )}

        {/* Opening repair priority */}
        {overview.openingPriority && (
          <div className="flex items-start gap-2.5">
            <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-primary">
                {overview.openingPriority.lineName}
              </span>
              {overview.openingPriority.urgency === "immediate_repair" && (
                <Badge variant="warning">Urgent</Badge>
              )}
            </div>
          </div>
        )}

        {/* Improving areas */}
        {overview.improvingAreas.length > 0 && (
          <div className="flex items-start gap-2.5">
            <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            <p className="text-xs text-text-muted">
              Improving:{" "}
              <span className="text-text-primary">
                {overview.improvingAreas.join(", ")}
              </span>
            </p>
          </div>
        )}

        {/* Coach summary sentence */}
        {overview.summary && (
          <p className="text-xs leading-relaxed text-text-secondary">
            {humanizeText(overview.summary)}
          </p>
        )}
      </div>

      {/* Next action CTA */}
      <div className="mt-4">
        <Link
          href={overview.nextAction.href}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent/90"
        >
          {overview.nextAction.label}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
