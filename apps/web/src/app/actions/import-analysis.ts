"use server";

import { appendFile, mkdir, readFile, writeFile } from "fs/promises";
import { basename, extname, join, relative } from "path";
import { revalidatePath } from "next/cache";
import { findStockfish } from "@/lib/stockfish";
import {
  createImportAnalysisStatus,
  defaultImportPipelineSteps,
  ensureImportWorkspace,
  getImportAnalysisOverview,
  getImportLogPath,
  getImportSourceDir,
  writeImportAnalysisStatus,
} from "@/lib/import-analysis";
import { ROOT } from "@/lib/paths";
import { runImportEvaluationBatch } from "@/lib/import-worker";
import type { ImportAnalysisStatus, ImportPipelineStep } from "@/lib/import-types";

export interface UploadPgnFilesResult {
  success: boolean;
  importedCount: number;
  message: string;
}

export interface RunImportAnalysisResult {
  success: boolean;
  didRun: boolean;
  status: ImportAnalysisStatus | null;
  message: string;
}

let analysisRunning = false;

function createCompletedSteps(
  readyFileCount: number,
  analyzedFileCount: number
): ImportPipelineStep[] {
  return [
    {
      key: "discover",
      label: "PGNs found",
      status: "complete",
      detail: `${readyFileCount} PGN file(s) detected`,
    },
    {
      key: "evaluate",
      label: "Games parsed and positions analyzed",
      status: "complete",
      detail: `${analyzedFileCount} game artifact(s) already available`,
    },
    {
      key: "train",
      label: "Model refreshed",
      status: "complete",
      detail: "Model artifacts already available.",
    },
    {
      key: "targets",
      label: "Mistakes and targets detected",
      status: "complete",
      detail: "Training targets already exported.",
    },
    {
      key: "exercises",
      label: "Training data ready",
      status: "complete",
      detail: "Training exercises already available.",
    },
  ];
}

function isInsideRoot(path: string): boolean {
  const rel = relative(ROOT, path);
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith("\\"));
}

function sanitizeFileName(name: string): string {
  return basename(name).replace(/[^A-Za-z0-9._-]+/g, "-");
}

function setStep(
  steps: ImportPipelineStep[],
  key: string,
  status: ImportPipelineStep["status"],
  detail: string | null
): ImportPipelineStep[] {
  return steps.map((step) => (step.key === key ? { ...step, status, detail } : step));
}

async function persistStatus(
  input: Partial<ImportAnalysisStatus> & Pick<ImportAnalysisStatus, "status" | "steps">
) {
  const status = await createImportAnalysisStatus(input);
  await writeImportAnalysisStatus(status);
  return status;
}

async function appendLog(message: string): Promise<void> {
  await ensureImportWorkspace();
  await appendFile(getImportLogPath(), `${message}\n`, "utf-8");
}

async function runLoggedStep<T>(label: string, action: () => Promise<T> | T): Promise<T> {
  await appendLog(`[import] ${label} started`);
  const result = await action();
  await appendLog(`[import] ${label} complete`);
  return result;
}

function withImportEnvironment<T>(
  values: Record<string, string>,
  action: () => Promise<T>
): Promise<T> {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    process.env[key] = value;
  }

  return action().finally(() => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}

function revalidateImportSurfaces() {
  revalidatePath("/");
  revalidatePath("/import");
  revalidatePath("/sessions");
  revalidatePath("/settings");
  revalidatePath("/coach");
}

function resolveWorkerModule<T>(mod: T | { default: T }): T {
  if (typeof mod === "object" && mod !== null && "default" in mod) {
    return mod.default;
  }
  return mod;
}

export async function uploadPgnFiles(formData: FormData): Promise<UploadPgnFilesResult> {
  const sourceDir = getImportSourceDir();
  if (!isInsideRoot(sourceDir)) {
    return {
      success: false,
      importedCount: 0,
      message: `PGN_DIR points outside the workspace (${sourceDir}). Place files there manually.`,
    };
  }

  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length === 0) {
    return {
      success: false,
      importedCount: 0,
      message: "Choose one or more .pgn files to import.",
    };
  }

  await mkdir(sourceDir, { recursive: true });

  let importedCount = 0;
  let reusedCount = 0;
  for (const file of files) {
    if (extname(file.name).toLowerCase() !== ".pgn") continue;
    const targetPath = join(sourceDir, sanitizeFileName(file.name));
    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      const existing = await readFile(targetPath);
      if (Buffer.compare(existing, buffer) === 0) {
        reusedCount += 1;
        continue;
      }
    } catch {
      // File does not exist yet.
    }

    await writeFile(targetPath, buffer);
    importedCount += 1;
  }

  revalidateImportSurfaces();

  const totalRecognized = importedCount + reusedCount;

  return {
    success: totalRecognized > 0,
    importedCount,
    message:
      importedCount > 0 && reusedCount > 0
        ? `${importedCount} PGN file${importedCount === 1 ? "" : "s"} imported and ${reusedCount} already present in ${sourceDir}.`
        : importedCount > 0
          ? `${importedCount} PGN file${importedCount === 1 ? "" : "s"} saved to ${sourceDir}.`
          : reusedCount > 0
            ? `${reusedCount} PGN file${reusedCount === 1 ? "" : "s"} already present in ${sourceDir}.`
            : "No valid .pgn files were imported.",
  };
}

export async function runImportAnalysis(): Promise<RunImportAnalysisResult> {
  if (analysisRunning) {
    const status = await persistStatus({
      status: "running",
      steps: defaultImportPipelineSteps(),
    });
    return {
      success: false,
      didRun: false,
      status,
      message: "Analysis is already running.",
    };
  }

  const overview = await getImportAnalysisOverview();
  if (!overview.engineReady) {
    const status = await persistStatus({
      status: "failed",
      steps: defaultImportPipelineSteps(),
      failedAt: new Date().toISOString(),
      error: overview.engineMessage,
    });
    return {
      success: false,
      didRun: false,
      status,
      message: overview.engineMessage,
    };
  }

  if (overview.readyFileCount === 0) {
    const status = await persistStatus({
      status: "idle",
      steps: defaultImportPipelineSteps(),
      error: null,
    });
    return {
      success: false,
      didRun: false,
      status,
      message: "No PGN files found. Import or place .pgn files in the configured folder first.",
    };
  }

  if (
    overview.pipelineReady &&
    !overview.stale &&
    overview.analyzedFileCount === overview.readyFileCount
  ) {
    const status =
      overview.lastAnalysis?.status === "complete"
        ? overview.lastAnalysis
        : await persistStatus({
            status: "complete",
            steps: createCompletedSteps(overview.readyFileCount, overview.analyzedFileCount),
            startedAt: overview.lastAnalysis?.startedAt ?? null,
            completedAt: overview.lastAnalysis?.completedAt ?? new Date().toISOString(),
            failedAt: null,
            error: null,
            engineBinary: overview.engineBinary ?? null,
          });

    return {
      success: true,
      didRun: false,
      status,
      message: "Analysis is already up to date for the current PGN files.",
    };
  }

  analysisRunning = true;
  const startedAt = new Date().toISOString();
  const stockfishPath = findStockfish();
  await ensureImportWorkspace();
  await writeFile(getImportLogPath(), `[import] ${startedAt} starting import analysis\n`, "utf-8");

  let steps = defaultImportPipelineSteps();
  steps = setStep(
    steps,
    "discover",
    "running",
    `${overview.readyFileCount} PGN file(s) queued from ${overview.sourceDirDisplay}`
  );
  let status = await persistStatus({
    status: "running",
    steps,
    startedAt,
    completedAt: null,
    failedAt: null,
    error: null,
    engineBinary: stockfishPath,
  });

  try {
    status = await withImportEnvironment(
      {
        PGN_DIR: overview.sourceDir,
        ENGINE_MODE: "stockfish",
        STOCKFISH_PATH: stockfishPath,
      },
      async () => {
        const workerIndex = { processDirectory: runImportEvaluationBatch };
        await runLoggedStep("worker:index", async () => {
          await workerIndex.processDirectory(overview.sourceDir, "stockfish");
        });

        steps = setStep(
          steps,
          "discover",
          "complete",
          `${overview.readyFileCount} PGN file(s) detected`
        );
        steps = setStep(
          steps,
          "evaluate",
          "complete",
          "Game artifacts refreshed from canonical engine analysis."
        );
        await persistStatus({
          status: "running",
          steps,
          startedAt,
          engineBinary: stockfishPath,
        });

        steps = setStep(steps, "train", "running", "Refreshing the model from the aggregated dataset.");
        await persistStatus({
          status: "running",
          steps,
          startedAt,
          engineBinary: stockfishPath,
        });
        const trainModule = resolveWorkerModule(await import("../../../../worker/src/train"));
        const trainResult = await runLoggedStep("worker:train", async () => trainModule.runTrainingModel());
        await appendLog(`[import] train rows=${trainResult.totalRows} tree=${trainResult.treeArtifactPath}`);
        steps = setStep(steps, "train", "complete", "Tree model and analysis artifacts refreshed.");
        await persistStatus({
          status: "running",
          steps,
          startedAt,
          engineBinary: stockfishPath,
        });

        steps = setStep(
          steps,
          "targets",
          "running",
          "Scoring analyzed mistakes into training targets."
        );
        await persistStatus({
          status: "running",
          steps,
          startedAt,
          engineBinary: stockfishPath,
        });
        const targetsModule = resolveWorkerModule(await import(
          "../../../../worker/src/generate-training-targets"
        ));
        const targetsResult = await runLoggedStep("worker:targets", async () =>
          targetsModule.generateTrainingTargets()
        );
        await appendLog(
          `[import] targets total=${targetsResult.totalTargets} aggregated=${targetsResult.aggregatedPath}`
        );
        steps = setStep(
          steps,
          "targets",
          "complete",
          "Mistakes and targets exported for training selection."
        );
        await persistStatus({
          status: "running",
          steps,
          startedAt,
          engineBinary: stockfishPath,
        });

        steps = setStep(
          steps,
          "exercises",
          "running",
          "Building the exercise corpus used by Sessions and Dashboard."
        );
        await persistStatus({
          status: "running",
          steps,
          startedAt,
          engineBinary: stockfishPath,
        });
        const exercisesModule = resolveWorkerModule(await import(
          "../../../../worker/src/generate-exercises"
        ));
        const exercisesResult = await runLoggedStep("worker:exercises", async () =>
          exercisesModule.generateTrainingExercises()
        );
        await appendLog(
          `[import] exercises total=${exercisesResult.totalExercises} aggregated=${exercisesResult.aggregatedPath}`
        );
        steps = setStep(
          steps,
          "exercises",
          "complete",
          "Training exercises are ready for session generation."
        );

        return persistStatus({
          status: "complete",
          steps,
          startedAt,
          completedAt: new Date().toISOString(),
          failedAt: null,
          error: null,
          engineBinary: stockfishPath,
        });
      }
    );

    revalidateImportSurfaces();

    return {
      success: true,
      didRun: true,
      status,
      message: `Analysis complete: ${status.summary.trainingExercises} exercise(s) ready from ${status.summary.gamesWithArtifacts} game artifact(s).`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import analysis failed.";
    await appendLog(`[import] failed: ${message}`);
    status = await persistStatus({
      status: "failed",
      steps: steps.map((step) =>
        step.status === "running" ? { ...step, status: "failed", detail: message } : step
      ),
      startedAt,
      failedAt: new Date().toISOString(),
      error: message,
      engineBinary: stockfishPath,
    });

    revalidateImportSurfaces();

    return {
      success: false,
      didRun: true,
      status,
      message,
    };
  } finally {
    analysisRunning = false;
  }
}




