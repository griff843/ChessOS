import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";
import type { ReadinessStatus } from "@/lib/artifacts";
import { ArrowRight, CheckCircle2, Upload, PlayCircle, GraduationCap } from "lucide-react";

interface TrainingWorkflowGuideProps {
  readiness: ReadinessStatus;
  title?: string;
  subtitle?: string;
}

function StatusPill({ complete, label }: { complete: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${
        complete ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
      }`}
    >
      <CheckCircle2 className="h-3 w-3" />
      {label}
    </span>
  );
}

export function TrainingWorkflowGuide({
  readiness,
  title = "Games to Training",
  subtitle = "Use Import & Analyze as the local-first front door: add PGNs, run the canonical worker pipeline, then move into sessions and coaching.",
}: TrainingWorkflowGuideProps) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg bg-surface-elevated px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <Upload className="h-4 w-4 text-accent" />
            <StatusPill complete={readiness.pipelineReady} label={readiness.pipelineReady ? "PGNs analyzed" : "Needs import"} />
          </div>
          <p className="mt-3 text-sm font-medium text-text-primary">1. Import and analyze PGNs</p>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            Open the in-app Import & Analyze flow to see the PGN folder, import files, and run the local worker pipeline.
          </p>
          <Link href="/import" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80">
            Open Import & Analyze
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-lg bg-surface-elevated px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <PlayCircle className="h-4 w-4 text-accent" />
            <StatusPill complete={readiness.canStudy} label={readiness.canStudy ? "Ready for sessions" : "Blocked on analysis"} />
          </div>
          <p className="mt-3 text-sm font-medium text-text-primary">2. Generate a session</p>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            Once exercises exist, Sessions can compose a study block from your analyzed mistakes and priorities.
          </p>
          <Link href="/sessions" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80">
            Open Sessions
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-lg bg-surface-elevated px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <GraduationCap className="h-4 w-4 text-accent" />
            <StatusPill complete={readiness.canRefreshInsights} label={readiness.canRefreshInsights ? "Ready for insights" : "Train first"} />
          </div>
          <p className="mt-3 text-sm font-medium text-text-primary">3. Review what the analysis produced</p>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            After you study, Dashboard and Coach explain the signals, priorities, and next interventions to focus on.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <Link href="/" className="font-medium text-accent hover:text-accent/80">Dashboard</Link>
            <Link href="/coach" className="font-medium text-accent hover:text-accent/80">Coach</Link>
            <Link href="/settings" className="font-medium text-accent hover:text-accent/80">Settings</Link>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

