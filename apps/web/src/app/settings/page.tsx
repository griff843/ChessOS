import Link from "next/link";
import { checkArtifactHealth, getOutDir, getRoot, loadImportOverview } from "@/lib/artifacts";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { SettingsActions } from "@/components/settings/settings-actions";
import { TrainingWorkflowGuide } from "@/components/onboarding/training-workflow-guide";
import { formatRelativeDate } from "@/lib/utils";
import {
  Settings,
  HardDrive,
  CheckCircle,
  XCircle,
  Database,
  AlertTriangle,
  Upload,
  ArrowRight,
  Activity,
} from "lucide-react";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ARTIFACT_GROUPS: Record<string, string[]> = {
  "Import Workflow": [
    "Import Analysis Status",
    "Aggregated Dataset",
    "Tree Model",
    "Training Exercises",
  ],
  "Pipeline Data": [
    "Feature Ablation",
  ],
  Progress: [
    "Exercise Progress",
    "Session History",
    "Trend Profile",
    "Difficulty Policy",
    "Review Queue",
  ],
  Insights: [
    "Learner Overview",
    "Trend Report",
    "Review Report",
    "Coaching Summary",
    "Study Plan",
    "Mistake Patterns",
    "Curriculum Plan",
  ],
  "Strategic Intelligence": [
    "Pattern Intelligence",
    "Readiness Forecast",
    "Intelligence Report",
  ],
  "Cognitive Training": ["Pattern Library"],
  "Objective Layer": [
    "Training Objective",
    "Objective Progress",
    "Objective Coaching",
    "Objective Coaching Markdown",
    "Intervention Effectiveness",
    "Intervention Memory",
    "Intervention Effectiveness Markdown",
    "Intervention History",
    "Objective History",
  ],
};

const GROUP_GUIDANCE: Record<string, string> = {
  "Import Workflow": "Use Import & Analyze to confirm PGNs are visible and refresh the canonical worker pipeline from the browser.",
  "Pipeline Data": "Feature ablation remains a model diagnostic artifact. Regenerate it from the worker when you need model audit coverage.",
  Progress: "Generate and complete a study session to build progress data.",
  Insights: 'Click "Refresh Insights" above to generate dashboard, coach, and curriculum.',
  "Strategic Intelligence": "Generated automatically when you generate a session or refresh insights.",
  "Cognitive Training": 'Run: pnpm --filter worker run generate-patterns',
  "Objective Layer": "Generated automatically during session generation and insight refresh.",
};

export default async function SettingsPage() {
  const [health, importOverview] = await Promise.all([checkArtifactHealth(), loadImportOverview()]);
  const healthMap = new Map(health.map((h) => [h.name, h]));
  const totalPresent = health.filter((h) => h.exists).length;
  const totalInvalid = health.filter((h) => h.exists && h.valid === false).length;
  const readiness = {
    pipelineReady: healthMap.get("Training Exercises")?.exists ?? false,
    progressReady: healthMap.get("Exercise Progress")?.exists ?? false,
    insightsReady: healthMap.get("Learner Overview")?.exists ?? false,
    canStudy: healthMap.get("Training Exercises")?.exists ?? false,
    canRefreshInsights: healthMap.get("Exercise Progress")?.exists ?? false,
  };

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle={
          totalInvalid > 0
            ? `${totalPresent} of ${health.length} artifacts present · ${totalInvalid} invalid`
            : `${totalPresent} of ${health.length} artifacts present`
        }
      />

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Environment" subtitle="Local system configuration">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-surface-elevated px-4 py-3">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-text-muted" />
                <span className="text-sm text-text-secondary">Project Root</span>
              </div>
              <span className="font-mono text-xs text-text-primary">{getRoot()}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-elevated px-4 py-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-text-muted" />
                <span className="text-sm text-text-secondary">Output Directory</span>
              </div>
              <span className="font-mono text-xs text-text-primary">{getOutDir()}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-elevated px-4 py-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-text-muted" />
                <span className="text-sm text-text-secondary">Mode</span>
              </div>
              <Badge variant="accent">Local · Deterministic · Private</Badge>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Import & Analyze" subtitle="PGN intake and latest analysis health">
          <div className="space-y-3">
            <div className="rounded-lg bg-surface-elevated px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-accent" />
                  <span className="text-sm text-text-secondary">PGN Folder</span>
                </div>
                <span className="font-mono text-[11px] text-text-primary">{importOverview.sourceDirDisplay}</span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-surface-elevated px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">PGNs Ready</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">{importOverview.readyFileCount}</p>
              </div>
              <div className="rounded-lg bg-surface-elevated px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Last Status</p>
                <p className="mt-1 text-xl font-semibold text-text-primary">{importOverview.status}</p>
              </div>
            </div>
            <div className="rounded-lg bg-surface-elevated px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-accent" />
                  <span className="text-sm text-text-secondary">Engine</span>
                </div>
                <span className={`text-xs font-medium ${importOverview.engineReady ? "text-success" : "text-warning"}`}>
                  {importOverview.engineReady ? "Ready" : "Needs setup"}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-text-muted">{importOverview.engineMessage}</p>
              {importOverview.lastAnalysis?.completedAt && (
                <p className="mt-2 text-[11px] text-text-muted">
                  Last completed {formatRelativeDate(importOverview.lastAnalysis.completedAt)}
                </p>
              )}
            </div>
            <Link href="/import" className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80">
              Open Import & Analyze
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </SectionCard>
      </div>

      <div className="mb-6">
        <SectionCard title="Quick Actions" subtitle="Generate sessions and refresh insights from the browser">
          <SettingsActions />
        </SectionCard>
      </div>

      <div className="mb-6">
        <TrainingWorkflowGuide readiness={readiness} />
      </div>

      <div className="space-y-6">
        {Object.entries(ARTIFACT_GROUPS).map(([group, names]) => {
          const artifacts = names.map((name) => healthMap.get(name)).filter(Boolean);
          const present = artifacts.filter((a) => a!.exists).length;
          const invalid = artifacts.filter((a) => a!.exists && a!.valid === false).length;
          const missing = artifacts.filter((a) => !a!.exists);

          return (
            <SectionCard
              key={group}
              title={group}
              subtitle={
                invalid > 0
                  ? `${present} of ${artifacts.length} present · ${invalid} invalid`
                  : `${present} of ${artifacts.length} present`
              }
            >
              <div className="space-y-1.5">
                {artifacts.map((a) => (
                  <div key={a!.name} className="rounded-lg bg-surface-elevated px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {!a!.exists ? (
                          <XCircle className="h-3.5 w-3.5 text-danger" />
                        ) : a!.valid === false ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5 text-success" />
                        )}
                        <span className="text-xs text-text-primary">{a!.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {a!.exists && a!.lastModified && (
                          <span className="text-[10px] text-text-muted">{formatRelativeDate(a!.lastModified)}</span>
                        )}
                        {a!.exists && a!.sizeBytes !== null && (
                          <span className="text-[10px] text-text-muted">{formatBytes(a!.sizeBytes)}</span>
                        )}
                        {!a!.exists && (
                          <span className="font-mono text-[10px] text-text-muted">{a!.path}</span>
                        )}
                      </div>
                    </div>
                    {a!.exists && a!.valid === false && a!.validationError && (
                      <p className="mt-1 text-[10px] text-warning">{a!.validationError}</p>
                    )}
                  </div>
                ))}

                {missing.length > 0 && GROUP_GUIDANCE[group] && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg border border-warning/20 bg-warning-muted px-3 py-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                    <span className="text-[11px] leading-relaxed text-warning">{GROUP_GUIDANCE[group]}</span>
                  </div>
                )}
              </div>
            </SectionCard>
          );
        })}
      </div>
    </>
  );
}

