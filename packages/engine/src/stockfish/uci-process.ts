import { spawn, type ChildProcess } from "child_process";
import type {
  AnalysisEngine,
  EngineAnalysisRequest,
  EngineAnalysisResult,
} from "../analysis/types";
import { extractAnalysis } from "./parse-uci-output";

const UCI_TIMEOUT_MS = 10_000;
const GO_TIMEOUT_MS = 30_000;

/**
 * Real Stockfish UCI engine adapter.
 *
 * Lifecycle: create → init() → analyzePosition() ... → quit()
 * Use createEngine() from stockfish-service.ts which handles init automatically.
 */
export class UciStockfishEngine implements AnalysisEngine {
  private process: ChildProcess | null = null;
  private buffer = "";

  constructor(private readonly binaryPath: string) {}

  /** Spawn the process and complete the UCI handshake. */
  async init(): Promise<void> {
    this.process = spawn(this.binaryPath, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.process.on("error", (err) => {
      throw new Error(`[engine] Stockfish process error: ${err.message}`);
    });

    // UCI handshake
    await this.sendAndWait("uci", "uciok", UCI_TIMEOUT_MS);
    await this.sendAndWait("isready", "readyok", UCI_TIMEOUT_MS);
  }

  async analyzePosition(
    input: EngineAnalysisRequest
  ): Promise<EngineAnalysisResult> {
    this.assertRunning();

    const depth = input.depth ?? 20;

    // Set position
    this.send(`position fen ${input.fen}`);

    // Start analysis and collect all output until bestmove
    const lines = await this.sendAndWait(
      `go depth ${depth}`,
      "bestmove",
      GO_TIMEOUT_MS
    );

    const analysis = extractAnalysis(lines);

    return {
      bestLine: {
        move: analysis.bestMove,
        scoreCp: analysis.scoreCp,
        mateIn: analysis.mateIn,
        pv: analysis.pv,
      },
      candidateLines: [],
    };
  }

  /** Send the quit command and wait for the process to exit. */
  async quit(): Promise<void> {
    if (!this.process) return;
    this.send("quit");
    await new Promise<void>((resolve) => {
      this.process!.on("close", () => resolve());
      // Safety timeout — don't hang forever
      setTimeout(() => {
        this.process?.kill();
        resolve();
      }, 2000);
    });
    this.process = null;
  }

  private send(command: string): void {
    this.assertRunning();
    this.process!.stdin!.write(command + "\n");
  }

  /**
   * Send a command and collect stdout lines until one starts with the terminator.
   * Returns all collected lines (including the terminator line).
   */
  private sendAndWait(
    command: string,
    terminator: string,
    timeoutMs: number
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.assertRunning();

      const collected: string[] = [];
      let timer: ReturnType<typeof setTimeout> | undefined;

      const cleanup = () => {
        this.process?.stdout?.off("data", onData);
        if (timer) clearTimeout(timer);
      };

      const onData = (chunk: Buffer) => {
        this.buffer += chunk.toString();
        const parts = this.buffer.split("\n");
        // Last element may be an incomplete line — keep it in buffer
        this.buffer = parts.pop() ?? "";

        for (const raw of parts) {
          const line = raw.trim();
          if (!line) continue;
          collected.push(line);

          if (line.startsWith(terminator)) {
            cleanup();
            resolve(collected);
            return;
          }
        }
      };

      this.process!.stdout!.on("data", onData);
      this.process!.stdin!.write(command + "\n");

      timer = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            `[engine] Timeout (${timeoutMs}ms) waiting for "${terminator}" after "${command}".`
          )
        );
      }, timeoutMs);
    });
  }

  private assertRunning(): void {
    if (!this.process || this.process.killed) {
      throw new Error("[engine] Stockfish process is not running.");
    }
  }
}
