import { appendFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { atomicWriteFileSync } from "./atomic-write";

/**
 * Write an array of objects as JSONL (one JSON object per line).
 * Creates parent directories as needed. Uses atomic write-then-rename.
 */
export function writeJsonlFile(filePath: string, rows: unknown[]): void {
  const content = rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
  atomicWriteFileSync(filePath, content);
}

/**
 * Append rows to an existing JSONL file. Creates the file if it doesn't exist.
 * Used for streaming aggregation — only one game's rows in memory at a time.
 */
export function appendJsonlRows(filePath: string, rows: unknown[]): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const content = rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
  appendFileSync(filePath, content, "utf-8");
}

/**
 * Create/truncate a JSONL file. Used to initialize a fresh aggregated dataset.
 */
export function initJsonlFile(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, "", "utf-8");
}
