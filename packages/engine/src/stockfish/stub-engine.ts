import type {
  AnalysisEngine,
  EngineAnalysisRequest,
  EngineAnalysisResult
} from "../analysis/types";

export class StubStockfishEngine implements AnalysisEngine {
  async analyzePosition(
    _input: EngineAnalysisRequest
  ): Promise<EngineAnalysisResult> {
    return {
      bestLine: {
        move: "0000",
        scoreCp: 0,
        pv: []
      },
      candidateLines: []
    };
  }
}
