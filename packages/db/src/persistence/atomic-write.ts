import { writeFileSync, renameSync, mkdirSync } from "fs";
import { writeFile, rename, mkdir } from "fs/promises";
import { dirname } from "path";

/**
 * Atomic write: writes to <path>.tmp then renames.
 * On crash, the original file is untouched; .tmp is overwritten on next success.
 * rename() is atomic on same volume (POSIX + NTFS).
 */
export function atomicWriteFileSync(filePath: string, data: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = filePath + ".tmp";
  writeFileSync(tmp, data, "utf-8");
  renameSync(tmp, filePath);
}

/**
 * Async atomic write for web server actions.
 */
export async function atomicWriteFile(
  filePath: string,
  data: string
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const tmp = filePath + ".tmp";
  await writeFile(tmp, data, "utf-8");
  await rename(tmp, filePath);
}
