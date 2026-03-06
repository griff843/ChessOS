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
}
