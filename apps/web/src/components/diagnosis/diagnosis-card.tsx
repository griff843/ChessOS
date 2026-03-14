"use client";

import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import type { GameLossDiagnosis, DiagnosisCategory, ContributingFactor } from "@/lib/types";

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

const CATEGORY_VARIANT: Record<DiagnosisCategory, "danger" | "warning" | "info" | "accent"> = {
  opening_memory_failure: "warning",
  opening_concept_failure: "warning",
  calculation_failure: "danger",
  tactical_blunder: "danger",
  strategic_misjudgment: "info",
  time_trouble: "accent",
  endgame_technique_failure: "warning",
  practical_collapse: "danger",
};

function MoveReference({ ply, moveSan, swingCp }: { ply: number; moveSan: string; swingCp: number }) {
  const moveNum = Math.ceil(ply / 2);
  const dots = ply % 2 === 0 ? "..." : ".";
  return (
    <span className="font-mono text-sm">
      {moveNum}{dots}{moveSan}
      {swingCp > 0 && (
        <span className="ml-1 text-danger text-xs">(-{swingCp}cp)</span>
      )}
    </span>
  );
}

function ContributingFactorRow({ factor }: { factor: ContributingFactor }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-elevated px-3 py-2">
      <div className="flex items-center gap-2">
        <MoveReference ply={factor.ply} moveSan={factor.moveSan} swingCp={factor.swingCp} />
        <Badge variant={CATEGORY_VARIANT[factor.category]}>
          {CATEGORY_LABELS[factor.category]}
        </Badge>
      </div>
      <span className="text-xs text-text-muted">{factor.note}</span>
    </div>
  );
}

export function DiagnosisCard({ diagnosis }: { diagnosis: GameLossDiagnosis }) {
  if (!diagnosis.gameLost) {
    return (
      <SectionCard title="Game Diagnosis" subtitle="No clear loss detected">
        <p className="text-sm text-text-muted">{diagnosis.explanation}</p>
      </SectionCard>
    );
  }

  const { losingMove, primaryCategory, contributingFactors, explanation } = diagnosis;

  return (
    <SectionCard
      title="Game Loss Diagnosis"
      subtitle={`${diagnosis.gameId} · ${diagnosis.heroColor ?? "unknown"}`}
    >
      <div className="space-y-4">
        {/* Primary diagnosis */}
        <div className="rounded-lg border border-border-subtle bg-surface-elevated p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Primary Cause
            </span>
            <Badge variant={CATEGORY_VARIANT[primaryCategory]}>
              {CATEGORY_LABELS[primaryCategory]}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            {explanation}
          </p>
        </div>

        {/* Losing move */}
        <div className="rounded-lg border border-danger/20 bg-danger-muted/30 p-4">
          <span className="text-xs font-medium uppercase tracking-wider text-danger">
            First Losing Decision
          </span>
          <div className="mt-2 flex items-center gap-3">
            <MoveReference ply={losingMove.ply} moveSan={losingMove.moveSan} swingCp={losingMove.swingCp} />
            <span className="text-xs text-text-muted">
              {losingMove.phase} · {losingMove.label}
            </span>
          </div>
          <div className="mt-1 flex gap-4 text-xs text-text-muted">
            <span>Before: {losingMove.evalBefore > 0 ? "+" : ""}{losingMove.evalBefore}cp</span>
            <span>After: {losingMove.evalAfter > 0 ? "+" : ""}{losingMove.evalAfter}cp</span>
          </div>
        </div>

        {/* Contributing factors */}
        {contributingFactors.length > 0 && (
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Contributing Factors
            </span>
            <div className="mt-2 space-y-1.5">
              {contributingFactors.map((factor, i) => (
                <ContributingFactorRow key={i} factor={factor} />
              ))}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="flex gap-4 rounded-lg bg-surface-elevated px-4 py-3 text-xs text-text-muted">
          <span>Mistakes: <strong className="text-text-secondary">{diagnosis.mistakeCount}</strong></span>
          <span>Blunders: <strong className="text-danger">{diagnosis.blunderCount}</strong></span>
          <span>Total CP loss: <strong className="text-text-secondary">{diagnosis.totalCpLoss}</strong></span>
          <span>Final eval: <strong className={diagnosis.finalEvalCp < 0 ? "text-danger" : "text-success"}>
            {diagnosis.finalEvalCp > 0 ? "+" : ""}{diagnosis.finalEvalCp}cp
          </strong></span>
        </div>
      </div>
    </SectionCard>
  );
}
