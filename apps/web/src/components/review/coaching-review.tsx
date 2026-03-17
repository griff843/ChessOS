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
  RepertoireBranchRepair,
  CoachingMemory,
  CoachingPersistenceState,
  SessionPerformanceBand,
} from "@/lib/types";
import { OpeningBranchRepair } from "@/components/review/opening-branch-repair";
import {
  AlertTriangle,
  TrendingDown,
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

const PERFORMANCE_BAND_LABELS: Partial<Record<SessionPerformanceBand, string>> = {
  strong: "Practice: Strong",
  mixed: "Practice: Mixed",
  weak: "Practice: Weak",
};

const PERFORMANCE_BAND_VARIANT: Partial<Record<
  SessionPerformanceBand,
  "success" | "warning" | "danger"
>> = {
  strong: "success",
  mixed: "warning",
  weak: "danger",
};

const PERSISTENCE_LABELS: Record<CoachingPersistenceState, string> = {
  first_occurrence: "First Occurrence",
  emerging: "Emerging Pattern",
  recurring_no_training: "Recurring — No Training Yet",
  improving_after_training: "Improving After Training",
  persistent_despite_training: "Persistent Despite Training",
  recurring_limited_data: "Needs More Data",
};

const PERSISTENCE_VARIANT: Record<
  CoachingPersistenceState,
  "info" | "warning" | "danger" | "success" | "accent"
> = {
  first_occurrence: "info",
  emerging: "warning",
  recurring_no_training: "danger",
  improving_after_training: "success",
  persistent_despite_training: "danger",
  recurring_limited_data: "warning",
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

const OPENING_CATEGORIES = new Set<DiagnosisCategory>([
  "opening_memory_failure",
  "opening_concept_failure",
]);

interface CoachingReviewProps {
  diagnosis: GameLossDiagnosis;
  recommendation: RepairTargetRecommendation;
  evidence: RepairEvidence | null;
  heroColor: "white" | "black" | null;
  branchRepair?: RepertoireBranchRepair | null;
  coachingMemory?: CoachingMemory | null;
  /** Ply → FEN map for rendering contributing factor mini-boards. */
  plyFenMap?: Record<number, string>;
}

export function CoachingReview({
  diagnosis,
  recommendation,
  evidence,
  heroColor,
  branchRepair,
  coachingMemory,
  plyFenMap,
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

  const hasSecondaryDetail =
    contributingFactors.length > 0 ||
    (recommendation.repairNeeded && recommendation.secondaryTargets.length > 0) ||
    (OPENING_CATEGORIES.has(primaryCategory) && branchRepair != null);

  return (
    <div className="rounded-xl border border-border bg-surface">
      {/* ── Board + Coaching Narrative ─────────────────────── */}
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

        {/* Coaching narrative side */}
        <div className="flex flex-1 flex-col p-5">
          {/* Category badge */}
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />
            <Badge variant={CATEGORY_VARIANT[primaryCategory]}>
              {CATEGORY_LABELS[primaryCategory]}
            </Badge>
          </div>

          {/* Flowing verdict: explanation + repair target in one narrative */}
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">
            {explanation}
            {recommendation.repairNeeded && (
              <>
                {" "}Your primary training focus should be{" "}
                <span className="font-semibold text-text-primary">
                  {TARGET_LABELS[recommendation.primaryTarget]}
                </span>
                .
                {recommendation.primaryReason &&
                  ` ${recommendation.primaryReason}`}
              </>
            )}
          </p>

          {/* Coaching memory or evidence inline */}
          {coachingMemory ? (
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={PERSISTENCE_VARIANT[coachingMemory.persistenceState]}>
                  {PERSISTENCE_LABELS[coachingMemory.persistenceState]}
                </Badge>
                {coachingMemory.sessionPerformanceBand &&
                  coachingMemory.sessionPerformanceBand !== "insufficient_data" && (
                  <Badge
                    variant={
                      PERFORMANCE_BAND_VARIANT[coachingMemory.sessionPerformanceBand]
                    }
                  >
                    {PERFORMANCE_BAND_LABELS[coachingMemory.sessionPerformanceBand]}
                  </Badge>
                )}
                <span className="text-xs text-text-muted">
                  {coachingMemory.explanation}
                </span>
              </div>
              {coachingMemory.targetedSessionCount > 0 && (
                <span className="text-xs text-text-muted">
                  {coachingMemory.targetedSessionCount} targeted session{coachingMemory.targetedSessionCount === 1 ? "" : "s"} launched
                </span>
              )}
            </div>
          ) : evidence ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_VARIANT[evidence.status]}>
                {STATUS_LABELS[evidence.status]}
              </Badge>
              <span className="text-xs text-text-muted">
                {evidence.totalGamesAnalyzed > 0
                  ? `Seen in ${evidence.totalOccurrences} of ${evidence.totalGamesAnalyzed} analyzed games`
                  : evidence.explanation}
              </span>
            </div>
          ) : null}

          {/* CTA — prominent, right after narrative */}
          {recommendation.repairNeeded && (
            <div className="mt-5">
              <ReviewCTA
                sourceGameId={diagnosis.gameId}
                primaryTarget={recommendation.primaryTarget}
                secondaryTargets={recommendation.secondaryTargets.map((s) => s.target)}
                evidenceStatus={evidence?.status ?? null}
                branchRepairMatched={branchRepair?.matched ?? false}
                coachingEmphasis={coachingMemory?.recommendedEmphasis}
              />
            </div>
          )}

          {!recommendation.repairNeeded && (
            <p className="mt-4 text-xs text-text-muted">
              {recommendation.summary}
            </p>
          )}
        </div>
      </div>

      {/* ── Secondary Detail ──────────────────────────────── */}
      {hasSecondaryDetail && (
        <div className="border-t border-border-subtle p-5 space-y-4">
          {/* Contributing factors */}
          {contributingFactors.length > 0 && (
            <div className="space-y-1.5">
              {contributingFactors.map(
                (factor: ContributingFactor, i: number) => {
                  const factorFen = plyFenMap?.[factor.ply];
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg bg-surface-elevated px-3 py-2"
                    >
                      {factorFen && (
                        <div className="shrink-0">
                          <StaticBoard
                            fen={factorFen}
                            orientation={boardOrientation}
                            size={100}
                          />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col gap-1 min-w-0">
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
                    </div>
                  );
                }
              )}
            </div>
          )}

          {/* Secondary targets */}
          {recommendation.repairNeeded &&
            recommendation.secondaryTargets.length > 0 && (
              <div className="space-y-1.5">
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
            )}

          {/* Opening branch repair */}
          {OPENING_CATEGORIES.has(diagnosis.primaryCategory) &&
            branchRepair != null && (
              <OpeningBranchRepair branchRepair={branchRepair} />
            )}
        </div>
      )}

      {/* ── Stats row — last ─────────────────────────────── */}
      <div className="border-t border-border-subtle px-5 py-3 flex flex-wrap gap-4 text-xs text-text-muted">
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
  );
}
