"use client";

import { StaticBoard } from "@/components/board/static-board";
import { Badge } from "@/components/ui/badge";
import { ReviewCTA } from "@/components/review/review-cta";
import type {
  GameLossDiagnosis,
  DiagnosisCategory,
  ContributingFactor,
  RepairTargetRecommendation,
  RepairTarget,
  SecondaryRepairTarget,
  RepairEvidence,
  EvidenceStatus,
} from "@/lib/types";
import {
  AlertTriangle,
  TrendingDown,
  Target,
  Activity,
  CheckCircle,
} from "lucide-react";

// ── Label maps ──────────────────────────────────────────────────────

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

const CATEGORY_VARIANT: Record<
  DiagnosisCategory,
  "danger" | "warning" | "info" | "accent"
> = {
  opening_memory_failure: "warning",
  opening_concept_failure: "warning",
  calculation_failure: "danger",
  tactical_blunder: "danger",
  strategic_misjudgment: "info",
  time_trouble: "accent",
  endgame_technique_failure: "warning",
  practical_collapse: "danger",
};

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

const TARGET_VARIANT: Record<
  RepairTarget,
  "danger" | "warning" | "info" | "accent"
> = {
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

const STATUS_LABELS: Record<EvidenceStatus, string> = {
  isolated: "First Occurrence",
  emerging: "Emerging Pattern",
  recurring: "Recurring Issue",
  improving: "Improving",
  persistent: "Persistent Issue",
};

const STATUS_VARIANT: Record<
  EvidenceStatus,
  "info" | "warning" | "danger" | "success" | "accent"
> = {
  isolated: "info",
  emerging: "warning",
  recurring: "danger",
  improving: "success",
  persistent: "danger",
};

// ── Helpers ─────────────────────────────────────────────────────────

function MoveNotation({
  ply,
  moveSan,
  swingCp,
}: {
  ply: number;
  moveSan: string;
  swingCp: number;
}) {
  const moveNum = Math.ceil(ply / 2);
  const dots = ply % 2 === 0 ? "..." : ".";
  return (
    <span className="font-mono text-sm">
      {moveNum}
      {dots}
      {moveSan}
      {swingCp > 0 && (
        <span className="ml-1 text-xs text-danger">(-{swingCp}cp)</span>
      )}
    </span>
  );
}

// ── Main Component ──────────────────────────────────────────────────

interface CoachingReviewProps {
  diagnosis: GameLossDiagnosis;
  recommendation: RepairTargetRecommendation;
  evidence: RepairEvidence | null;
  heroColor: "white" | "black" | null;
}

export function CoachingReview({
  diagnosis,
  recommendation,
  evidence,
  heroColor,
}: CoachingReviewProps) {
  // Non-loss game — clean, neutral summary
  if (!diagnosis.gameLost) {
    return (
      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-4">
          <CheckCircle className="h-5 w-5 text-success" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              No Critical Errors Found
            </h3>
            <p className="mt-0.5 text-xs text-text-muted">
              This game did not contain a decisive losing sequence
            </p>
          </div>
        </div>
        <div className="p-5">
          <p className="text-sm text-text-secondary leading-relaxed">
            {diagnosis.explanation}
          </p>
          {diagnosis.mistakeCount > 0 && (
            <div className="mt-4 flex gap-4 text-xs text-text-muted">
              <span>
                Mistakes:{" "}
                <strong className="text-text-secondary">
                  {diagnosis.mistakeCount}
                </strong>
              </span>
              <span>
                Blunders:{" "}
                <strong className="text-text-secondary">
                  {diagnosis.blunderCount}
                </strong>
              </span>
              <span>
                Total CP loss:{" "}
                <strong className="text-text-secondary">
                  {diagnosis.totalCpLoss}
                </strong>
              </span>
            </div>
          )}
          {!recommendation.repairNeeded && (
            <p className="mt-4 text-xs text-text-muted">
              {recommendation.summary}
            </p>
          )}
        </div>
      </div>
    );
  }

  const { losingMove, primaryCategory, contributingFactors, explanation } =
    diagnosis;
  const boardOrientation: "white" | "black" =
    heroColor ??
    diagnosis.heroColor ??
    (losingMove.fen.split(" ")[1] === "w" ? "white" : "black");

  return (
    <div className="space-y-6">
      {/* ── Board + Diagnosis ──────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="flex flex-col lg:flex-row">
          {/* Board side */}
          <div className="flex flex-col items-center justify-center border-b border-border-subtle p-5 lg:border-b-0 lg:border-r">
            <StaticBoard
              fen={losingMove.fen}
              orientation={boardOrientation}
              size={340}
            />
            <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
              <TrendingDown className="h-3.5 w-3.5 text-danger" />
              <MoveNotation
                ply={losingMove.ply}
                moveSan={losingMove.moveSan}
                swingCp={losingMove.swingCp}
              />
              <span className="text-text-muted">·</span>
              <span>
                {losingMove.evalBefore > 0 ? "+" : ""}
                {losingMove.evalBefore}cp → {losingMove.evalAfter > 0 ? "+" : ""}
                {losingMove.evalAfter}cp
              </span>
            </div>
          </div>

          {/* Diagnosis side */}
          <div className="flex flex-1 flex-col p-5">
            {/* Section: What happened */}
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    Primary Cause
                  </span>
                  <Badge variant={CATEGORY_VARIANT[primaryCategory]}>
                    {CATEGORY_LABELS[primaryCategory]}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {explanation}
                </p>
              </div>
            </div>

            {/* Contributing factors */}
            {contributingFactors.length > 0 && (
              <div className="mt-5">
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Contributing Factors
                </span>
                <div className="mt-2 space-y-1.5">
                  {contributingFactors.map(
                    (factor: ContributingFactor, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 rounded-lg bg-surface-elevated px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <MoveNotation
                            ply={factor.ply}
                            moveSan={factor.moveSan}
                            swingCp={factor.swingCp}
                          />
                          <Badge variant={CATEGORY_VARIANT[factor.category]}>
                            {CATEGORY_LABELS[factor.category]}
                          </Badge>
                        </div>
                        <span className="text-xs text-text-muted">
                          {factor.note}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Stats row */}
            <div className="mt-5 flex gap-4 rounded-lg bg-surface-elevated px-4 py-3 text-xs text-text-muted">
              <span>
                Mistakes:{" "}
                <strong className="text-text-secondary">
                  {diagnosis.mistakeCount}
                </strong>
              </span>
              <span>
                Blunders:{" "}
                <strong className="text-danger">
                  {diagnosis.blunderCount}
                </strong>
              </span>
              <span>
                Total CP loss:{" "}
                <strong className="text-text-secondary">
                  {diagnosis.totalCpLoss}
                </strong>
              </span>
              <span>
                Final eval:{" "}
                <strong
                  className={
                    diagnosis.finalEvalCp < 0 ? "text-danger" : "text-success"
                  }
                >
                  {diagnosis.finalEvalCp > 0 ? "+" : ""}
                  {diagnosis.finalEvalCp}cp
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Repair Targets + Evidence + CTA ─────────────── */}
      {recommendation.repairNeeded && (
        <div className="rounded-xl border border-border bg-surface">
          <div className="p-5">
            {/* Section: What to work on */}
            <div className="flex items-start gap-3">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    Primary Training Target
                  </span>
                  <Badge
                    variant={TARGET_VARIANT[recommendation.primaryTarget]}
                  >
                    {TARGET_LABELS[recommendation.primaryTarget]}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {recommendation.primaryReason}
                </p>
              </div>
            </div>

            {/* Secondary targets */}
            {recommendation.secondaryTargets.length > 0 && (
              <div className="ml-7 mt-4">
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Also Consider
                </span>
                <div className="mt-2 space-y-1.5">
                  {recommendation.secondaryTargets.map(
                    (secondary: SecondaryRepairTarget, i: number) => (
                      <div
                        key={i}
                        className="rounded-lg bg-surface-elevated px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant={TARGET_VARIANT[secondary.target]}>
                            {TARGET_LABELS[secondary.target]}
                          </Badge>
                          <span className="text-xs text-text-muted">
                            &larr;{" "}
                            {CATEGORY_LABELS[secondary.sourceCategory]}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-text-muted">
                          {secondary.reason}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Evidence section */}
            {evidence && (
              <div className="mt-6 flex items-start gap-3">
                <Activity className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                      Pattern History
                    </span>
                    <Badge variant={STATUS_VARIANT[evidence.status]}>
                      {STATUS_LABELS[evidence.status]}
                    </Badge>
                  </div>
                  {evidence.totalGamesAnalyzed > 0 && (
                    <div className="mt-2 flex gap-4 text-xs text-text-muted">
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
                  <p className="mt-2 text-xs leading-relaxed text-text-muted">
                    {evidence.explanation}
                  </p>
                </div>
              </div>
            )}

            {/* Divider + CTA */}
            <div className="mt-6 border-t border-border-subtle pt-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-muted">
                  {recommendation.summary}
                </p>
                <ReviewCTA />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Non-repair CTA (game was lost but no repair target needed — unlikely but handle) */}
      {!recommendation.repairNeeded && (
        <div className="rounded-lg bg-surface-elevated px-5 py-4">
          <p className="text-xs text-text-muted">{recommendation.summary}</p>
        </div>
      )}
    </div>
  );
}
