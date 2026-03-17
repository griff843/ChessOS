import type { PositionSnapshot } from "@chess-os/chess-core";

export interface EngineAnalysisRequest {
  fen: string;
  depth?: number;
  multiPv?: number;
}

export interface EngineLine {
  move: string;
  scoreCp?: number;
  mateIn?: number;
  pv?: string[];
}

export interface EngineAnalysisResult {
  bestLine: EngineLine;
  candidateLines: EngineLine[];
}

export interface AnalysisEngine {
  analyzePosition(input: EngineAnalysisRequest): Promise<EngineAnalysisResult>;
  quit?(): Promise<void>;
}

/**
 * Engine evaluation output per ENGINE_EVAL_CONTRACT.md.
 * Preserves all original snapshot fields, adds engine metadata.
 */
export interface EvaluatedPosition extends PositionSnapshot {
  evalCp: number;
  depth: number;
  bestMove?: string;
  pv?: string[];
  engineName: string;
}


