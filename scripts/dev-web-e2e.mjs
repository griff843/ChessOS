import { spawn } from "node:child_process";
import { resolve } from "node:path";

const port = process.env.CHESS_OS_E2E_PORT ?? "3401";
const webDir = resolve(process.cwd(), "apps/web");

const child = spawn(
  process.platform === "win32" ? "cmd.exe" : "npx",
  process.platform === "win32"
    ? ["/c", "npx", "next", "dev", "--webpack", "-p", String(port)]
    : ["next", "dev", "--webpack", "-p", String(port)],
  {
    cwd: webDir,
    stdio: "inherit",
    env: {
      ...process.env,
      CHESS_OS_PORT: String(port),
      CHESS_OS_NEXT_DIST_DIR: ".next-e2e",
    },
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
