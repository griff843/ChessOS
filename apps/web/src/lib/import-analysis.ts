import { mkdir, readdir, readFile, stat, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { basename, extname, join, relative, resolve } from "path";
import { findStockfish } from "@/lib/stockfish";
import { loadJsonSafe } from "./safe-parse";
import { ROOT, OUT } from "./paths";
import type {
  ImportAnalysisOverview,
  ImportAnalysisStatus,
  ImportPipelineStep,
  ImportTrackedArtifact,
  PgnFileDescriptor,
} from "./import-types";

const IMPORT_DIR = join(OUT, "import");
const STATUS_PATH = join(IMPORT_DIR, "analysis-status.json");
const LOG_PATH = join(IMPORT_DIR, "analysis.log");
const DEFAULT_PGN_DIR = join(ROOT, "data", "pgn");

const PIPELINE_STEP_TEMPLATE: Array<Pick<ImportPipelineStep, "key" | "label">> = [
  { key: "discover", label: "PGNs found" },
  { key: "evaluate", label: "Games parsed and positions analyzed" },
  { key: "train", label: "Model refreshed" },
  { key: "targets", label: "Mistakes and targets detected" },
  { key: "exercises", label: "Training data ready" },
];

function toDisplayPath(path: string): string {
  const rel = relative(ROOT, path);
  if (!rel || rel.startsWith("..")) return path;
  return rel.replace(/\\/g, "/");
}

function isInsideRoot(path: string): boolean {
  const rel = relative(ROOT, path);
  return rel === "" || (!rel.startsWith("..") && !resolve(path).startsWith("\\\\"));
}

function emptySteps(): ImportPipelineStep[] {
  return PIPELINE_STEP_TEMPLATE.map((step) => ({
    ...step,
    status: "pending",
    detail: null,
  }));
}

async function countJsonlRows(path: string): Promise<number> {
  try {
    const raw = await readFile(path, "utf-8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0).length;
  } catch {
    return 0;
  }
}

async function listPgnFiles(sourceDir: string): Promise<PgnFileDescriptor[]> {
  try {
    const entries = await readdir(sourceDir, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".pgn")
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(async (entry) => {
          const absolutePath = join(sourceDir, entry.name);
          const fileStat = await stat(absolutePath);
          const gameId = basename(entry.name, extname(entry.name));
          const datasetPath = join(OUT, "games", gameId, "training-dataset.json");
          const analyzed = existsSync(datasetPath);
          return {
            name: entry.name,
            absolutePath,
            relativePath: toDisplayPath(absolutePath),
            sizeBytes: fileStat.size,
            lastModified: fileStat.mtime.toISOString(),
            analyzed,
            datasetPath: analyzed ? toDisplayPath(datasetPath) : null,
          };
        })
    );
    return files;
  } catch {
    return [];
  }
}

async function getPipelineArtifacts(): Promise<ImportTrackedArtifact[]> {
  const artifacts = [
    { label: "Analysis Status", path: STATUS_PATH },
    { label: "Analysis Log", path: LOG_PATH },
    { label: "Aggregated Dataset", path: join(OUT, "datasets", "all-games.jsonl") },
    { label: "Tree Model", path: join(OUT, "models", "tree-model.json") },
    { label: "Training Targets", path: join(OUT, "datasets", "training-targets.jsonl") },
    { label: "Training Exercises", path: join(OUT, "datasets", "training-exercises.jsonl") },
  ];

  return Promise.all(
    artifacts.map(async (artifact) => {
      try {
        const fileStat = await stat(artifact.path);
        return {
          label: artifact.label,
          path: toDisplayPath(artifact.path),
          exists: true,
          sizeBytes: fileStat.size,
          lastModified: fileStat.mtime.toISOString(),
        };
      } catch {
        return {
          label: artifact.label,
          path: toDisplayPath(artifact.path),
          exists: false,
          sizeBytes: null,
          lastModified: null,
        };
      }
    })
  );
}

async function buildSummary(files: PgnFileDescriptor[]) {
  const [positionsEvaluated, trainingTargets, trainingExercises] = await Promise.all([
    countJsonlRows(join(OUT, "datasets", "all-games.jsonl")),
    countJsonlRows(join(OUT, "datasets", "training-targets.jsonl")),
    countJsonlRows(join(OUT, "datasets", "training-exercises.jsonl")),
  ]);

  return {
    gamesDetected: files.length,
    gamesWithArtifacts: files.filter((file) => file.analyzed).length,
    positionsEvaluated,
    trainingTargets,
    trainingExercises,
  };
}

export function getImportSourceDir(): string {
  const configured = process.env.PGN_DIR?.trim();
  return configured ? resolve(configured) : DEFAULT_PGN_DIR;
}

export function getImportStatusPath(): string {
  return STATUS_PATH;
}

export function getImportLogPath(): string {
  return LOG_PATH;
}

export async function ensureImportWorkspace(): Promise<void> {
  await mkdir(IMPORT_DIR, { recursive: true });
}

export async function writeImportAnalysisStatus(status: ImportAnalysisStatus): Promise<void> {
  await ensureImportWorkspace();
  await writeFile(STATUS_PATH, JSON.stringify(status, null, 2), "utf-8");
}

export async function loadImportAnalysisStatus(): Promise<ImportAnalysisStatus | null> {
  const result = await loadJsonSafe<ImportAnalysisStatus>(STATUS_PATH);
  return result.ok ? result.data : null;
}

export async function createImportAnalysisStatus(
  input: Partial<ImportAnalysisStatus> & Pick<ImportAnalysisStatus, "status" | "steps">
): Promise<ImportAnalysisStatus> {
  const sourceDir = input.sourceDir ?? getImportSourceDir();
  const files = await listPgnFiles(sourceDir);
  const artifacts = input.artifacts ?? (await getPipelineArtifacts());
  const summary = input.summary ?? (await buildSummary(files));

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status: input.status,
    sourceDir,
    sourceDirDisplay: input.sourceDirDisplay ?? toDisplayPath(sourceDir),
    engineMode: "stockfish",
    engineBinary: input.engineBinary ?? null,
    startedAt: input.startedAt ?? null,
    completedAt: input.completedAt ?? null,
    failedAt: input.failedAt ?? null,
    error: input.error ?? null,
    latestSourceMtime:
      input.latestSourceMtime ?? files.map((file) => file.lastModified).sort().at(-1) ?? null,
    fileCount: input.fileCount ?? files.length,
    steps: input.steps,
    summary,
    artifacts,
    logPath: input.logPath ?? toDisplayPath(LOG_PATH),
  };
}

export async function getImportAnalysisOverview(): Promise<ImportAnalysisOverview> {
  const sourceDir = getImportSourceDir();
  const [files, lastAnalysis, pipelineArtifacts] = await Promise.all([
    listPgnFiles(sourceDir),
    loadImportAnalysisStatus(),
    getPipelineArtifacts(),
  ]);

  let engineReady = false;
  let engineBinary: string | null = null;
  let engineMessage = "Stockfish is required for full game analysis.";

  try {
    engineBinary = findStockfish();
    engineReady = true;
    engineMessage = `Stockfish ready at ${toDisplayPath(engineBinary)}`;
  } catch (error) {
    engineMessage = error instanceof Error ? error.message : "Stockfish binary not available.";
  }

  const latestSourceMtime = files.map((file) => file.lastModified).sort().at(-1) ?? null;
  const completedAt = lastAnalysis?.completedAt ?? null;
  const stale =
    completedAt !== null &&
    latestSourceMtime !== null &&
    new Date(latestSourceMtime).getTime() > new Date(completedAt).getTime();

  const exercisesReady = pipelineArtifacts.some(
    (artifact) => artifact.label === "Training Exercises" && artifact.exists
  );

  const pipelineComplete = exercisesReady && files.length > 0 && files.every((file) => file.analyzed) && !stale;

  const status: ImportAnalysisOverview["status"] =
    files.length === 0
      ? "idle"
      : pipelineComplete
        ? "complete"
        : lastAnalysis?.status === "running"
          ? "running"
          : lastAnalysis?.status === "failed"
            ? "failed"
            : "ready";

  const nextRecommendedAction =
    status === "idle"
      ? "Add one or more .pgn files, then analyze them."
      : status === "ready"
        ? "Run analysis to convert your games into training data."
        : status === "running"
          ? "Analysis is running locally. Keep this tab open until it finishes."
          : status === "failed"
            ? "Fix the pipeline issue and retry analysis."
            : "Your training artifacts are ready. Generate a session or open Dashboard and Coach.";

  return {
    status,
    sourceDir,
    sourceDirDisplay: toDisplayPath(sourceDir),
    sourceDirExists: existsSync(sourceDir),
    sourceDirWritable: isInsideRoot(sourceDir),
    acceptedFormats: [".pgn"],
    engineReady,
    engineMessage,
    engineBinary: engineBinary === null ? null : toDisplayPath(engineBinary),
    files,
    readyFileCount: files.length,
    analyzedFileCount: files.filter((file) => file.analyzed).length,
    stale: status === "complete" ? stale : files.length > 0 && lastAnalysis !== null && stale,
    pipelineReady: exercisesReady,
    nextRecommendedAction,
    lastAnalysis,
    pipelineArtifacts,
  };
}

export function defaultImportPipelineSteps(): ImportPipelineStep[] {
  return emptySteps();
}