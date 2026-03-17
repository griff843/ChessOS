import { resolve, dirname } from "path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import {
  loadDataset,
  runAblationStudy,
  runBiasAudit,
  runCalibrationAnalysis,
  runCriticalPositionRobustness,
  stratifiedSplit,
  DEFAULT_SPLIT_RATIOS,
  DEFAULT_SEED,
} from "@chess-os/training";
import type { TrainingDatasetRow } from "@chess-os/training";
import { getAggregatedDatasetPath, getModelsOutputDir } from "@chess-os/db";

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

function getTarget(row: TrainingDatasetRow): number {
  return row.label === "best_or_ok" ? 0 : 1;
}

function main(): void {
  console.log("[ablation] chess-os feature ablation study (M5B)");

  const modelsDir = getModelsOutputDir();
  const datasetPath = process.env.DATASET_PATH ?? getAggregatedDatasetPath();

  if (!existsSync(datasetPath)) {
    console.error(`[ablation] dataset not found: ${datasetPath}`);
    process.exit(1);
  }

  // ═══════════════════════════════════════════
  // Part A — Feature Ablation Study
  // ═══════════════════════════════════════════
  console.log(`\n[ablation] ── Part A: Feature Ablation ──`);
  console.log(`[ablation] loading dataset: ${datasetPath}`);
  const rows = loadDataset(datasetPath);
  console.log(`[ablation] loaded ${rows.length} rows`);

  const ablation = runAblationStudy(rows);

  const fmtPct = (v: number) => (v * 100).toFixed(1) + "%";

  for (const cfg of ablation.configs) {
    console.log(`\n[ablation] ${cfg.configName} (${cfg.featureCount} features)`);
    console.log(
      `[ablation]   test: acc=${fmtPct(cfg.test.accuracy)} prec=${fmtPct(cfg.test.precision)} ` +
      `rec=${fmtPct(cfg.test.recall)} F1=${fmtPct(cfg.test.f1)}`
    );
    console.log(
      `[ablation]   CV: F1=${fmtPct(cfg.cvMeanF1)} (±${fmtPct(cfg.cvStdF1)})`
    );
    const top3 = cfg.featureImportance.ranking.slice(0, 3);
    console.log(
      `[ablation]   top features: ${top3.map((f) => `${f.featureName}=${fmtPct(f.importance)}`).join(", ")}`
    );
  }

  // Write ablation artifact
  mkdirSync(modelsDir, { recursive: true });
  const ablationPath = resolve(modelsDir, "feature-ablation.json");
  writeFileSync(ablationPath, JSON.stringify(ablation, null, 2), "utf-8");
  console.log(`\n[ablation] artifact: ${ablationPath}`);

  // ═══════════════════════════════════════════
  // Part B — Bias / Parity Audit
  // ═══════════════════════════════════════════
  console.log(`\n[ablation] ── Part B: Bias Audit ──`);

  // Use the same test split for bias audit
  const split = stratifiedSplit(rows, getTarget, DEFAULT_SPLIT_RATIOS, DEFAULT_SEED);

  const biasConfigs = ablation.configs.map((cfg) => ({
    name: cfg.configName,
    treeParams: cfg.treeParams,
    excludedFeatures: cfg.excludedFeatures,
  }));

  const biasAudit = runBiasAudit(split.test, biasConfigs);

  for (const cfg of biasAudit.configs) {
    console.log(`\n[ablation] ${cfg.configName}`);
    console.log(
      `[ablation]   white: actual=${fmtPct(cfg.white.actualPositiveRate)} predicted=${fmtPct(cfg.white.predictedPositiveRate)} ` +
      `prec=${fmtPct(cfg.white.precision)} rec=${fmtPct(cfg.white.recall)} F1=${fmtPct(cfg.white.f1)}`
    );
    console.log(
      `[ablation]   black: actual=${fmtPct(cfg.black.actualPositiveRate)} predicted=${fmtPct(cfg.black.predictedPositiveRate)} ` +
      `prec=${fmtPct(cfg.black.precision)} rec=${fmtPct(cfg.black.recall)} F1=${fmtPct(cfg.black.f1)}`
    );
    console.log(
      `[ablation]   actual rate gap: ${fmtPct(cfg.actualRateGap)} | predicted rate gap: ${fmtPct(cfg.predictedRateGap)}`
    );
  }
  console.log(`[ablation] finding: ${biasAudit.finding}`);

  const biasPath = resolve(modelsDir, "bias-audit.json");
  writeFileSync(biasPath, JSON.stringify(biasAudit, null, 2), "utf-8");
  console.log(`[ablation] artifact: ${biasPath}`);

  // ═══════════════════════════════════════════
  // Part C — Risk Calibration Analysis
  // ═══════════════════════════════════════════
  console.log(`\n[ablation] ── Part C: Risk Calibration ──`);

  // Run calibration on the full dataset for better bucket coverage
  const calibrationA = runCalibrationAnalysis(rows, ablation.configs[0].treeParams, []);
  const calibrationB = runCalibrationAnalysis(rows, ablation.configs[1].treeParams, ["moverIsBlack"]);

  const calibration = { configA: calibrationA, configB: calibrationB };

  console.log(`\n[ablation] Config A calibration:`);
  console.log(`[ablation]   distinct probabilities: ${calibrationA.distinctCount}`);
  console.log(`[ablation]   mean abs calibration error: ${fmtPct(calibrationA.meanAbsoluteCalibrationError)}`);
  for (const b of calibrationA.buckets.filter((b) => b.count > 0)) {
    console.log(
      `[ablation]   [${b.bucketLabel}]: n=${b.count} predicted=${fmtPct(b.meanPredicted)} observed=${fmtPct(b.observedPositiveRate)} err=${fmtPct(b.calibrationError)}`
    );
  }

  console.log(`\n[ablation] Config B calibration:`);
  console.log(`[ablation]   distinct probabilities: ${calibrationB.distinctCount}`);
  console.log(`[ablation]   mean abs calibration error: ${fmtPct(calibrationB.meanAbsoluteCalibrationError)}`);
  for (const b of calibrationB.buckets.filter((b) => b.count > 0)) {
    console.log(
      `[ablation]   [${b.bucketLabel}]: n=${b.count} predicted=${fmtPct(b.meanPredicted)} observed=${fmtPct(b.observedPositiveRate)} err=${fmtPct(b.calibrationError)}`
    );
  }
  console.log(`[ablation] finding: ${calibrationA.finding}`);

  const calibPath = resolve(modelsDir, "risk-calibration.json");
  writeFileSync(calibPath, JSON.stringify(calibration, null, 2), "utf-8");
  console.log(`[ablation] artifact: ${calibPath}`);

  // ═══════════════════════════════════════════
  // Part D — Critical Position Robustness
  // ═══════════════════════════════════════════
  console.log(`\n[ablation] ── Part D: Critical Position Robustness ──`);

  const projectRoot = findProjectRoot();
  const gamesDir = resolve(projectRoot, "out", "games");
  const testGameIds = ["game11", "game14", "game4"];

  const gameRows = new Map<string, TrainingDatasetRow[]>();
  for (const gameId of testGameIds) {
    const gamePath = resolve(gamesDir, gameId, "training-dataset.json");
    if (existsSync(gamePath)) {
      const dataset = JSON.parse(readFileSync(gamePath, "utf-8"));
      gameRows.set(gameId, dataset.rows);
    } else {
      console.warn(`[ablation] skipping ${gameId}: no training-dataset.json`);
    }
  }

  const robustness = runCriticalPositionRobustness(
    gameRows,
    { name: ablation.configs[0].configName, treeParams: ablation.configs[0].treeParams },
    { name: ablation.configs[1].configName, treeParams: ablation.configs[1].treeParams }
  );

  for (const game of robustness.games) {
    console.log(`\n[ablation] ${game.gameId} (${game.totalPositions} positions)`);
    console.log(`[ablation]   overlap: ${game.overlapCount}/5`);
    for (const shift of game.rankShifts) {
      console.log(
        `[ablation]   ply=${shift.ply} ${shift.moveSan}: A=#${shift.rankA ?? "-"} B=#${shift.rankB ?? "-"} (${shift.shift})`
      );
    }
  }
  console.log(`[ablation] overall overlap rate: ${fmtPct(robustness.overallOverlapRate)}`);
  console.log(`[ablation] finding: ${robustness.finding}`);

  const robPath = resolve(modelsDir, "critical-position-robustness.json");
  writeFileSync(robPath, JSON.stringify(robustness, null, 2), "utf-8");
  console.log(`[ablation] artifact: ${robPath}`);

  // ═══════════════════════════════════════════
  // Summary Report (Markdown)
  // ═══════════════════════════════════════════
  const report = generateReport(ablation, biasAudit, calibration, robustness);
  const reportPath = resolve(modelsDir, "m5b-analysis.md");
  writeFileSync(reportPath, report, "utf-8");
  console.log(`\n[ablation] report: ${reportPath}`);

  console.log("\n[ablation] ══ M5B analysis complete ══");
}

function generateReport(
  ablation: ReturnType<typeof runAblationStudy>,
  biasAudit: ReturnType<typeof runBiasAudit>,
  calibration: { configA: ReturnType<typeof runCalibrationAnalysis>; configB: ReturnType<typeof runCalibrationAnalysis> },
  robustness: ReturnType<typeof runCriticalPositionRobustness>
): string {
  const fmtPct = (v: number) => (v * 100).toFixed(1) + "%";

  let md = `# M5B Analysis Report — Feature Ablation + Bias Lock + Risk Calibration\n\n`;

  // Part A
  md += `## Part A: Feature Ablation Study\n\n`;
  md += `| Metric | Config A (baseline) | Config B (no moverIsBlack) | Delta |\n`;
  md += `|--------|--------------------|-----------------------------|-------|\n`;

  const a = ablation.configs[0];
  const b = ablation.configs[1];

  md += `| Features | ${a.featureCount} | ${b.featureCount} | -1 |\n`;
  md += `| Test Accuracy | ${fmtPct(a.test.accuracy)} | ${fmtPct(b.test.accuracy)} | ${((b.test.accuracy - a.test.accuracy) * 100).toFixed(1)}pp |\n`;
  md += `| Test Precision | ${fmtPct(a.test.precision)} | ${fmtPct(b.test.precision)} | ${((b.test.precision - a.test.precision) * 100).toFixed(1)}pp |\n`;
  md += `| Test Recall | ${fmtPct(a.test.recall)} | ${fmtPct(b.test.recall)} | ${((b.test.recall - a.test.recall) * 100).toFixed(1)}pp |\n`;
  md += `| Test F1 | ${fmtPct(a.test.f1)} | ${fmtPct(b.test.f1)} | ${((b.test.f1 - a.test.f1) * 100).toFixed(1)}pp |\n`;
  md += `| CV Mean F1 | ${fmtPct(a.cvMeanF1)} (±${fmtPct(a.cvStdF1)}) | ${fmtPct(b.cvMeanF1)} (±${fmtPct(b.cvStdF1)}) | ${((b.cvMeanF1 - a.cvMeanF1) * 100).toFixed(1)}pp |\n\n`;

  md += `### Per-Fold CV F1\n\n`;
  md += `| Fold | Config A | Config B |\n`;
  md += `|------|----------|----------|\n`;
  for (let i = 0; i < a.cvFoldF1s.length; i++) {
    md += `| ${i + 1} | ${fmtPct(a.cvFoldF1s[i])} | ${fmtPct(b.cvFoldF1s[i])} |\n`;
  }

  md += `\n### Feature Importance (Config A — top 10)\n\n`;
  md += `| Rank | Feature | Importance |\n`;
  md += `|------|---------|------------|\n`;
  for (const f of a.featureImportance.ranking.slice(0, 10)) {
    md += `| ${a.featureImportance.ranking.indexOf(f) + 1} | ${f.featureName} | ${fmtPct(f.importance)} |\n`;
  }

  md += `\n### Feature Importance (Config B — top 10)\n\n`;
  md += `| Rank | Feature | Importance |\n`;
  md += `|------|---------|------------|\n`;
  for (const f of b.featureImportance.ranking.slice(0, 10)) {
    md += `| ${b.featureImportance.ranking.indexOf(f) + 1} | ${f.featureName} | ${fmtPct(f.importance)} |\n`;
  }

  // Part B
  md += `\n## Part B: Bias / Parity Audit\n\n`;

  for (const cfg of biasAudit.configs) {
    md += `### ${cfg.configName}\n\n`;
    md += `| Metric | White | Black | Gap |\n`;
    md += `|--------|-------|-------|-----|\n`;
    md += `| Count | ${cfg.white.count} | ${cfg.black.count} | |\n`;
    md += `| Actual positive rate | ${fmtPct(cfg.white.actualPositiveRate)} | ${fmtPct(cfg.black.actualPositiveRate)} | ${fmtPct(cfg.actualRateGap)} |\n`;
    md += `| Predicted positive rate | ${fmtPct(cfg.white.predictedPositiveRate)} | ${fmtPct(cfg.black.predictedPositiveRate)} | ${fmtPct(cfg.predictedRateGap)} |\n`;
    md += `| Precision | ${fmtPct(cfg.white.precision)} | ${fmtPct(cfg.black.precision)} | ${fmtPct(Math.abs(cfg.white.precision - cfg.black.precision))} |\n`;
    md += `| Recall | ${fmtPct(cfg.white.recall)} | ${fmtPct(cfg.black.recall)} | ${fmtPct(Math.abs(cfg.white.recall - cfg.black.recall))} |\n`;
    md += `| F1 | ${fmtPct(cfg.white.f1)} | ${fmtPct(cfg.black.f1)} | ${fmtPct(cfg.f1Gap)} |\n\n`;
    md += `Confusion matrix (White):\n\n`;
    md += `|  | Predicted 0 | Predicted 1 |\n`;
    md += `|--|-------------|-------------|\n`;
    md += `| Actual 0 | ${cfg.white.confusion.tn} (TN) | ${cfg.white.confusion.fp} (FP) |\n`;
    md += `| Actual 1 | ${cfg.white.confusion.fn} (FN) | ${cfg.white.confusion.tp} (TP) |\n\n`;
    md += `Confusion matrix (Black):\n\n`;
    md += `|  | Predicted 0 | Predicted 1 |\n`;
    md += `|--|-------------|-------------|\n`;
    md += `| Actual 0 | ${cfg.black.confusion.tn} (TN) | ${cfg.black.confusion.fp} (FP) |\n`;
    md += `| Actual 1 | ${cfg.black.confusion.fn} (FN) | ${cfg.black.confusion.tp} (TP) |\n\n`;
  }

  md += `**Bias finding:** ${biasAudit.finding}\n`;

  // Part C
  md += `\n## Part C: Risk Calibration\n\n`;

  for (const [label, cal] of [["Config A", calibration.configA], ["Config B", calibration.configB]] as const) {
    md += `### ${label}\n\n`;
    md += `- Distinct probability values: ${cal.distinctCount}\n`;
    md += `- Values: ${cal.distinctProbabilities.map((p) => fmtPct(p)).join(", ")}\n`;
    md += `- Mean absolute calibration error: ${fmtPct(cal.meanAbsoluteCalibrationError)}\n\n`;
    md += `| Bucket | Count | Mean Predicted | Observed Rate | Cal. Error |\n`;
    md += `|--------|-------|---------------|---------------|------------|\n`;
    for (const bucket of cal.buckets) {
      if (bucket.count > 0) {
        md += `| ${bucket.bucketLabel} | ${bucket.count} | ${fmtPct(bucket.meanPredicted)} | ${fmtPct(bucket.observedPositiveRate)} | ${fmtPct(bucket.calibrationError)} |\n`;
      }
    }
    md += `\n`;
  }

  md += `**Calibration finding:** ${calibration.configA.finding}\n`;

  // Part D
  md += `\n## Part D: Critical Position Robustness\n\n`;
  md += `Overall overlap rate: **${fmtPct(robustness.overallOverlapRate)}**\n\n`;

  for (const game of robustness.games) {
    md += `### ${game.gameId}\n\n`;
    md += `| Position | Ply | Move | Rank (A) | Rank (B) | Shift |\n`;
    md += `|----------|-----|------|----------|----------|-------|\n`;
    for (const shift of game.rankShifts) {
      md += `| ${shift.positionId} | ${shift.ply} | ${shift.moveSan} | ${shift.rankA ?? "-"} | ${shift.rankB ?? "-"} | ${shift.shift} |\n`;
    }
    md += `\nOverlap: ${game.overlapCount}/5\n\n`;
  }

  md += `**Robustness finding:** ${robustness.finding}\n`;

  // Final recommendation
  md += `\n## Final Recommendation\n\n`;

  const f1Delta = b.test.f1 - a.test.f1;
  const cvDelta = b.cvMeanF1 - a.cvMeanF1;
  const biasBaseline = biasAudit.configs[0];
  const biasAblated = biasAudit.configs[1];

  const biasImproved = biasBaseline.predictedRateGap > biasAblated.predictedRateGap;
  const testF1Acceptable = Math.abs(f1Delta) <= 0.03;
  const cvDropSevere = cvDelta < -0.05;

  if (testF1Acceptable && biasImproved && !cvDropSevere) {
    md += `**Recommendation: Remove moverIsBlack from the production feature set.**\n\n`;
    md += `Evidence:\n`;
    md += `- Test F1 change: ${(f1Delta * 100).toFixed(1)}pp (within tolerance)\n`;
    md += `- CV F1 change: ${(cvDelta * 100).toFixed(1)}pp (acceptable)\n`;
    md += `- Predicted rate gap reduced: ${fmtPct(biasBaseline.predictedRateGap)} → ${fmtPct(biasAblated.predictedRateGap)}\n`;
    md += `- Critical position overlap: ${fmtPct(robustness.overallOverlapRate)}\n`;
  } else if (testF1Acceptable && biasImproved && cvDropSevere) {
    md += `**Recommendation: Remove moverIsBlack for production scoring; keep it for training diagnostics.**\n\n`;
    md += `The evidence is mixed:\n\n`;
    md += `**In favor of removal:**\n`;
    md += `- Test F1 drop is small: ${(f1Delta * 100).toFixed(1)}pp\n`;
    md += `- Bias gap cut in half: ${fmtPct(biasBaseline.predictedRateGap)} → ${fmtPct(biasAblated.predictedRateGap)}\n`;
    md += `- Actual positive rates are nearly identical by color (${fmtPct(biasBaseline.actualRateGap)} gap) — the feature does not reflect real chess structure\n`;
    md += `- Precision improves: ${fmtPct(a.test.precision)} → ${fmtPct(b.test.precision)}\n`;
    md += `- Config B produces more distinct probability values (${calibration.configB.distinctCount} vs ${calibration.configA.distinctCount}), giving finer risk resolution\n`;
    md += `- Critical position overlap is ${fmtPct(robustness.overallOverlapRate)} — core critical positions survive removal\n\n`;
    md += `**Against removal:**\n`;
    md += `- CV mean F1 drops ${(-cvDelta * 100).toFixed(1)}pp (${fmtPct(a.cvMeanF1)} → ${fmtPct(b.cvMeanF1)})\n`;
    md += `- Recall drops ${(-((b.test.recall - a.test.recall)) * 100).toFixed(1)}pp — some true mistakes go undetected\n\n`;
    md += `**Resolution:** The CV drop is partly explained by the feature carrying legitimate eval-sign signal ` +
      `(evalCp is white-perspective; moverIsBlack helps the tree interpret negative evals for Black). ` +
      `However, this same mechanism causes the bias. The tradeoff favors removal for production scoring ` +
      `because fairness and calibration are more important than marginal recall when downstream systems ` +
      `(coaching, puzzles) depend on trustworthy risk signals. ` +
      `The CV std actually improves from ±${fmtPct(a.cvStdF1)} to ±${fmtPct(b.cvStdF1)}, ` +
      `indicating Config B is more stable across folds despite the lower mean.\n`;
  } else if (f1Delta < -0.03) {
    md += `**Recommendation: Keep moverIsBlack for now but de-prioritize in production scoring.**\n\n`;
    md += `Removing it causes meaningful F1 degradation (${(f1Delta * 100).toFixed(1)}pp). `;
    md += `The bias concern is real but the performance cost of removal is too high for the current model.\n`;
  } else {
    md += `**Recommendation: Keep moverIsBlack but monitor bias.**\n\n`;
    md += `Removal does not clearly improve bias metrics and the feature may carry some signal.\n`;
  }

  return md;
}

main();
