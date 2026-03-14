"use client";

import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import type {
  RepairTargetRecommendation,
  RepairTarget,
  SecondaryRepairTarget,
  DiagnosisCategory,
} from "@/lib/types";

const TARGET_LABELS: Record<RepairTarget, string> = {
  opening_line_recall: "Opening Line Recall",
  opening_concept_understanding: "Opening Concept Understanding",
  calculation_discipline: "Calculation Discipline",
  tactical_pattern_recognition: "Tactical Pattern Recognition",
  candidate_move_generation: "Candidate Move Generation",
  strategic_planning: "Strategic Planning",
  time_management: "Time Management",
  endgame_technique: "Endgame Technique",
  practical_stabilization: "Practical Stabilization",
};

const TARGET_VARIANT: Record<RepairTarget, "danger" | "warning" | "info" | "accent"> = {
  opening_line_recall: "warning",
  opening_concept_understanding: "warning",
  calculation_discipline: "danger",
  tactical_pattern_recognition: "danger",
  candidate_move_generation: "info",
  strategic_planning: "info",
  time_management: "accent",
  endgame_technique: "warning",
  practical_stabilization: "danger",
};

const CATEGORY_LABELS: Record<DiagnosisCategory, string> = {
  opening_memory_failure: "Opening Memory Failure",
  opening_concept_failure: "Opening Concept Failure",
  calculation_failure: "Calculation Failure",
  tactical_blunder: "Tactical Blunder",
  strategic_misjudgment: "Strategic Misjudgment",
  time_trouble: "Time Trouble",
  endgame_technique_failure: "Endgame Technique Failure",
  practical_collapse: "Practical Collapse",
};

function SecondaryTargetRow({ secondary }: { secondary: SecondaryRepairTarget }) {
  return (
    <div className="rounded-lg bg-surface-elevated px-3 py-2">
      <div className="flex items-center gap-2">
        <Badge variant={TARGET_VARIANT[secondary.target]}>
          {TARGET_LABELS[secondary.target]}
        </Badge>
        <span className="text-xs text-text-muted">
          &larr; {CATEGORY_LABELS[secondary.sourceCategory]}
        </span>
      </div>
      <p className="mt-1 text-xs text-text-muted leading-relaxed">
        {secondary.reason}
      </p>
    </div>
  );
}

export function RepairTargetCard({
  recommendation,
}: {
  recommendation: RepairTargetRecommendation;
}) {
  if (!recommendation.repairNeeded) {
    return (
      <SectionCard title="Repair Targets" subtitle="No repair needed">
        <p className="text-sm text-text-muted">{recommendation.summary}</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Repair Targets"
      subtitle="What to work on next"
    >
      <div className="space-y-4">
        {/* Primary target */}
        <div className="rounded-lg border border-border-subtle bg-surface-elevated p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Primary Target
            </span>
            <Badge variant={TARGET_VARIANT[recommendation.primaryTarget]}>
              {TARGET_LABELS[recommendation.primaryTarget]}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            {recommendation.primaryReason}
          </p>
        </div>

        {/* Secondary targets */}
        {recommendation.secondaryTargets.length > 0 && (
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Also Consider
            </span>
            <div className="mt-2 space-y-1.5">
              {recommendation.secondaryTargets.map((secondary, i) => (
                <SecondaryTargetRow key={i} secondary={secondary} />
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="rounded-lg bg-surface-elevated px-4 py-3">
          <p className="text-xs text-text-muted leading-relaxed">
            {recommendation.summary}
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
