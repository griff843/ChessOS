import { atomicWriteFileSync } from "./atomic-write";

/**
 * Write a JSON-serializable value to a file path.
 * Creates parent directories as needed. Uses atomic write-then-rename.
 * Throws on any write failure — no silent drops.
 */
export function writeJsonFile(filePath: string, data: unknown): void {
  atomicWriteFileSync(filePath, JSON.stringify(data, null, 2));
}
