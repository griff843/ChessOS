"use client";

import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import type { RepairEvidence, EvidenceStatus } from "@/lib/types";

const STATUS_LABELS: Record<EvidenceStatus, string> = {
  isolated: "First Occurrence",
  emerging: "Emerging Pattern",
  recurring: "Recurring Issue",
  improving: "Improving",
  persistent: "Persistent Issue",
};

const STATUS_VARIANT: Record<EvidenceStatus, "info" | "warning" | "danger" | "success" | "accent"> = {
  isolated: "info",
  emerging: "warning",
  recurring: "danger",
  improving: "success",
  persistent: "danger",
};

const STATUS_SUBTITLE: Record<EvidenceStatus, string> = {
  isolated: "This is a new issue",
  emerging: "Watch for repetition",
  recurring: "Prioritize this area",
  improving: "Positive trend detected",
  persistent: "Long-running weakness",
};

export function RepairEvidenceCard({ evidence }: { evidence: RepairEvidence }) {
  return (
    <SectionCard
      title="Repair Evidence"
      subtitle={STATUS_SUBTITLE[evidence.status]}
    >
      <div className="space-y-3">
        {/* Status badge row */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Pattern Status
          </span>
          <Badge variant={STATUS_VARIANT[evidence.status]}>
            {STATUS_LABELS[evidence.status]}
          </Badge>
        </div>

        {/* Occurrence stats */}
        {evidence.totalGamesAnalyzed > 0 && (
          <div className="flex gap-4 rounded-lg bg-surface-elevated px-4 py-3 text-xs text-text-muted">
            <span>
              Seen in{" "}
              <strong className="text-text-secondary">
                {evidence.totalOccurrences}
              </strong>{" "}
              of{" "}
              <strong className="text-text-secondary">
                {evidence.totalGamesAnalyzed}
              </strong>{" "}
              analyzed games
            </span>
            {evidence.totalOccurrences > 0 && (
              <>
                <span>
                  Recent:{" "}
                  <strong className="text-text-secondary">
                    {evidence.recentOccurrences}
                  </strong>
                </span>
                <span>
                  Older:{" "}
                  <strong className="text-text-secondary">
                    {evidence.olderOccurrences}
                  </strong>
                </span>
              </>
            )}
          </div>
        )}

        {/* Explanation */}
        <p className="text-xs text-text-muted leading-relaxed">
          {evidence.explanation}
        </p>
      </div>
    </SectionCard>
  );
}
