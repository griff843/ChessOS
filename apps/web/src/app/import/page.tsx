import { PageHeader } from "@/components/layout/page-header";
import { ImportAnalyzePanel } from "@/components/import/import-analyze-panel";
import { loadImportOverview, loadRepertoireRepairOutcomes, loadRepertoireRepairQueue } from "@/lib/artifacts";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { loadImportResults } from "@/lib/import-results";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const [overview, results, repairQueue, repairOutcomes] = await Promise.all([
    loadImportOverview(),
    loadImportResults(),
    loadRepertoireRepairQueue(),
    loadRepertoireRepairOutcomes(),
  ]);

  return (
    <>
      <PageHeader
        title="Import & Analyze"
        subtitle="Turn local PGN files into training signals, then hand off directly into study."
      />
      <ImportAnalyzePanel overview={overview} results={results} repairQueue={repairQueue} />
      {repairOutcomes && (
        <div className="mt-6">
          <SectionCard title="Repair Outcomes" subtitle="Did recent repairs hold up after drill follow-up?">
            <div className="space-y-3">
              {repairOutcomes.nextActions.slice(0, 4).map((entry) => (
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
        </div>
      )}
    </>
  );
}
