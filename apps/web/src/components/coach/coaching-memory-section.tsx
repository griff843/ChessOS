/**
 * CoachingMemorySection — cross-game coaching memory summary.
 *
 * Renders the bounded summary from buildCoachingMemorySummary:
 * a top-priority list grouped by persistence state.
 */

import type { CoachingMemorySummary, CoachingMemoryEntry, CoachingPersistenceState } from "@/lib/types";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";

// ── State display config ──────────────────────────────────────────────────────

type BadgeVariant = "danger" | "warning" | "success" | "accent" | "muted";

const STATE_CONFIG: Record<
  CoachingPersistenceState,
  { label: string; variant: BadgeVariant }
> = {
  persistent_despite_training: { label: "Persistent", variant: "danger" },
  recurring_no_training:       { label: "Recurring",  variant: "warning" },
  recurring_limited_data:      { label: "Limited data", variant: "warning" },
  improving_after_training:    { label: "Improving",  variant: "success" },
  emerging:                    { label: "Emerging",   variant: "muted" },
  first_occurrence:            { label: "New",        variant: "muted" },
};

const EMPHASIS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  increase: { label: "↑ Increase focus", variant: "danger" },
  maintain: { label: "→ Maintain",       variant: "warning" },
  reduce:   { label: "↓ Reduce focus",   variant: "success" },
  monitor:  { label: "Monitor",          variant: "muted" },
};

// ── Entry card ────────────────────────────────────────────────────────────────

function EntryCard({ entry }: { entry: CoachingMemoryEntry }) {
  const stateConfig = STATE_CONFIG[entry.persistenceState];
  const emphasisConfig = EMPHASIS_CONFIG[entry.recommendedEmphasis] ?? EMPHASIS_CONFIG.monitor;

  return (
    <div className="rounded-lg bg-surface-elevated px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary capitalize">
            {entry.target.replace(/_/g, " ")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-text-muted line-clamp-2">
            {entry.explanation}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={stateConfig.variant}>{stateConfig.label}</Badge>
          <Badge variant={emphasisConfig.variant}>{emphasisConfig.label}</Badge>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-text-muted">
        <span>{entry.totalOccurrences} game{entry.totalOccurrences !== 1 ? "s" : ""}</span>
        {entry.targetedSessionCount > 0 && (
          <span>{entry.targetedSessionCount} session{entry.targetedSessionCount !== 1 ? "s" : ""} trained</span>
        )}
        <span className="capitalize text-text-muted/60">{entry.confidence} confidence</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface CoachingMemorySectionProps {
  summary: CoachingMemorySummary;
}

export function CoachingMemorySection({ summary }: CoachingMemorySectionProps) {
  const subtitle = summary.readiness === "no_data"
    ? "No data yet"
    : summary.readiness === "sparse"
      ? `${summary.totalGamesAnalyzed} game${summary.totalGamesAnalyzed !== 1 ? "s" : ""} analyzed — limited data`
      : `${summary.totalGamesAnalyzed} games · ${summary.totalTargetsTracked} target${summary.totalTargetsTracked !== 1 ? "s" : ""} tracked`;

  return (
    <SectionCard title="Coaching Memory" subtitle={subtitle}>
      {/* Summary message */}
      <div className="mb-4 rounded-lg border border-border-subtle bg-surface px-4 py-3">
        <p className="text-sm text-text-secondary">{summary.summaryMessage}</p>
      </div>

      {/* Sparse / no-data states */}
      {summary.readiness !== "ready" || summary.topPriorities.length === 0 ? (
        <div className="py-2 text-center text-xs text-text-muted">
          {summary.readiness === "no_data"
            ? "Analyze games to build coaching memory."
            : "Analyze more games to surface clear patterns."}
        </div>
      ) : (
        <div className="space-y-2">
          {summary.topPriorities.map((entry) => (
            <EntryCard key={entry.target} entry={entry} />
          ))}
        </div>
      )}

      {/* Stats row */}
      {summary.totalTargetsTracked > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border-subtle pt-3">
          {summary.persistentCount > 0 && (
            <Badge variant="danger">{summary.persistentCount} persistent</Badge>
          )}
          {summary.recurringNoTrainingCount > 0 && (
            <Badge variant="warning">{summary.recurringNoTrainingCount} recurring</Badge>
          )}
          {summary.improvingCount > 0 && (
            <Badge variant="success">{summary.improvingCount} improving</Badge>
          )}
          {summary.limitedDataCount > 0 && (
            <Badge variant="muted">{summary.limitedDataCount} limited data</Badge>
          )}
          {summary.emergingCount > 0 && (
            <Badge variant="muted">{summary.emergingCount} emerging</Badge>
          )}
        </div>
      )}
    </SectionCard>
  );
}
