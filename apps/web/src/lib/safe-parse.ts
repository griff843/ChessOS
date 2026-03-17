import { readFile } from "fs/promises";

// ═══════════════════════════════════════════════════
// Safe Parse — Corruption-resilient JSON/JSONL loading
// ═══════════════════════════════════════════════════

export type LoadResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "missing" | "corrupt"; message: string };

/**
 * Load and parse a JSON file with error discrimination.
 * Distinguishes missing files from corrupt/malformed content.
 * Optional type guard validates structure beyond JSON.parse.
 */
export async function loadJsonSafe<T>(
  path: string,
  validate?: (v: unknown) => v is T
): Promise<LoadResult<T>> {
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch {
    return { ok: false, reason: "missing", message: `File not found: ${path}` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`[chess-os] Corrupt JSON at ${path}`);
    return { ok: false, reason: "corrupt", message: `Invalid JSON: ${path}` };
  }

  if (validate && !validate(parsed)) {
    console.warn(`[chess-os] Schema validation failed for ${path}`);
    return {
      ok: false,
      reason: "corrupt",
      message: `Schema mismatch: ${path}`,
    };
  }

  return { ok: true, data: parsed as T };
}

/**
 * Parse JSONL content with per-line resilience.
 * Skips unparseable lines, logs warnings, returns valid objects.
 */
export function safeParseJsonl<T>(
  raw: string,
  sourcePath?: string
): { rows: T[]; skipped: number } {
  const lines = raw.trim().split("\n").filter(Boolean);
  const rows: T[] = [];
  let skipped = 0;

  for (let i = 0; i < lines.length; i++) {
    try {
      rows.push(JSON.parse(lines[i]) as T);
    } catch {
      skipped++;
      console.warn(
        `[chess-os] Skipping malformed JSONL line ${i + 1}${sourcePath ? ` in ${sourcePath}` : ""}`
      );
    }
  }

  return { rows, skipped };
}
