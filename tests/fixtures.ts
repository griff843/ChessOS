import { test as base, expect } from "@playwright/test";
import { readFile, rename, stat } from "fs/promises";
import { join } from "path";

// ═══════════════════════════════════════════════════
// Shared Test Fixtures
// ═══════════════════════════════════════════════════

const OUT = join(__dirname, "..", "out");

/** Helper to call the test API endpoint */
async function apiCall(
  baseURL: string,
  action: string,
  params: Record<string, unknown> = {}
) {
  const res = await fetch(`${baseURL}/api/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...params }),
  });
  expect(res.ok, `API call ${action} failed: ${res.status}`).toBe(true);
  return res.json();
}

/** Artifact helpers for reading/checking/backing up files in out/ */
class ArtifactHelper {
  private backups: string[] = [];

  async readJson<T = unknown>(relativePath: string): Promise<T> {
    const raw = await readFile(join(OUT, relativePath), "utf-8");
    return JSON.parse(raw) as T;
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await stat(join(OUT, relativePath));
      return true;
    } catch {
      return false;
    }
  }

  async backupAndRemove(relativePath: string): Promise<void> {
    const src = join(OUT, relativePath);
    const bak = src + ".test-bak";
    await rename(src, bak);
    this.backups.push(relativePath);
  }

  async restore(relativePath: string): Promise<void> {
    const src = join(OUT, relativePath);
    const bak = src + ".test-bak";
    try {
      await rename(bak, src);
      this.backups = this.backups.filter((p) => p !== relativePath);
    } catch {
      // Already restored or never backed up
    }
  }

  async restoreAll(): Promise<void> {
    for (const p of [...this.backups]) {
      await this.restore(p);
    }
  }
}

// ── Custom test fixture ──

type TestFixtures = {
  api: {
    call: (
      action: string,
      params?: Record<string, unknown>
    ) => Promise<unknown>;
  };
  artifacts: ArtifactHelper;
};

export const test = base.extend<TestFixtures>({
  api: async ({ baseURL }, use) => {
    await use({
      call: (action, params) => apiCall(baseURL!, action, params ?? {}),
    });
  },

  artifacts: async ({}, use) => {
    const helper = new ArtifactHelper();
    await use(helper);
    // Auto-restore any backed up artifacts on teardown
    await helper.restoreAll();
  },
});

export { expect } from "@playwright/test";
export { OUT };
