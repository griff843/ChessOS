#!/usr/bin/env node
/**
 * Chess OS — AI Context Generator
 * Usage: pnpm ai:context
 *
 * Regenerates all AI grounding artifacts under out/chess-os/ai/ in one pass:
 *   out/chess-os/ai/context/context_bundle.md
 *   out/chess-os/ai/context/context_bundle.json
 *   out/chess-os/ai/snapshots/repo_snapshot.json
 *   out/chess-os/ai/snapshots/repo_map.md
 *   out/chess-os/ai/snapshots/web_app_snapshot.json
 *   out/chess-os/ai/snapshots/skills_snapshot.json
 *   out/chess-os/ai/snapshots/status_snapshot.json
 *   out/chess-os/ai/snapshots/runtime_snapshot.json
 *
 * Uses only Node.js builtins — no extra dependencies.
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ── ANSI helpers (no deps) ───────────────────────────────────────────────────
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const checkmark = green("✓");
const warn = yellow("⚠");
const cross = "\x1b[31m✗\x1b[0m";

// ── Project root ─────────────────────────────────────────────────────────────
function findRoot() {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (true) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error("Cannot find project root (no pnpm-workspace.yaml found)");
    dir = parent;
  }
}

const ROOT = findRoot();
const TODAY = new Date().toISOString().slice(0, 10);
const OUT_AI = join(ROOT, "out", "chess-os", "ai");
const OUT_CTX = join(OUT_AI, "context");
const OUT_SNAP = join(OUT_AI, "snapshots");

// ── Helpers ──────────────────────────────────────────────────────────────────
function abs(rel) { return join(ROOT, rel); }
function ex(rel) { return existsSync(abs(rel)); }
function readDoc(rel) {
  try { return readFileSync(abs(rel), "utf-8"); }
  catch { return null; }
}
function listDirs(rel) {
  try {
    return readdirSync(abs(rel), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch { return []; }
}
function listFiles(rel) {
  try {
    return readdirSync(abs(rel), { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);
  } catch { return []; }
}
function mkdir(dir) { mkdirSync(dir, { recursive: true }); }

const written = [];
function write(file, content) {
  writeFileSync(file, content, "utf-8");
  const rel = file.replace(ROOT, "").replace(/\\/g, "/");
  const kb = (Buffer.byteLength(content, "utf-8") / 1024).toFixed(1);
  console.log(`  ${checkmark} ${rel}  ${dim(kb + " KB")}`);
  written.push(rel);
}

function step(n, label) {
  console.log(`\n${bold(cyan(`[${n}]`))} ${bold(label)}`);
}

function hr() { console.log(dim("─".repeat(54))); }

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════════
console.log(`\n${bold("Chess OS — AI Context Generator")}`);
hr();
console.log(`${dim("Root:")}  ${ROOT}`);
console.log(`${dim("Date:")}  ${TODAY}`);

// ── [1] Setup ────────────────────────────────────────────────────────────────
step(1, "Setting up output directories");
mkdir(OUT_CTX);
mkdir(OUT_SNAP);
console.log(`  ${checkmark} out/chess-os/ai/context/`);
console.log(`  ${checkmark} out/chess-os/ai/snapshots/`);

// ── [2] Repo structure ───────────────────────────────────────────────────────
step(2, "Inspecting repo structure");

const apps = listDirs("apps");
const packages = listDirs("packages");

// Web routes — walk apps/web/src/app/ for page.tsx files
const webRoutes = [];
function collectRoutes(dir, prefix) {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!e.name.startsWith("_")) {
          collectRoutes(join(dir, e.name), prefix + "/" + e.name);
        }
      } else if (e.name === "page.tsx") {
        webRoutes.push(prefix || "/");
      }
    }
  } catch { /* skip */ }
}
const webAppDir = abs("apps/web/src/app");
if (existsSync(webAppDir)) {
  if (existsSync(join(webAppDir, "page.tsx"))) webRoutes.push("/");
  collectRoutes(webAppDir, "");
}
// Deduplicate and sort
const uniqueRoutes = [...new Set(webRoutes)].sort();

// API routes
const apiRoutes = listDirs("apps/web/src/app/api").map((d) => `/api/${d}/`);

// Worker scripts
const workerScripts = listFiles("apps/worker/src").filter((f) => f.endsWith(".ts"));

// Skills
const skills = listDirs(".claude/skills");
const agentCount = listFiles(".claude/agents").filter((f) => f.endsWith(".md")).length;
const ruleCount = listFiles(".claude/rules").filter((f) => f.endsWith(".md")).length;

// Output dirs truth
const outDirNames = [
  "games", "datasets", "sessions", "progress", "coach",
  "intelligence", "exercises", "models", "strategic",
  "curriculum", "patterns", "dashboard", "repertoire",
];
const outDirs = Object.fromEntries(outDirNames.map((d) => [d, ex(`out/${d}`)]));

// Existing games
const gameIds = outDirs.games ? listDirs("out/games") : [];

// Stockfish — check exact names first, then scan for any exe/binary in the dir
const sfWin = ex("data/stockfish/stockfish.exe");
const sfUnix = ex("data/stockfish/stockfish");
let sfPath = sfWin ? "data/stockfish/stockfish.exe" : sfUnix ? "data/stockfish/stockfish" : null;
if (!sfPath) {
  // Scan for any executable in data/stockfish/ (e.g. stockfish-windows-x86-64-avx2.exe)
  const isExe = process.platform === "win32"
    ? (f) => f.endsWith(".exe")
    : (f) => !f.includes(".") && !f.startsWith(".");
  const sfFiles = listFiles("data/stockfish").filter(isExe);
  if (sfFiles.length > 0) sfPath = `data/stockfish/${sfFiles[0]}`;
}
const sfPresent = !!sfPath;

// Import status
let importStatus = null;
const importRaw = readDoc("out/import/analysis-status.json");
if (importRaw) { try { importStatus = JSON.parse(importRaw); } catch { /* ignore */ } }

const existingOutCount = Object.values(outDirs).filter(Boolean).length;

console.log(`  ${checkmark} apps: ${apps.join(", ")}`);
console.log(`  ${checkmark} packages: ${packages.join(", ")}`);
console.log(`  ${checkmark} web routes: ${uniqueRoutes.length} pages, ${apiRoutes.length} API routes`);
console.log(`  ${checkmark} worker scripts: ${workerScripts.length}`);
console.log(`  ${checkmark} skills: ${skills.length} installed`);
console.log(`  ${sfPresent ? checkmark : warn} stockfish: ${sfPresent ? sfPath : "NOT FOUND"}`);
console.log(`  ${checkmark} output dirs: ${existingOutCount}/${outDirNames.length} exist`);
console.log(`  ${checkmark} games: ${gameIds.length} analyzed`);

// ── [3] Truth docs ───────────────────────────────────────────────────────────
step(3, "Reading truth docs");

const docPaths = {
  CURRENT_SYSTEM_STATUS: "docs/chess-os/current-state/CURRENT_SYSTEM_STATUS.md",
  NEXT_STEPS: "docs/chess-os/status/NEXT_STEPS.md",
  PHASE_STATUS: "docs/chess-os/status/PHASE_STATUS.md",
  OPERATING_RULES: "docs/chess-os/governance/OPERATING_RULES.md",
  DIAGNOSTIC_LOOP: "docs/chess-os/architecture/CHESS_DIAGNOSTIC_LOOP.md",
  SNAPSHOT_LAYER: "docs/chess-os/architecture/CHESS_OS_AI_SNAPSHOT_LAYER.md",
};
const docs = Object.fromEntries(
  Object.entries(docPaths).map(([k, v]) => [k, readDoc(v)])
);

for (const [key, content] of Object.entries(docs)) {
  const icon = content ? checkmark : cross;
  console.log(`  ${icon} ${docPaths[key].split("/").pop()}`);
}

// Extract active phase from status doc
function extractPhase(doc) {
  if (!doc) return "M15+ Runtime Productization";
  const m = doc.match(/\*\*Phase:\s*([^*\n]+)\*\*/);
  return m ? m[1].trim() : "M15+ Runtime Productization";
}
function extractLastUpdated(doc) {
  if (!doc) return "unknown";
  const m = doc.match(/>\s*\*\*Last updated:\*\*\s*([^\n]+)/);
  return m ? m[1].trim() : "unknown";
}

const activePhase = extractPhase(docs.CURRENT_SYSTEM_STATUS);
const lastUpdated = extractLastUpdated(docs.CURRENT_SYSTEM_STATUS);

// ── [4] Skill details ────────────────────────────────────────────────────────
step(4, "Inspecting installed skills");

const skillDetails = skills.map((name) => {
  const md = readDoc(`.claude/skills/${name}/SKILL.md`);
  let wave = null;
  let invocation = `/${name}`;
  let purpose = "See SKILL.md";
  if (md) {
    const wm = md.match(/\*\*Wave:\*\*\s*(\d+)/);
    const im = md.match(/\*\*Invocation:\*\*\s*[`]([^`]+)[`]/);
    const pm = md.match(/## Purpose\s*\n([^\n]+)/);
    if (wm) wave = parseInt(wm[1]);
    if (im) invocation = im[1];
    if (pm) purpose = pm[1].trim().slice(0, 90);
  }
  return { name, wave, invocation, purpose };
});

for (const s of skillDetails) {
  const wl = s.wave ? dim(`[Wave ${s.wave}]`) : dim("[generic]");
  console.log(`  ${checkmark} ${s.name} ${wl}`);
}

// ── [5] Derive runtime state ─────────────────────────────────────────────────
step(5, "Deriving runtime state");

const blockedBy = !sfPresent
  ? "Stockfish binary missing (data/stockfish/stockfish.exe)"
  : !outDirs.datasets
  ? "Pipeline not yet run (out/datasets/ missing)"
  : null;
const workerStatus = blockedBy ? "BLOCKED" : "READY";

const wave3Expected = ["game-review-shaper", "training-plan-composer", "progress-snapshot-helper"];
const wave4Expected = ["study-closeout-helper", "position-concept-audit", "session-quality-evaluator"];
const wave4Missing = wave4Expected.filter((s) => !skills.includes(s));

console.log(`  ${checkmark} active phase: ${activePhase}`);
console.log(`  ${workerStatus === "READY" ? checkmark : warn} worker: ${workerStatus}${blockedBy ? ` — ${blockedBy}` : ""}`);
console.log(`  ${checkmark} wave 3 skills: ${wave3Expected.every((s) => skills.includes(s)) ? "all installed" : "PARTIAL"}`);
console.log(`  ${wave4Missing.length ? warn : checkmark} wave 4 skills: ${wave4Missing.length ? `${wave4Missing.join(", ")} not yet built` : "all installed"}`);

// ── [6] Generate artifacts ───────────────────────────────────────────────────
step(6, "Writing artifacts");

// ────────────────────────────────────────────────────────────────────────────
// 6a. context_bundle.md
// ────────────────────────────────────────────────────────────────────────────
const routeTable = uniqueRoutes.map((r) => `- \`${r}\``).join("\n");
const apiTable = apiRoutes.map((r) => `- \`${r}\``).join("\n");
const skillTable = skillDetails
  .map((s) => `| ${s.name} | ${s.wave ?? "generic"} | ${s.purpose.slice(0, 80)} |`)
  .join("\n");
const workerList = workerScripts.map((f) => `- \`${f}\``).join("\n");
const gapRows = [
  !sfPresent && `| Stockfish binary missing | Critical | Yes | Install \`data/stockfish/stockfish.exe\` |`,
  !outDirs.datasets && `| No \`out/datasets/\` (no training exercises) | Critical | Yes | Run pipeline after Stockfish installed |`,
  !outDirs.sessions && `| No \`out/sessions/\` (no study sessions) | High | Downstream | Generate sessions after pipeline runs |`,
  `| \`SYSTEM_OVERVIEW.md\` not written | Low | No | Write \`docs/chess-os/architecture/SYSTEM_OVERVIEW.md\` |`,
  wave4Missing.length && `| Wave 4 skills not built: ${wave4Missing.join(", ")} | Low | No | Build remaining wave 4 skills |`,
].filter(Boolean).join("\n");

const ctxMd = `# Chess OS — AI Context Bundle

> **Last updated:** ${TODAY} (generated by \`pnpm ai:context\`)
> **Purpose:** Paste into ChatGPT or Claude before any architecture or sprint-shaping session.
> **Authority:** Generated from direct repo inspection + truth docs. Do not override by memory.
> **Machine-readable:** \`out/chess-os/ai/context/context_bundle.json\`

---

## Project Identity

**Project:** Chess OS
**Domain:** Chess improvement and training operating system
**Type:** Web-first product (Next.js 16) backed by a TypeScript monorepo
**Purpose:** Turn real games, analysis, mistakes, and study into a durable, truth-based chess improvement system.

**Stack:**
- Web app: Next.js 16 + React 19 + Tailwind v4 + react-chessboard v5 + recharts + lucide-react
- Monorepo: pnpm workspaces (${packages.length} packages + ${apps.length} apps)
- Language: TypeScript throughout
- Testing: Playwright E2E
- Build flag: \`--webpack\` (required; Turbopack breaks .js→.ts alias resolution)

---

## Active Phase

**Phase:** ${activePhase}

Core pipeline (M1–M9): complete. Web app (M10–M12): feature-complete. AI operating layer (M-AI-01, Waves 2–4): fully installed with ${skills.length} skills. \`pnpm ai:context\` generator: live. Diagnostic loop validated as PARTIAL (Stage 3 blocked by missing Stockfish binary).

---

## Latest Completed Milestones

| Milestone | What It Delivered |
|---|---|
| M-AI-CONTEXT-01 | \`pnpm ai:context\` — one-command AI snapshot/context regeneration |
| M-SNAPSHOT-01 | First AI snapshot layer (8 artifacts, repo/web/skills/status/runtime truth) |
| M-AI-01 Wave 4 | study-closeout-helper skill + CHESS_DIAGNOSTIC_LOOP.md |
| M-AI-01 Wave 3 | game-review-shaper, training-plan-composer, progress-snapshot-helper |
| M-AI-01 Wave 2 | ${skills.filter((s) => !skillDetails.find((d) => d.name === s)?.wave || skillDetails.find((d) => d.name === s)?.wave === null).length + 5} foundational skills + ${agentCount} agents + ${ruleCount} rules |
| M-UX-01 | Unified CoachingReview surface, static board, game context loader |
| M004 | Repertoire Branch Repair v1 |
| M12A | Playwright E2E suite (61+ tests, 16 smoke) |
| M-DIAG-01 (PARTIAL) | First E2E diagnostic loop validation — Stage 3 blocked |

---

## Current Priorities

1. **Pipeline unblock** ← prerequisite for everything: Install Stockfish → run pipeline → generate \`out/datasets/\` → enable sessions
2. **Architecture docs**: \`docs/chess-os/architecture/SYSTEM_OVERVIEW.md\`
3. **Wave 4 Skill 2**: position-concept-audit
4. **Wave 4 Skill 3**: session-quality-evaluator
5. **Linear integration**: Connect sprint workflow to Linear issue tracking

---

## Web Surface Summary

**Application:** \`apps/web/\` — Next.js 16, port 3001 (dev) / 3401 (E2E)

### Pages (${uniqueRoutes.length} routes)
${routeTable}

### API Routes
${apiTable || "- none detected"}

### Diagnostic Loop in the UI
- Stage 1 review → \`/games/[gameId]\` (CoachingReview)
- Stage 3 session → \`/study/[sessionId]\` (StudyPlayer)${!outDirs.datasets ? " ← **blocked**" : ""}
- Stage 4 progress → \`/history\`, \`/sessions/\`
- Coach overview → \`/coach\`
- Repertoire repair → \`/repertoire\`

---

## Worker / Runtime Summary

**Status: ${workerStatus}**${blockedBy ? `\n**Blocked by:** ${blockedBy}` : ""}

**Scripts (${workerScripts.length}):**
${workerList}

---

## Installed Skills (${skills.length})

| Skill | Wave | Purpose |
|---|---|---|
${skillTable}

---

## Diagnostic Loop

\`\`\`
game-review-shaper [Stage 1]         → structured review
      ↓
training-plan-composer [Stage 2]     → staged training plan
      ↓
Chess OS session execution [Stage 3] → out/sessions/  ${blockedBy ? "← BLOCKED" : "← ready"}
      ↓
progress-snapshot-helper [Stage 4]   → progress summary
      ↓
context update [Stage 5]             → pnpm ai:context (this command)
      ↓
study-closeout-helper [Stage 6]      → closeout verdict
\`\`\`

**Current cycle:** M-DIAG-01 — **PARTIAL** (Stage 3 ${blockedBy ? "blocked" : "ready"})

---

## Known Blockers / Gaps

| Gap | Severity | Blocking? | Fix |
|---|---|---|---|
${gapRows}

---

## Key Artifact Paths

| Artifact | Path |
|---|---|
| Context bundle (md) | \`out/chess-os/ai/context/context_bundle.md\` |
| Context bundle (json) | \`out/chess-os/ai/context/context_bundle.json\` |
| Repo snapshot | \`out/chess-os/ai/snapshots/repo_snapshot.json\` |
| Repo map | \`out/chess-os/ai/snapshots/repo_map.md\` |
| Web app snapshot | \`out/chess-os/ai/snapshots/web_app_snapshot.json\` |
| Skills snapshot | \`out/chess-os/ai/snapshots/skills_snapshot.json\` |
| Status snapshot | \`out/chess-os/ai/snapshots/status_snapshot.json\` |
| Runtime snapshot | \`out/chess-os/ai/snapshots/runtime_snapshot.json\` |
| Sprint proofs | \`out/chess-os/sprints/\` |
| Demo game | \`out/games/demo-game-001/\` |
| Context generator | \`scripts/ai-context.mjs\` |

---

## Truth Docs

| Doc | Path | Last Updated |
|---|---|---|
| Current system status | \`docs/chess-os/current-state/CURRENT_SYSTEM_STATUS.md\` | ${lastUpdated} |
| Phase status | \`docs/chess-os/status/PHASE_STATUS.md\` | — |
| Next steps | \`docs/chess-os/status/NEXT_STEPS.md\` | — |
| Operating rules | \`docs/chess-os/governance/OPERATING_RULES.md\` | — |
| Diagnostic loop | \`docs/chess-os/architecture/CHESS_DIAGNOSTIC_LOOP.md\` | — |
| Snapshot layer spec | \`docs/chess-os/architecture/CHESS_OS_AI_SNAPSHOT_LAYER.md\` | — |

---

## Architecture Summary

\`\`\`
apps/worker/         ← CLI pipeline (generate-session, generate-exercises, ...)
apps/web/            ← Next.js 16 web app (routes, server actions, API)
packages/chess-core/ ← PGN parsing, chess.js wrappers, FEN, snapshots
packages/engine/     ← Stockfish UCI + stub engine (evaluatePosition seam)
packages/classifier/ ← Feature extraction, mistake classification
packages/db/         ← Artifact persistence, atomic writes, path builders
packages/training/   ← Sessions, adaptive, coach, cognitive, strategic (31 modules)
packages/ui/         ← Shared React components
tests/               ← Playwright E2E suite
docs/chess-os/       ← Status, governance, architecture truth docs
.claude/             ← Skills (${skills.length}), agents (${agentCount}), rules (${ruleCount}) — AI OS layer
out/                 ← Generated artifacts
data/                ← PGN files + Stockfish binary (${sfPresent ? "✅ present" : "⚠ MISSING"})
\`\`\`

---

## Dev Commands

\`\`\`bash
pnpm ai:context                                          # Regenerate this file
cd apps/web && npx next dev --webpack -p 3001            # Web dev server
pnpm -r run typecheck                                    # Typecheck all packages
pnpm --filter web run build                              # Build web app
pnpm test:e2e                                            # E2E suite (port 3401)
ENGINE_MODE=stub PGN_DIR=./data/pgn pnpm --filter worker run start  # Pipeline (stub)
\`\`\`
`;
write(join(OUT_CTX, "context_bundle.md"), ctxMd);

// ────────────────────────────────────────────────────────────────────────────
// 6b. context_bundle.json
// ────────────────────────────────────────────────────────────────────────────
const ctxJson = {
  _meta: {
    generated_at: TODAY,
    generated_by: "pnpm ai:context",
    script: "scripts/ai-context.mjs",
    authority: "repo inspection + truth docs",
  },
  project_name: "Chess OS",
  project_type: "chess-improvement-training-os",
  active_phase: activePhase,
  primary_surfaces: {
    web_app: {
      framework: "Next.js 16 + React 19 + Tailwind v4",
      location: "apps/web/",
      dev_port: 3001,
      e2e_port: 3401,
      build_flag_required: "--webpack",
      status: "feature_complete",
      routes_count: uniqueRoutes.length,
      routes: uniqueRoutes,
      api_routes: apiRoutes,
    },
    worker_cli: {
      runtime: "tsx",
      location: "apps/worker/",
      scripts_count: workerScripts.length,
      scripts: workerScripts,
      status: workerStatus.toLowerCase(),
      blocked_by: blockedBy,
    },
  },
  diagnostic_loop: {
    architecture_doc: "docs/chess-os/architecture/CHESS_DIAGNOSTIC_LOOP.md",
    current_cycle: "M-DIAG-01",
    current_verdict: "PARTIAL",
    stage3_blocked: !outDirs.datasets || !sfPresent,
    stage3_blocked_by: blockedBy,
  },
  installed_skills: skillDetails.map((s) => ({
    name: s.name,
    wave: s.wave,
    invocation: s.invocation,
    status: "installed",
  })),
  installed_agents_count: agentCount,
  installed_rules_count: ruleCount,
  output_dirs: Object.fromEntries(
    outDirNames.map((d) => [d, { exists: outDirs[d], path: `out/${d}/` }])
  ),
  stockfish: {
    binary_present: sfPresent,
    binary_path: sfPath,
    used_by_web_app: false,
    used_by_worker: true,
  },
  known_gaps: [
    !sfPresent && { id: "stockfish_binary_missing", severity: "critical", blocking: true, fix: "Install data/stockfish/stockfish.exe" },
    !outDirs.datasets && { id: "no_training_exercises", severity: "critical", blocking: true, fix: "Run pipeline after Stockfish installed" },
    !outDirs.sessions && { id: "no_study_sessions", severity: "high", blocking: false },
    !ex("docs/chess-os/architecture/SYSTEM_OVERVIEW.md") && { id: "system_overview_missing", severity: "low", blocking: false },
    wave4Missing.length && { id: "wave4_skills_missing", severity: "low", skills: wave4Missing },
  ].filter(Boolean),
  games_analyzed: gameIds.length,
  game_ids: gameIds,
  truth_docs: docPaths,
  artifact_paths: {
    context_bundle_md: "out/chess-os/ai/context/context_bundle.md",
    context_bundle_json: "out/chess-os/ai/context/context_bundle.json",
    repo_snapshot_json: "out/chess-os/ai/snapshots/repo_snapshot.json",
    repo_map_md: "out/chess-os/ai/snapshots/repo_map.md",
    web_app_snapshot_json: "out/chess-os/ai/snapshots/web_app_snapshot.json",
    skills_snapshot_json: "out/chess-os/ai/snapshots/skills_snapshot.json",
    status_snapshot_json: "out/chess-os/ai/snapshots/status_snapshot.json",
    runtime_snapshot_json: "out/chess-os/ai/snapshots/runtime_snapshot.json",
  },
};
write(join(OUT_CTX, "context_bundle.json"), JSON.stringify(ctxJson, null, 2));

// ────────────────────────────────────────────────────────────────────────────
// 6c. repo_snapshot.json
// ────────────────────────────────────────────────────────────────────────────
const repoSnap = {
  _meta: { generated_at: TODAY, generated_by: "pnpm ai:context", authority: "direct repo inspection" },
  root: ROOT,
  workspace: { manager: "pnpm", patterns: ["apps/*", "packages/*"], apps, packages },
  apps_detail: {
    web: { path: "apps/web/", framework: "Next.js 16", pages: uniqueRoutes.length, api_routes: apiRoutes.length },
    worker: { path: "apps/worker/", runtime: "tsx", scripts: workerScripts.length },
  },
  packages_detail: Object.fromEntries(
    packages.map((p) => [p, { path: `packages/${p}/`, package_name: `@chess-os/${p}` }])
  ),
  docs_structure: {
    chess_os: "docs/chess-os/ (current-state, status, governance, architecture)",
    ai: "docs/ai/ (project adapter, bootstrap checklist, skill waves)",
    ai_core: "docs/ai-core/ (portable operating doctrine)",
    architecture: "docs/architecture/ (PIPELINE_OVERVIEW, SYSTEM_ARCHITECTURE)",
    contracts: "docs/contracts/ (50+ interface contracts)",
    missing: [
      !ex("docs/chess-os/architecture/SYSTEM_OVERVIEW.md") && "docs/chess-os/architecture/SYSTEM_OVERVIEW.md",
    ].filter(Boolean),
  },
  ai_layer: {
    skills_dir: ".claude/skills/",
    skills_count: skills.length,
    skills,
    agents_dir: ".claude/agents/",
    agents_count: agentCount,
    rules_dir: ".claude/rules/",
    rules_count: ruleCount,
  },
  output_dirs: Object.fromEntries(
    outDirNames.map((d) => [d, { exists: outDirs[d], path: `out/${d}/` }])
  ),
  stockfish: {
    resolution_file: "packages/engine/src/stockfish/find-stockfish.ts",
    env_var_mode: "ENGINE_MODE",
    env_var_path: "STOCKFISH_PATH",
    default_mode: "stub",
    expected_binary_windows: "data/stockfish/stockfish.exe",
    expected_binary_unix: "data/stockfish/stockfish",
    binary_present: sfPresent,
    binary_path: sfPath,
    stub_file: "packages/engine/src/stockfish/stub-engine.ts",
    used_by_web_app: false,
    used_by_worker: true,
  },
  session_pipeline: {
    entry_point: "apps/worker/src/generate-session.ts",
    exercise_generator: "apps/worker/src/generate-exercises.ts",
    critical_input: "out/datasets/training-exercises.jsonl",
    critical_input_exists: outDirs.datasets,
    generation_chain: [
      "PGN → training-dataset.json (index.ts + engine)",
      "training-dataset.json → training-targets.json (generate-training-targets.ts)",
      "training-targets.json → training-exercises.jsonl (generate-exercises.ts)",
      "training-exercises.jsonl → study-session.json (generate-session.ts)",
    ],
    status: !outDirs.datasets ? "BLOCKED" : "READY",
    blocked_by: blockedBy,
  },
  existing_games: gameIds.map((id) => ({
    game_id: id,
    diagnosis: ex(`out/games/${id}/diagnosis.json`),
    training_dataset: ex(`out/games/${id}/training-dataset.json`),
  })),
  config: {
    env_example: ".env.example",
    env_file_present: ex(".env"),
    known_env_vars: {
      ENGINE_MODE: "stub | stockfish",
      STOCKFISH_PATH: "explicit binary path (optional)",
      PGN_DIR: "PGN input directory",
      PORT: "web server port (default 3001)",
    },
  },
};
write(join(OUT_SNAP, "repo_snapshot.json"), JSON.stringify(repoSnap, null, 2));

// ────────────────────────────────────────────────────────────────────────────
// 6d. repo_map.md
// ────────────────────────────────────────────────────────────────────────────
const outDirLines = outDirNames
  .map((d) => `│   ├── ${d}/${" ".repeat(Math.max(0, 14 - d.length))}← ${outDirs[d] ? "✅ exists" : "⚠  DOES NOT EXIST"}`)
  .join("\n");
const routeMapLines = uniqueRoutes.map((r) => `| \`${r}\` | page |`).join("\n");
const apiMapLines = apiRoutes.map((r) => `| \`${r}\` | API |`).join("\n");
const skillMapLines = skillDetails
  .map((s) => `| ${s.name} | ${s.wave ?? "generic"} | \`${s.invocation}\` |`)
  .join("\n");
const workerMapLines = workerScripts
  .map((f) => `| \`${f}\` | ${f.replace(".ts", "").replace(/-/g, " ")} |`)
  .join("\n");

const repoMap = `# Chess OS — Repository Map

> **Generated:** ${TODAY} by \`pnpm ai:context\`
> **Authority:** Direct repo inspection — do not override by assumption

---

## Quick Reference

| What | Where |
|---|---|
| Web app pages | \`apps/web/src/app/\` |
| Web components | \`apps/web/src/components/\` |
| Server-side lib | \`apps/web/src/lib/\` |
| Server actions | \`apps/web/src/app/actions/\` |
| Worker/pipeline scripts | \`apps/worker/src/\` |
| Chess domain logic | \`packages/chess-core/src/\` |
| Engine evaluation | \`packages/engine/src/\` |
| Mistake classification | \`packages/classifier/src/\` |
| Artifact persistence | \`packages/db/src/\` |
| Training / coaching | \`packages/training/src/\` |
| Shared UI components | \`packages/ui/src/\` |
| AI skills | \`.claude/skills/\` |
| AI agents | \`.claude/agents/\` |
| Claude rules | \`.claude/rules/\` |
| Truth docs | \`docs/chess-os/\` |
| AI adapter docs | \`docs/ai/\` |
| Sprint proofs | \`out/chess-os/sprints/\` |
| AI context bundle | \`out/chess-os/ai/context/\` |
| Snapshots | \`out/chess-os/ai/snapshots/\` |
| Game artifacts | \`out/games/\` |
| Stockfish binary | \`data/stockfish/stockfish.exe\` ${sfPresent ? "✅" : "⚠ MISSING"} |
| Context generator | \`scripts/ai-context.mjs\` |

---

## Top-Level Map

\`\`\`
chess-os/
├── apps/
│   ├── web/              ← Next.js 16 web app (port 3001 dev, 3401 E2E)
│   └── worker/           ← CLI pipeline scripts (tsx runner)
│
├── packages/
${packages.map((p) => `│   ├── ${p}/`).join("\n")}
│
├── docs/
│   ├── chess-os/         ← Primary truth docs (status, governance, architecture)
│   ├── ai/               ← Chess-specific AI adapter docs
│   ├── ai-core/          ← Portable AI operating doctrine
│   ├── architecture/     ← System architecture docs
│   └── contracts/        ← 50+ interface contracts
│
├── .claude/
│   ├── skills/           ← ${skills.length} installed skills
│   ├── agents/           ← ${agentCount} generic agents
│   └── rules/            ← ${ruleCount} rules
│
├── data/
│   ├── pgn/              ← PGN game files (pipeline input)
│   └── stockfish/        ← ${sfPresent ? `✅ binary: ${sfPath}` : "⚠  Binary MISSING"}
│
├── out/                  ← Generated artifacts (gitignored)
│   ├── chess-os/         ← AI context + sprint proofs
${outDirLines}
│
├── scripts/
│   ├── ai-context.mjs    ← This generator ← pnpm ai:context
│   ├── dev-web.mjs
│   └── dev-web-e2e.mjs
│
└── tests/
    ├── e2e/              ← Playwright E2E tests (61+)
    └── smoke/            ← Smoke tests (16)
\`\`\`

---

## Web App Routes

| Route | Type |
|---|---|
${routeMapLines}
${apiMapLines}

---

## Worker Scripts (${workerScripts.length})

**Status: ${workerStatus}**${blockedBy ? `\n**Blocked by:** ${blockedBy}` : ""}

| Script | Purpose |
|---|---|
${workerMapLines}

---

## Installed Skills (${skills.length})

| Skill | Wave | Invocation |
|---|---|---|
${skillMapLines}

---

## Stockfish / Engine

\`\`\`
Resolution order (packages/engine/src/stockfish/find-stockfish.ts):
  1. STOCKFISH_PATH env var (if set)
  2. System PATH (where / which)
  3. data/stockfish/stockfish.exe  (Windows)
     data/stockfish/stockfish      (Unix)

Current status: ${sfPresent ? `FOUND at ${sfPath}` : "NOT FOUND"}
Web app uses Stockfish: NO (reads pre-generated artifacts only)
Worker uses Stockfish: YES (via evaluatePosition seam in packages/engine)
Stub mode: ENGINE_MODE=stub (deterministic, no binary required)
\`\`\`

---

## Key Commands

\`\`\`bash
pnpm ai:context                                           # Regenerate AI context
cd apps/web && npx next dev --webpack -p 3001             # Web dev server
pnpm -r run typecheck                                     # Typecheck all packages
pnpm --filter web run build                               # Build web app
pnpm test:e2e                                             # E2E tests (port 3401)
pnpm test:e2e:smoke                                       # Smoke tests
ENGINE_MODE=stub PGN_DIR=./data/pgn pnpm --filter worker run start   # Pipeline
pnpm --filter worker run generate-session                 # Generate sessions
\`\`\`
`;
write(join(OUT_SNAP, "repo_map.md"), repoMap);

// ────────────────────────────────────────────────────────────────────────────
// 6e. web_app_snapshot.json
// ────────────────────────────────────────────────────────────────────────────
const webSnap = {
  _meta: { generated_at: TODAY, generated_by: "pnpm ai:context", authority: "direct inspection of apps/web/" },
  framework: "Next.js 16",
  react_version: "19",
  css: "Tailwind v4",
  location: "apps/web/",
  dev_port: 3001,
  e2e_port: 3401,
  build_flag: "--webpack (required)",
  status: "feature_complete",
  routes: uniqueRoutes.map((r) => ({ route: r, type: "page", status: "active" })),
  api_routes: apiRoutes.map((r) => ({ route: r, type: "api" })),
  server_actions: [
    "generateNewSession (actions/generation.ts)",
    "refreshInsights (actions/generation.ts)",
    "import-analysis actions",
    "repertoire actions",
  ],
  diagnostic_loop_touchpoints: {
    stage1_review: "/games/[gameId] (CoachingReview component)",
    stage3_session: `/study/[sessionId] (StudyPlayer)${!outDirs.datasets ? " — BLOCKED" : ""}`,
    stage4_progress: "/history and /sessions/",
    coach_surface: "/coach (CoachOverviewPanel)",
  },
  stockfish_in_web_app: {
    direct_usage: false,
    note: "Web app reads pre-generated artifacts only. No engine calls at runtime.",
  },
  session_execution: {
    wired: true,
    via: "apps/web/src/lib/generation-server.ts → generateNewSession server action",
    reads_from: "out/datasets/training-exercises.jsonl",
    writes_to: "out/sessions/<sessionId>/study-session.json",
    currently_blocked: !outDirs.datasets,
    blocked_by: !outDirs.datasets ? blockedBy : null,
  },
  empty_state_routes: [
    !outDirs.coach && "/coach",
    !outDirs.progress && "/history",
    !outDirs.curriculum && "/curriculum",
    !outDirs.dashboard && "/ (dashboard)",
  ].filter(Boolean),
  components_dir: "apps/web/src/components/",
  lib_dir: "apps/web/src/lib/",
};
write(join(OUT_SNAP, "web_app_snapshot.json"), JSON.stringify(webSnap, null, 2));

// ────────────────────────────────────────────────────────────────────────────
// 6f. skills_snapshot.json
// ────────────────────────────────────────────────────────────────────────────
const planningSkills = ex("docs/ai/skills") ? listDirs("docs/ai/skills") : [];
const skillsSnap = {
  _meta: { generated_at: TODAY, generated_by: "pnpm ai:context", authority: ".claude/skills/ + docs/ai/" },
  installed_count: skills.length,
  installed_skills: skillDetails,
  agents_count: agentCount,
  rules_count: ruleCount,
  planning_layer_skills: planningSkills,
  wave3: {
    expected: wave3Expected,
    installed: wave3Expected.filter((s) => skills.includes(s)),
    all_installed: wave3Expected.every((s) => skills.includes(s)),
  },
  wave4: {
    expected: wave4Expected,
    installed: wave4Expected.filter((s) => skills.includes(s)),
    missing: wave4Missing,
    status: wave4Missing.length ? "PARTIAL" : "COMPLETE",
  },
  doc_health: {
    "AI_SKILL_WAVE_3_CHESS_DIAGNOSTICS_v1.md": ex("docs/ai/AI_SKILL_WAVE_3_CHESS_DIAGNOSTICS_v1.md") ? "present" : "missing",
    "AI_SKILL_WAVE_4_CHESS_EXPANSION_v1.md": ex("docs/ai/AI_SKILL_WAVE_4_CHESS_EXPANSION_v1.md") ? "present" : "missing",
  },
};
write(join(OUT_SNAP, "skills_snapshot.json"), JSON.stringify(skillsSnap, null, 2));

// ────────────────────────────────────────────────────────────────────────────
// 6g. status_snapshot.json
// ────────────────────────────────────────────────────────────────────────────
const statusSnap = {
  _meta: { generated_at: TODAY, generated_by: "pnpm ai:context", authority: "docs/chess-os/ truth docs" },
  active_phase: activePhase,
  last_updated: lastUpdated,
  overall_health: sfPresent && outDirs.datasets ? "GREEN" : "AMBER",
  health_reason: !sfPresent
    ? "Pipeline blocked: Stockfish binary missing"
    : !outDirs.datasets
    ? "Pipeline not yet run; no training data"
    : "All systems operational",
  status_docs_present: Object.fromEntries(
    Object.entries(docPaths).map(([k, v]) => [k, !!docs[k]])
  ),
  output_dir_health: Object.fromEntries(
    outDirNames.map((d) => [d, outDirs[d] ? "exists" : "missing"])
  ),
  games_available: gameIds.length,
  known_gaps: [
    !sfPresent && "Stockfish binary missing — all pipeline commands blocked",
    !outDirs.datasets && "out/datasets/ missing — session generation blocked",
    !outDirs.sessions && "out/sessions/ missing — no sessions yet",
    !ex("docs/chess-os/architecture/SYSTEM_OVERVIEW.md") && "SYSTEM_OVERVIEW.md not yet written",
    wave4Missing.length && `Wave 4 skills not built: ${wave4Missing.join(", ")}`,
  ].filter(Boolean),
};
write(join(OUT_SNAP, "status_snapshot.json"), JSON.stringify(statusSnap, null, 2));

// ────────────────────────────────────────────────────────────────────────────
// 6h. runtime_snapshot.json
// ────────────────────────────────────────────────────────────────────────────
const runtimeSnap = {
  _meta: { generated_at: TODAY, generated_by: "pnpm ai:context", authority: "apps/worker/src/ + packages/engine/src/ inspection" },
  overall_status: workerStatus,
  blocked_by: blockedBy,
  engine: {
    mode_env_var: "ENGINE_MODE",
    default_mode: "stub",
    stub: { file: "packages/engine/src/stockfish/stub-engine.ts", binary_required: false },
    stockfish: { file: "packages/engine/src/stockfish/stockfish-service.ts", binary_required: true },
    resolution_file: "packages/engine/src/stockfish/find-stockfish.ts",
    resolution_order: [
      "1. STOCKFISH_PATH env var",
      "2. System PATH (where/which)",
      "3. data/stockfish/stockfish.exe (Windows)",
      "3. data/stockfish/stockfish (Unix)",
    ],
    binary_present: sfPresent,
    binary_path: sfPath,
  },
  worker_scripts: workerScripts.map((f) => ({
    file: f,
    path: `apps/worker/src/${f}`,
    status: (!outDirs.datasets && f !== "index.ts") ? "blocked" : "available",
  })),
  session_pipeline: {
    entry_point: "apps/worker/src/generate-session.ts",
    required_input: "out/datasets/training-exercises.jsonl",
    required_input_exists: outDirs.datasets,
    generation_chain: [
      "PGN → training-dataset.json (index.ts)",
      "training-dataset.json → training-targets.json (generate-training-targets.ts)",
      "training-targets.json → training-exercises.jsonl (generate-exercises.ts)",
      "training-exercises.jsonl → study-session.json (generate-session.ts)",
    ],
    status: !outDirs.datasets ? "BLOCKED" : "READY",
    env_vars: { ADAPTIVE: "true|false", SESSION_SIZE: "number", SESSION_COUNT: "number" },
  },
  existing_data: {
    games: gameIds,
    import_status: importStatus
      ? { status: importStatus.status, error: importStatus.error, generated_at: importStatus.generatedAt }
      : null,
  },
  stub_mode_note: "ENGINE_MODE=stub runs pipeline with deterministic fake scores. No binary required. Useful for testing pipeline infrastructure but not for real improvement feedback.",
  remediation: !sfPresent
    ? [
        "1. Install Stockfish binary to data/stockfish/stockfish.exe",
        "2. ENGINE_MODE=stockfish PGN_DIR=./data/pgn pnpm --filter worker run start",
        "3. pnpm --filter worker run generate-exercises",
        "4. pnpm --filter worker run generate-session",
        "5. Open localhost:3001/study/<sessionId> to execute session",
        "6. Re-run /study-closeout-helper → diagnostic loop reaches COMPLETE",
      ]
    : [],
};
write(join(OUT_SNAP, "runtime_snapshot.json"), JSON.stringify(runtimeSnap, null, 2));

// ── [7] Summary ──────────────────────────────────────────────────────────────
hr();
console.log(bold(green(`✓ Done — ${written.length} artifacts written`)));
hr();

console.log(`\n${bold("Artifacts:")}`);
for (const f of written) {
  console.log(`  📄 ${f}`);
}

console.log(`\n${bold("Snapshot:")}`);
console.log(`  Phase:     ${activePhase}`);
console.log(`  Skills:    ${skills.length} installed (Wave 2–4)`);
console.log(`  Routes:    ${uniqueRoutes.length} pages + ${apiRoutes.length} API routes`);
console.log(`  Stockfish: ${sfPresent ? green("✓ " + sfPath) : yellow("⚠  NOT FOUND — data/stockfish/stockfish.exe")}`);
console.log(`  Pipeline:  ${workerStatus === "READY" ? green("READY") : yellow("BLOCKED")}${blockedBy ? dim(" — " + blockedBy) : ""}`);
console.log(`  Games:     ${gameIds.length} analyzed`);
console.log(`  Out dirs:  ${existingOutCount}/${outDirNames.length} exist`);

console.log(`\n${bold("Context bundle location:")}`);
console.log(dim("  out/chess-os/ai/context/context_bundle.md"));
console.log(dim("  → Copy and paste into ChatGPT or Claude before any architecture session"));

if (!sfPresent) {
  console.log(`\n${yellow(bold("Next action:"))} Install Stockfish to unblock pipeline:`);
  console.log(dim("  Place binary at: data/stockfish/stockfish.exe"));
}

console.log("");
