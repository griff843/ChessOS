import {
  loadRepertoireDrillMemory,
  loadRepertoireDrillQueue,
  loadRepertoireDrillSessions,
  loadRepertoireRepair,
  loadRepertoireRepairQueue,
  loadRepertoireRepairOutcomes,
} from "@/lib/artifacts";
import { findLineNameForId } from "@/lib/repertoire-utils";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { RepertoireDrillConsole } from "@/components/repertoire/repertoire-drill-console";
import { BookOpen, ArrowRight, AlertTriangle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RepertoirePage({
  searchParams,
}: {
  searchParams?: Promise<{ preferredLineId?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const preferredLineId = Array.isArray(params?.preferredLineId)
    ? params?.preferredLineId[0]
    : params?.preferredLineId;

  const [drillMemory, drillQueue, drillSessions, repair, repairQueue, repairOutcomes] =
    await Promise.all([
      loadRepertoireDrillMemory(),
      loadRepertoireDrillQueue(),
      loadRepertoireDrillSessions(),
      loadRepertoireRepair(),
      loadRepertoireRepairQueue(),
      loadRepertoireRepairOutcomes(),
    ]);

  const hasData = drillQueue || repairQueue || drillMemory || repairOutcomes;

  // Resolve line name server-side so the drill console can show it immediately
  const preferredLineName = findLineNameForId(
    preferredLineId,
    repairQueue?.entries ?? [],
    drillQueue?.entries ?? []
  );

  const repairCount = repairQueue?.entries.length ?? 0;

  return (
    <>
      <PageHeader
        title="Repertoire"
        subtitle="Practice your opening lines and track repair progress"
      />

      {/* Repair priority callout */}
      {repairCount > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-muted px-5 py-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary">
              {repairCount === 1
                ? "1 opening line needs repair"
                : `${repairCount} opening lines need repair`}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">
              These lines deviated in recent games. Drill the highest-priority line first,
              or use the queue below to choose.
            </p>
          </div>
          {repairQueue?.entries[0] && (
            <Link
              href={`/repertoire?preferredLineId=${repairQueue.entries[0].lineId}`}
              className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-warning px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-warning/90"
            >
              Drill top line
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}

      {/* Drill console */}
      <div className="mb-6">
        <RepertoireDrillConsole
          preferredLineId={preferredLineId ?? null}
          preferredLineName={preferredLineName}
        />
      </div>

      {/* Empty state */}
      {!hasData && (
        <EmptyState
          icon={<BookOpen className="h-10 w-10" />}
          title="No repertoire data yet"
          description="Import and analyze your games to populate your repertoire drill queue, repair targets, and line memory."
          action={
            <Link
              href="/import"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              Import &amp; Analyze
            </Link>
          }
        />
      )}

      {/* Repair queue + signals */}
      {repairQueue && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SectionCard
            title="Repair Queue"
            subtitle={
              repairQueue.entries.length === 0
                ? "Lines get flagged when your game review shows an opening deviation"
                : `${repairQueue.entries.length} line${repairQueue.entries.length !== 1 ? "s" : ""} flagged from recent games`
            }
          >
            <div className="space-y-3">
              {repairQueue.entries.length === 0 && (
                <p className="py-2 text-center text-sm text-text-muted">
                  Analyze more games to populate this queue. Lines get flagged when your game review shows an opening deviation.
                </p>
              )}
              {repairQueue.entries.slice(0, 5).map((entry) => (
                <div
                  key={`${entry.sourceGameId}-${entry.lineId}`}
                  className="rounded-lg bg-surface-elevated px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                      <p className="mt-0.5 text-xs text-text-muted">{entry.scheduledDrillReason}</p>
                      <p className="mt-0.5 text-[11px] text-text-muted">
                        Game {entry.sourceGameId} &middot;{" "}
                        <span className="capitalize">{entry.repairUrgency.replace(/_/g, " ")}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant="warning">{entry.repairType.replace(/_/g, " ")}</Badge>
                      <Link
                        href={`/repertoire?preferredLineId=${entry.lineId}`}
                        className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-accent/90"
                      >
                        Drill
                        <ArrowRight className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Repair Signals" subtitle="Repair patterns detected across games">
            <div className="space-y-3">
              {repair?.repairByType.slice(0, 4).map((entry) => (
                <div key={entry.repairType} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium capitalize text-text-primary">
                    {entry.repairType.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {entry.count} line{entry.count !== 1 ? "s" : ""}: {entry.lines.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Lines due for drill + session history */}
      {drillQueue && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Lines Due for Drill" subtitle="Sorted by recall urgency">
            <div className="space-y-3">
              {drillQueue.entries.slice(0, 5).map((entry) => (
                <div key={entry.lineId} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                      <p className="mt-0.5 text-xs text-text-muted">{entry.recommendedAction}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant="warning">Urgency {entry.urgency.toFixed(2)}</Badge>
                      <Link
                        href={`/repertoire?preferredLineId=${entry.lineId}`}
                        className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-accent/90"
                      >
                        Drill
                        <ArrowRight className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Recent Drill Sessions" subtitle="Your recent repertoire drill history">
            <div className="space-y-3">
              {(drillSessions ?? []).length === 0 ? (
                <p className="py-2 text-center text-sm text-text-muted">
                  No drill sessions yet. Start your first drill above.
                </p>
              ) : (
                (drillSessions ?? []).slice(0, 5).map((entry, idx) => (
                  <div key={entry.drillSessionId} className="rounded-lg bg-surface-elevated px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-text-primary">
                        Session {(drillSessions ?? []).length - idx}
                      </p>
                      <Badge
                        variant={
                          entry.completedCount === entry.sessionSize ? "success" : "muted"
                        }
                      >
                        {entry.completedCount}/{entry.sessionSize} complete
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">
                      Exact: {entry.exactCount} &middot; Failed: {entry.failedCount}
                    </p>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Fragile + strong lines */}
      {drillMemory && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Fragile Lines" subtitle="Lines showing signs of recall decay">
            <div className="space-y-3">
              {drillMemory.fragileLines.slice(0, 5).map((entry) => (
                <div key={entry.lineId} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                      <p className="mt-1 text-xs text-text-muted">
                        Recall {Math.round(entry.recallConfidence * 100)}% &middot; forgetting
                        risk {Math.round(entry.forgettingRisk * 100)}%
                      </p>
                    </div>
                    <Link
                      href={`/repertoire?preferredLineId=${entry.lineId}`}
                      className="shrink-0 inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-hover"
                    >
                      Drill
                      <ArrowRight className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Strong Lines" subtitle="Lines with solid, stable recall">
            <div className="space-y-3">
              {drillMemory.strongestLines.slice(0, 5).map((entry) => (
                <div key={entry.lineId} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    Recall {Math.round(entry.recallConfidence * 100)}% &middot; stability{" "}
                    {Math.round(entry.stabilityScore * 100)}%
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Repair outcomes */}
      {repairOutcomes && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Repair Outcomes" subtitle="How repairs transferred to actual games">
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

          <SectionCard title="Repairs That Held Up" subtitle="Successfully transferred repairs">
            <div className="space-y-3">
              {repairOutcomes.repairsThatWorked.slice(0, 5).map((entry) => (
                <div key={entry.repairId} className="rounded-lg bg-surface-elevated px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                  <p className="mt-1 text-xs text-text-muted">{entry.outcomeReason}</p>
                </div>
              ))}
              {repairOutcomes.repairsThatWorked.length === 0 && (
                <p className="py-2 text-center text-xs text-text-muted">
                  No confirmed repairs yet. Keep drilling to build your transfer history.
                </p>
              )}
            </div>
          </SectionCard>
        </div>
      )}
    </>
  );
}
