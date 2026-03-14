import {
  loadRepertoireDrillMemory,
  loadRepertoireDrillQueue,
  loadRepertoireDrillSessions,
  loadRepertoireRepair,
  loadRepertoireRepairQueue,
  loadRepertoireRepairOutcomes,
} from "@/lib/artifacts";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { RepertoireDrillConsole } from "@/components/repertoire/repertoire-drill-console";

export const dynamic = "force-dynamic";

export default async function RepertoirePage({
  searchParams,
}: {
  searchParams?: Promise<{ preferredLineId?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const preferredLineId = Array.isArray(params?.preferredLineId) ? params?.preferredLineId[0] : params?.preferredLineId;
  const [drillMemory, drillQueue, drillSessions, repair, repairQueue, repairOutcomes] = await Promise.all([
    loadRepertoireDrillMemory(),
    loadRepertoireDrillQueue(),
    loadRepertoireDrillSessions(),
    loadRepertoireRepair(),
    loadRepertoireRepairQueue(),
    loadRepertoireRepairOutcomes(),
  ]);

  return (
    <>
      <PageHeader title="Repertoire" subtitle="Drill sessions, memory, and transfer repair" />

      <div className="mb-6">
        <RepertoireDrillConsole preferredLineId={preferredLineId ?? null} />
      </div>

      {repairQueue && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Repair Queue" subtitle="Exact lines to repair from imported games">
            <div className="space-y-3">
              {repairQueue.entries.slice(0, 5).map((entry) => (
                <div key={`${entry.sourceGameId}-${entry.lineId}`} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                    <Badge variant="warning">{entry.repairType.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{entry.scheduledDrillReason}</p>
                  <p className="mt-1 text-xs text-text-muted">Source game {entry.sourceGameId} · urgency {entry.urgencyScore.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Repair Signals" subtitle="Why the next drill lines were pulled forward">
            <div className="space-y-3">
              {repair?.repairByType.slice(0, 4).map((entry) => (
                <div key={entry.repairType} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{entry.repairType.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-xs text-text-muted">{entry.count} line(s): {entry.lines.join(", ")}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {drillQueue && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Next Drill Lines" subtitle="Deterministic queue from drill memory">
            <div className="space-y-3">
              {drillQueue.entries.slice(0, 5).map((entry) => (
                <div key={entry.lineId} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                    <Badge variant="warning">Urgency {entry.urgency.toFixed(2)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{entry.recommendedAction}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Recent Drill Sessions" subtitle="Explicit repertoire review attempts">
            <div className="space-y-3">
              {(drillSessions ?? []).slice(0, 5).map((entry) => (
                <div key={entry.drillSessionId} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{entry.drillSessionId}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {entry.completedCount}/{entry.sessionSize} complete · exact {entry.exactCount} · failed {entry.failedCount}
                  </p>
                </div>
              ))}
              {(drillSessions ?? []).length === 0 && (
                <p className="text-sm text-text-muted">No explicit repertoire drill sessions recorded yet.</p>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {drillMemory && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Fragile Drill Lines" subtitle="Lines most at risk of forgetting">
            <div className="space-y-3">
              {drillMemory.fragileLines.slice(0, 5).map((entry) => (
                <div key={entry.lineId} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    Recall confidence {Math.round(entry.recallConfidence * 100)}% · forgetting risk {Math.round(entry.forgettingRisk * 100)}%
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Strongest Drill Lines" subtitle="Lines that can be deprioritized for now">
            <div className="space-y-3">
              {drillMemory.strongestLines.slice(0, 5).map((entry) => (
                <div key={entry.lineId} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    Recall confidence {Math.round(entry.recallConfidence * 100)}% · stability {Math.round(entry.stabilityScore * 100)}%
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
      {repairOutcomes && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Repair Outcomes" subtitle="Closed-loop result of repair -> drill -> next game">
            <div className="space-y-3">
              {repairOutcomes.nextActions.slice(0, 5).map((entry) => (
                <div key={entry.repairId} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                    <Badge variant="warning">{entry.outcomeVerdict.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{entry.nextAction}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Repairs That Worked" subtitle="Lines that transferred cleanly">
            <div className="space-y-3">
              {repairOutcomes.repairsThatWorked.slice(0, 5).map((entry) => (
                <div key={entry.repairId} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                  <p className="mt-1 text-xs text-text-muted">{entry.outcomeReason}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
    </>
  );
}
