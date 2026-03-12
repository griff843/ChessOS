import type { AnalysisEngine } from "../analysis/types";
import { StubStockfishEngine } from "./stub-engine";
import { findStockfish } from "./find-stockfish";
import { UciStockfishEngine } from "./uci-process";

export type EngineMode = "stockfish" | "stub";

export interface CreateEngineOptions {
  mode?: EngineMode;
  depth?: number;
}

/**
 * Factory for creating an AnalysisEngine instance.
 *
 * mode "stub"      → deterministic stub (zero-eval, no binary needed)
 * mode "stockfish" → real UCI adapter (requires Stockfish binary)
 *
 * Stockfish mode will throw an explicit error if the binary
 * cannot be found. There is no silent fallback to stub.
 */
export async function createEngine(
  options?: CreateEngineOptions
): Promise<AnalysisEngine> {
  const mode = options?.mode ?? "stub";

  if (mode === "stub") {
    return new StubStockfishEngine();
  }

  // mode === "stockfish"
  const binaryPath = findStockfish(); // throws if not found
  const engine = new UciStockfishEngine(binaryPath);
  await engine.init();
  return engine;
}
