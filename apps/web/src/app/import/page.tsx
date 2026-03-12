import { PageHeader } from "@/components/layout/page-header";
import { ImportAnalyzePanel } from "@/components/import/import-analyze-panel";
import { loadImportOverview } from "@/lib/artifacts";
import { loadImportResults } from "@/lib/import-results";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const [overview, results] = await Promise.all([loadImportOverview(), loadImportResults()]);

  return (
    <>
      <PageHeader
        title="Import & Analyze"
        subtitle="Turn local PGN files into training signals, then hand off directly into study."
      />
      <ImportAnalyzePanel overview={overview} results={results} />
    </>
  );
}
