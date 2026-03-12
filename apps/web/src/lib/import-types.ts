export type ImportWorkflowStatus = "idle" | "ready" | "running" | "complete" | "failed";

export type ImportPipelineStepStatus = "pending" | "running" | "complete" | "failed";

export type ImportSessionPreset =
  | "tactical_recovery"
  | "opening_mistakes"
  | "endgame_mistakes"
  | "mixed_improvement";

export interface ImportPipelineStep {
  key: string;
  label: string;
  status: ImportPipelineStepStatus;
  detail: string | null;
}

export interface ImportTrackedArtifact {
  label: string;
  path: string;
  exists: boolean;
  sizeBytes: number | null;
  lastModified: string | null;
}

export interface PgnFileDescriptor {
  name: string;
  absolutePath: string;
  relativePath: string;
  sizeBytes: number;
  lastModified: string;
  analyzed: boolean;
  datasetPath: string | null;
}

export interface ImportAnalysisSummary {
  gamesDetected: number;
  gamesWithArtifacts: number;
  positionsEvaluated: number;
  trainingTargets: number;
  trainingExercises: number;
}

export interface ImportAnalysisStatus {
  generatedAt: string;
  status: ImportWorkflowStatus;
  sourceDir: string;
  sourceDirDisplay: string;
  engineMode: "stockfish";
  engineBinary: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  error: string | null;
  latestSourceMtime: string | null;
  fileCount: number;
  steps: ImportPipelineStep[];
  summary: ImportAnalysisSummary;
  artifacts: ImportTrackedArtifact[];
  logPath: string | null;
}

export interface ImportAnalysisOverview {
  status: ImportWorkflowStatus;
  sourceDir: string;
  sourceDirDisplay: string;
  sourceDirExists: boolean;
  sourceDirWritable: boolean;
  acceptedFormats: string[];
  engineReady: boolean;
  engineMessage: string;
  engineBinary: string | null;
  files: PgnFileDescriptor[];
  readyFileCount: number;
  analyzedFileCount: number;
  stale: boolean;
  pipelineReady: boolean;
  nextRecommendedAction: string;
  lastAnalysis: ImportAnalysisStatus | null;
  pipelineArtifacts: ImportTrackedArtifact[];
}

export interface ImportThemeSummary {
  key: string;
  label: string;
  count: number;
  preset: ImportSessionPreset;
}

export interface ImportGameDetail {
  positionId: string;
  ply: number;
  move: string;
  evaluationSwing: number;
  theme: string;
  suggestedTraining: string;
  difficulty: string;
}

export interface ImportGameResult {
  gameId: string;
  fileName: string;
  opponent: string;
  mistakes: number;
  themes: string[];
  themeCounts: ImportThemeSummary[];
  details: ImportGameDetail[];
}

export interface ImportSessionOption {
  preset: ImportSessionPreset;
  label: string;
  description: string;
  recommendedThemes: string[];
}

export interface ImportResults {
  generatedAt: string;
  summary: {
    gamesAnalyzed: number;
    positionsAnalyzed: number;
    exercisesGenerated: number;
  };
  topThemes: ImportThemeSummary[];
  games: ImportGameResult[];
  sessionOptions: ImportSessionOption[];
}
