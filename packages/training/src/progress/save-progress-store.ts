/**
 * Serialize the progress store. The worker handles file I/O.
 */

import type { ProgressStore } from "./types";

/**
 * Serialize a progress store to a JSON string.
 */
export function serializeProgressStore(store: ProgressStore): string {
  return JSON.stringify(store, null, 2);
}
