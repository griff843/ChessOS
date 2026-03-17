"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Loader2,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  FileCode2,
  Sparkles,
  BarChart3,
  Paperclip,
} from "lucide-react";
import { runImportAnalysis, uploadPgnFiles } from "@/app/actions/import-analysis";
import { ImportResultsPanel } from "@/components/import/import-results";
import type { ImportAnalysisOverview, ImportPipelineStep, ImportResults } from "@/lib/import-types";

interface ImportAnalyzePanelProps {
  overview: ImportAnalysisOverview;
  results: ImportResults | null;
  repairQueue: {
    entries: Array<{
      sourceGameId: string;
      lineId: string;
      lineName: string;
      repairType: string;
      urgencyScore: number;
      scheduledDrillReason: string;
    }>;
  } | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusClasses(status: ImportAnalysisOverview["status"]): string {
  switch (status) {
    case "complete":
      return "bg-success/10 text-success";
    case "running":
      return "bg-info/10 text-info";
    case "failed":
      return "bg-danger/10 text-danger";
    case "ready":
      return "bg-accent/10 text-accent";
    default:
      return "bg-warning/10 text-warning";
  }
}

function StepRow({ step }: { step: ImportPipelineStep }) {
  const stepTone =
    step.status === "complete"
      ? "text-success"
      : step.status === "running"
        ? "text-info"
        : step.status === "failed"
          ? "text-danger"
          : "text-text-muted";

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-elevated px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-text-primary">{step.label}</p>
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${stepTone}`}>
          {step.status}
        </span>
      </div>
      {step.detail && <p className="mt-1 text-xs leading-relaxed text-text-muted">{step.detail}</p>}
    </div>
  );
}

export function ImportAnalyzePanel({ overview, results, repairQueue }: ImportAnalyzePanelProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadPending, startUpload] = useTransition();
  const [analysisPending, startAnalysis] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const steps = overview.lastAnalysis?.steps ?? [
    { key: "discover", label: "PGNs found", status: overview.readyFileCount > 0 ? "complete" : "pending", detail: overview.readyFileCount > 0 ? `${overview.readyFileCount} PGN file(s) available for analysis.` : "No PGN files found yet." },
    { key: "evaluate", label: "Games parsed and positions analyzed", status: "pending", detail: "Runs the canonical engine-backed worker pipeline." },
    { key: "train", label: "Model refreshed", status: "pending", detail: "Updates the tree model from the aggregated dataset." },
    { key: "targets", label: "Mistakes and targets detected", status: "pending", detail: "Builds training targets from analyzed game data." },
    { key: "exercises", label: "Training data ready", status: "pending", detail: "Exports the exercise corpus used by Sessions and the rest of the app." },
  ] satisfies ImportPipelineStep[];

  const selectedSummary = useMemo(() => {
    if (selectedFiles.length === 0) return "No files selected yet.";
    if (selectedFiles.length === 1) return selectedFiles[0];
    return `${selectedFiles.length} files selected: ${selectedFiles.slice(0, 3).join(", ")}${selectedFiles.length > 3 ? "..." : ""}`;
  }, [selectedFiles]);

  const handleUpload = () => {
    if (!formRef.current) return;
    setFeedback(null);
    const formData = new FormData(formRef.current);
    startUpload(async () => {
      const result = await uploadPgnFiles(formData);
      setFeedback({ type: result.success ? "success" : "error", message: result.message });
      if (result.success) {
        formRef.current?.reset();
        setSelectedFiles([]);
        router.refresh();
      }
    });
  };

  const handleAnalyze = () => {
    setFeedback(null);
    startAnalysis(async () => {
      const result = await runImportAnalysis();
      setFeedback({ type: result.success ? "success" : "error", message: result.message });
      router.refresh();
    });
  };

  const canUpload = overview.sourceDirWritable;
  const canAnalyze = overview.engineReady && overview.readyFileCount > 0 && overview.status !== "running";
  const readyToTrain = overview.pipelineReady && overview.status === "complete";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-accent/20 bg-[linear-gradient(135deg,rgba(99,102,241,0.08),rgba(15,23,42,0.02))] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClasses(overview.status)}`}>
                {overview.status}
              </span>
              {overview.stale && (
                <span className="inline-flex items-center rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-warning">
                  new PGNs detected
                </span>
              )}
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-text-primary">Bring your games into Chess OS</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
              Add `.pgn` files, let the local worker analyze them with Stockfish, and then move straight into Sessions, Dashboard, or Coach without leaving the app.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-surface-elevated px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Configured folder</p>
                <p className="mt-1 font-mono text-xs text-text-primary">{overview.sourceDirDisplay}</p>
              </div>
              <div className="rounded-xl bg-surface-elevated px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Accepted format</p>
                <p className="mt-1 text-sm font-medium text-text-primary">{overview.acceptedFormats.join(", ")}</p>
              </div>
              <div className="rounded-xl bg-surface-elevated px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Engine</p>
                <p className="mt-1 text-sm font-medium text-text-primary">{overview.engineReady ? "Stockfish ready" : "Needs setup"}</p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm rounded-2xl border border-border-subtle bg-surface/90 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <FolderOpen className="h-4 w-4 text-accent" />
              Import or refresh locally
            </div>
            <p className="mt-2 text-xs leading-relaxed text-text-muted">
              The app watches the configured PGN folder. Files added there show up below automatically. If that folder lives inside this workspace, you can also import directly from this page.
            </p>
            <form ref={formRef} className="mt-4 space-y-3">
              <input
                ref={inputRef}
                type="file"
                name="files"
                accept=".pgn"
                multiple
                disabled={!canUpload || uploadPending}
                onChange={(event) => {
                  const next = Array.from(event.target.files ?? []).map((file) => file.name);
                  setSelectedFiles(next);
                }}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={!canUpload || uploadPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface-elevated px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover disabled:opacity-50"
              >
                <Paperclip className="h-4 w-4 text-accent" />
                Choose PGN files
              </button>
              <div className="rounded-xl border border-border-subtle bg-surface-elevated px-3 py-3 text-xs text-text-secondary">
                {selectedSummary}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!canUpload || uploadPending || selectedFiles.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-surface px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent-muted disabled:opacity-50"
                >
                  {uploadPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploadPending ? "Importing..." : "Import selected PGNs"}
                </button>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={!canAnalyze || analysisPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
                >
                  {analysisPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                  {analysisPending ? "Analyzing..." : "Analyze PGNs"}
                </button>
              </div>
            </form>
            {!canUpload && (
              <p className="mt-3 text-xs leading-relaxed text-warning">
                Direct upload is disabled because `PGN_DIR` points outside the workspace. Place files in that folder manually and refresh this page.
              </p>
            )}
            <p className="mt-3 text-xs leading-relaxed text-text-muted">{overview.engineMessage}</p>
          </div>
        </div>

        {feedback && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-surface/80 px-4 py-3 text-sm">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-danger" />
            )}
            <span className={feedback.type === "success" ? "text-success" : "text-danger"}>{feedback.message}</span>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-semibold text-text-primary">PGN intake</h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-text-muted">
              Chess OS expects standard `.pgn` game files. Every file in <span className="font-mono text-text-primary">{overview.sourceDirDisplay}</span> is treated as a candidate input for analysis.
            </p>
            {overview.files.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-border-subtle bg-surface-elevated px-4 py-10 text-center">
                <p className="text-sm font-medium text-text-primary">No PGN files found</p>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">
                  Import a `.pgn` file above or copy one into the configured folder. Once at least one file is present, Chess OS can analyze it locally.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {overview.files.map((file) => (
                  <div key={file.absolutePath} className="rounded-xl border border-border-subtle bg-surface-elevated px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{file.name}</p>
                        <p className="mt-1 text-[11px] text-text-muted">{file.relativePath}</p>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="rounded-full bg-surface px-2 py-1 text-text-muted">{formatBytes(file.sizeBytes)}</span>
                        <span className={`rounded-full px-2 py-1 font-semibold ${file.analyzed ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          {file.analyzed ? "Analyzed" : "Needs analysis"}
                        </span>
                      </div>
                    </div>
                    {file.datasetPath && <p className="mt-2 text-[11px] text-text-muted">Artifact: {file.datasetPath}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-semibold text-text-primary">What analysis does</h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-text-muted">
              The app does not re-implement chess logic. It calls the canonical local worker pipeline: PGNs are parsed, positions are evaluated by Stockfish, mistakes become training targets, and the exercise corpus is rebuilt for the rest of Chess OS.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {steps.map((step) => (
                <StepRow key={step.key} step={step} />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-semibold text-text-primary">Pipeline visibility</h3>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-xl bg-surface-elevated px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">PGNs found</p>
                <p className="mt-1 text-2xl font-semibold text-text-primary">{overview.readyFileCount}</p>
              </div>
              <div className="rounded-xl bg-surface-elevated px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Game artifacts</p>
                <p className="mt-1 text-2xl font-semibold text-text-primary">{overview.lastAnalysis?.summary.gamesWithArtifacts ?? overview.analyzedFileCount}</p>
              </div>
              <div className="rounded-xl bg-surface-elevated px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Positions analyzed</p>
                <p className="mt-1 text-2xl font-semibold text-text-primary">{overview.lastAnalysis?.summary.positionsEvaluated ?? 0}</p>
              </div>
              <div className="rounded-xl bg-surface-elevated px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Training exercises</p>
                <p className="mt-1 text-2xl font-semibold text-text-primary">{overview.lastAnalysis?.summary.trainingExercises ?? 0}</p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-text-muted">{overview.nextRecommendedAction}</p>
            {overview.lastAnalysis?.logPath && (
              <p className="mt-2 text-[11px] text-text-muted">Log: {overview.lastAnalysis.logPath}</p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-text-primary">Ready to train next</h3>
            <p className="mt-2 text-xs leading-relaxed text-text-muted">
              After analysis succeeds, generate a study session or review the synthesized story of your games in Dashboard and Coach.
            </p>
            <div className="mt-4 grid gap-3">
              <Link href="/sessions" className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${readyToTrain ? "border-accent/30 bg-accent-muted text-accent hover:bg-accent-muted/80" : "border-border-subtle bg-surface-elevated text-text-secondary hover:bg-surface-hover"}`}>
                Generate Session / Go to Sessions
              </Link>
              <Link href="/" className="rounded-xl border border-border-subtle bg-surface-elevated px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover">
                Open Dashboard
              </Link>
              <Link href="/coach" className="rounded-xl border border-border-subtle bg-surface-elevated px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover">
                Open Coach
              </Link>
            </div>
          </div>

          {repairQueue && (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <h3 className="text-sm font-semibold text-text-primary">Games Needing Repair</h3>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                Deterministic repertoire repair candidates generated from imported games. Hand off directly into a targeted drill.
              </p>
              <div className="mt-4 space-y-3">
                {repairQueue.entries.slice(0, 3).map((entry) => (
                  <div key={`${entry.sourceGameId}-${entry.lineId}`} className="rounded-xl bg-surface-elevated px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-text-primary">{entry.lineName}</p>
                      <span className="rounded-full bg-warning/10 px-2 py-1 text-[11px] font-semibold text-warning">
                        {entry.repairType.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">Source game {entry.sourceGameId} · urgency {entry.urgencyScore.toFixed(2)}</p>
                    <p className="mt-1 text-xs text-text-muted">{entry.scheduledDrillReason}</p>
                    <Link
                      href={`/repertoire?preferredLineId=${encodeURIComponent(entry.lineId)}`}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-muted px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent-muted/80"
                    >
                      Start repair drill
                    </Link>
                  </div>
                ))}
                {repairQueue.entries.length === 0 && (
                  <div className="rounded-xl bg-surface-elevated px-4 py-3 text-xs text-text-muted">
                    No urgent import-to-repair lines yet. Once a seeded repertoire line fails in real games, it will surface here.
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-text-primary">Artifacts produced</h3>
            <div className="mt-4 space-y-2">
              {overview.pipelineArtifacts.map((artifact) => (
                <div key={artifact.label} className="flex items-center justify-between rounded-xl bg-surface-elevated px-4 py-3 text-xs">
                  <div>
                    <p className="font-medium text-text-primary">{artifact.label}</p>
                    <p className="mt-1 text-text-muted">{artifact.path}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 font-semibold ${artifact.exists ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                    {artifact.exists ? "Present" : "Missing"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {results && <ImportResultsPanel results={results} />}
    </div>
  );
}
