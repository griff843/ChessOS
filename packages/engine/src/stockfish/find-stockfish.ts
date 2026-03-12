import { existsSync } from "fs";
import { execSync } from "child_process";
import { resolve, dirname } from "path";

/**
 * Find the monorepo root by walking up from cwd looking for pnpm-workspace.yaml.
 */
function findProjectRoot(): string {
  let dir = process.cwd();
  while (true) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

/**
 * Resolve the Stockfish binary path.
 *
 * Resolution order (per STOCKFISH_RUNTIME_SETUP.md):
 *  1. STOCKFISH_PATH environment variable
 *  2. Common executable names on system PATH
 *  3. data/stockfish/ directory in project root
 *  4. Explicit error if not found
 */
export function findStockfish(): string {
  // 1. Explicit env override
  const envPath = process.env.STOCKFISH_PATH;
  if (envPath) {
    if (!existsSync(envPath)) {
      throw new Error(
        `[engine] STOCKFISH_PATH is set to "${envPath}" but the file does not exist.`
      );
    }
    return envPath;
  }

  // 2. Search system PATH
  const found = findOnSystemPath();
  if (found) return found;

  // 3. Project-local fallback (anchored at monorepo root)
  const root = findProjectRoot();
  const localNames =
    process.platform === "win32"
      ? ["stockfish.exe", "stockfish"]
      : ["stockfish"];

  for (const name of localNames) {
    const candidate = resolve(root, "data", "stockfish", name);
    if (existsSync(candidate)) return candidate;
  }

  // 4. Fail closed
  throw new Error(
    "[engine] Stockfish binary not found.\n" +
      "Resolution tried:\n" +
      "  1. STOCKFISH_PATH env variable — not set\n" +
      "  2. System PATH — stockfish not found\n" +
      "  3. data/stockfish/ — no binary present\n\n" +
      "To fix: install Stockfish and either:\n" +
      "  - set STOCKFISH_PATH=/path/to/stockfish\n" +
      "  - add stockfish to your system PATH\n" +
      "  - place the binary in data/stockfish/"
  );
}

function findOnSystemPath(): string | null {
  const names =
    process.platform === "win32"
      ? ["stockfish.exe", "stockfish"]
      : ["stockfish"];

  const cmd = process.platform === "win32" ? "where" : "which";

  for (const name of names) {
    try {
      const result = execSync(`${cmd} ${name}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      // `where` on Windows may return multiple lines; take the first
      const firstLine = result.split("\n")[0].trim();
      if (firstLine) return firstLine;
    } catch {
      // not found, try next
    }
  }

  return null;
}
