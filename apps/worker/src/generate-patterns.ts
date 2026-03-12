import { resolve, dirname } from "path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import {
  buildPatternLibrary,
  detectTacticalPatterns,
} from "@chess-os/training";
import type {
  TrainingExercise,
  ProgressStore,
  TacticalPattern,
} from "@chess-os/training";

function findProjectRoot(): string {
  let dir = process.cwd();
  while (true) {
    const ws = resolve(dir, "pnpm-workspace.yaml");
    try {
      if (existsSync(ws)) return dir;
    } catch {}
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function main(): void {
  console.log("[patterns] chess-os tactical pattern library generation (M12D)");

  const projectRoot = findProjectRoot();
  const outDir = resolve(projectRoot, "out");

  // 1. Load exercise corpus
  const corpusPath = resolve(outDir, "datasets", "training-exercises.jsonl");
  if (!existsSync(corpusPath)) {
    console.error("Exercise corpus not found. Run: pnpm --filter worker run generate-exercises");
    process.exit(1);
  }

  const raw = readFileSync(corpusPath, "utf-8");
  const exercises: TrainingExercise[] = raw
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));

  console.log(`  Loaded ${exercises.length} exercises`);

  // 2. Pre-compute patterns for all exercises
  const patternCache = new Map<string, TacticalPattern[]>();
  let patterned = 0;

  for (const ex of exercises) {
    if (!ex.engineAnswer.bestMoveUci || !ex.engineAnswer.bestMoveSan) continue;
    const patterns = detectTacticalPatterns(
      ex.fen,
      ex.engineAnswer.bestMoveUci,
      ex.phase
    );
    patternCache.set(ex.positionId, patterns);
    if (patterns.length > 0 && patterns[0] !== "unclassified") {
      patterned++;
    }
  }

  console.log(`  Detected patterns in ${patterned}/${exercises.length} exercises`);

  // 3. Load progress store (optional)
  const progressPath = resolve(outDir, "progress", "exercise-progress.json");
  let store: ProgressStore = {
    totalExercises: exercises.length,
    exercises: {},
    lastUpdatedAt: new Date().toISOString(),
  };

  if (existsSync(progressPath)) {
    store = JSON.parse(readFileSync(progressPath, "utf-8"));
    console.log(`  Loaded progress store (${Object.keys(store.exercises).length} entries)`);
  }

  // 4. Build pattern library
  const library = buildPatternLibrary(exercises, store, patternCache);

  // 5. Write output
  const patternsDir = resolve(outDir, "patterns");
  mkdirSync(patternsDir, { recursive: true });

  const outputPath = resolve(patternsDir, "pattern-library.json");
  writeFileSync(outputPath, JSON.stringify(library, null, 2));

  console.log(`  Pattern library: ${library.entries.length} patterns`);
  console.log(`  Total patterned exercises: ${library.totalPatternedExercises}`);

  for (const entry of library.entries.slice(0, 5)) {
    console.log(
      `    ${entry.pattern}: ${entry.totalSeen} seen, ${(entry.accuracy * 100).toFixed(0)}% accuracy, ${entry.trendDirection}`
    );
  }

  console.log(`  Written to: ${outputPath}`);
}

main();
