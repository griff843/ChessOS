"use client";

import Link from "next/link";
import { BookOpen, ArrowRight, AlertCircle, CheckCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  RepertoireBranchRepair,
  BranchRepairConfidence,
  BranchRepairMode,
} from "@/lib/types";

// ── Label maps ──────────────────────────────────────────────────────

const CONFIDENCE_LABELS: Record<BranchRepairConfidence, string> = {
  high: "Strong Match",
  medium: "Partial Match",
  low: "Weak Match",
};

const CONFIDENCE_VARIANT: Record<
  BranchRepairConfidence,
  "success" | "warning" | "muted"
> = {
  high: "success",
  medium: "warning",
  low: "muted",
};

// CTA label and style per repair mode
const MODE_CTA: Record<
  BranchRepairMode,
  { label: string; primary: boolean }
> = {
  line_recall:    { label: "Drill This Line",      primary: true },
  concept_review: { label: "Review in Repertoire", primary: false },
  family_study:   { label: "Study Opening Family", primary: false },
};

// ── Deviation indicator ──────────────────────────────────────────────

function DeviationLine({
  firstDeviationPly,
  firstDeviationMove,
  deviationByUser,
}: {
  firstDeviationPly: number | null;
  firstDeviationMove: string | null;
  deviationByUser: boolean;
}) {
  if (firstDeviationPly === null) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-success">
        <CheckCircle className="h-3 w-3" />
        <span>Followed the seeded line through its full modelled depth</span>
      </div>
    );
  }

  const moveNum = Math.ceil(firstDeviationPly / 2);
  const dots = firstDeviationPly % 2 === 0 ? "..." : ".";
  const moveStr = firstDeviationMove
    ? `${moveNum}${dots}${firstDeviationMove}`
    : `ply ${firstDeviationPly}`;

  if (deviationByUser) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-danger">
        <AlertCircle className="h-3 w-3" />
        <span>
          Deviated from the repertoire at{" "}
          <span className="font-mono font-medium">{moveStr}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-text-muted">
      <Info className="h-3 w-3" />
      <span>
        Opponent deviated first at{" "}
        <span className="font-mono font-medium">{moveStr}</span>
      </span>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

interface OpeningBranchRepairProps {
  branchRepair: RepertoireBranchRepair;
}

export function OpeningBranchRepair({ branchRepair }: OpeningBranchRepairProps) {
  const drillHref = branchRepair.drillLineId
    ? `/repertoire?preferredLineId=${branchRepair.drillLineId}`
    : "/repertoire";

  const modeCta = MODE_CTA[branchRepair.repairMode];

  return (
    <div className="mt-6 flex items-start gap-3">
      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-muted">
            Repertoire Branch
          </span>
          {branchRepair.matched ? (
            <Badge variant={CONFIDENCE_VARIANT[branchRepair.confidence]}>
              {CONFIDENCE_LABELS[branchRepair.confidence]}
            </Badge>
          ) : (
            <Badge variant="muted">No Branch Match</Badge>
          )}
        </div>

        {branchRepair.matched ? (
          <>
            {/* Line name + repertoire */}
            <div className="mt-2">
              <span className="text-sm font-medium text-text-primary">
                {branchRepair.lineName}
              </span>
              {branchRepair.repertoireName && (
                <span className="ml-1.5 text-xs text-text-muted">
                  · {branchRepair.repertoireName}
                </span>
              )}
            </div>

            {/* Deviation status */}
            <div className="mt-2">
              <DeviationLine
                firstDeviationPly={branchRepair.firstDeviationPly}
                firstDeviationMove={branchRepair.firstDeviationMove}
                deviationByUser={branchRepair.deviationByUser}
              />
            </div>

            {/* Explanation */}
            <p className="mt-2 text-xs leading-relaxed text-text-muted">
              {branchRepair.explanation}
            </p>

            {/* Repair action button */}
            <div className="mt-3">
              <Link
                href={drillHref}
                className={
                  modeCta.primary
                    ? "inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent/90"
                    : "inline-flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-surface-hover"
                }
              >
                {modeCta.label}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </>
        ) : (
          /* Graceful fallback — explanation + link to general repertoire page */
          <>
            <p className="mt-2 text-xs leading-relaxed text-text-muted">
              {branchRepair.explanation}
            </p>
            <div className="mt-3">
              <Link
                href="/repertoire"
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                Browse Repertoire Lines
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
