import { join } from "path";

function getProjectRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("fs").accessSync(join(dir, "pnpm-workspace.yaml"));
      return dir;
    } catch {
      dir = join(dir, "..");
    }
  }
  return join(process.cwd(), "..", "..");
}

export const ROOT = getProjectRoot();
export const OUT = join(ROOT, "out");
