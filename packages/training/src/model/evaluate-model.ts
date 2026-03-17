/**
 * Model evaluation: accuracy, precision, recall, F1, confusion matrix.
 */

import type { FeatureImportanceResult } from "./feature-importance";
import type { ThresholdTuningResult } from "./threshold-tuning";
import type { CrossValidationResult, AggregateMetrics } from "./cross-validation";

export interface ConfusionMatrix {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

export interface EvaluationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  confusion: ConfusionMatrix;
  size: number;
  positiveCount: number;
  negativeCount: number;
}

export interface ModelMetrics {
  name: string;
  train: EvaluationMetrics;
  val: EvaluationMetrics;
  test: EvaluationMetrics;
}

/**
 * Compute binary classification metrics.
 * Positive class = 1 (mistake_or_worse).
 */
export function evaluateModel(
  yTrue: number[],
  yPred: number[]
): EvaluationMetrics {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (let i = 0; i < yTrue.length; i++) {
    if (yTrue[i] === 1 && yPred[i] === 1) tp++;
    else if (yTrue[i] === 0 && yPred[i] === 1) fp++;
    else if (yTrue[i] === 0 && yPred[i] === 0) tn++;
    else fn++;
  }

  const accuracy = yTrue.length > 0 ? (tp + tn) / yTrue.length : 0;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 =
    precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;

  return {
    accuracy,
    precision,
    recall,
    f1,
    confusion: { tp, fp, tn, fn },
    size: yTrue.length,
    positiveCount: yTrue.filter((v) => v === 1).length,
    negativeCount: yTrue.filter((v) => v === 0).length,
  };
}

export interface ReportMeta {
  datasetPath: string;
  totalRows: number;
  featureCount: number;
  classDistribution: { notMistake: number; mistakeOrWorse: number };
  splitSizes: { train: number; val: number; test: number };
  splitStrategy: string;
  logisticConfig?: {
    epochs: number;
    learningRate: number;
    finalTrainLoss: number;
    classWeighted: boolean;
  };
  treeConfig?: {
    maxDepth: number;
    minSamplesLeaf: number;
  };
  featureImportance?: FeatureImportanceResult;
  thresholdTuning?: ThresholdTuningResult;
  crossValidation?: CrossValidationResult;
}

/**
 * Format a comprehensive evaluation report.
 */
export function formatEvaluationReport(
  models: ModelMetrics[],
  meta: ReportMeta
): string {
  const fmtPct = (v: number) => (v * 100).toFixed(1) + "%";

  const fmtMetrics = (label: string, m: EvaluationMetrics) =>
    `#### ${label} (n=${m.size}, positive=${m.positiveCount}, negative=${m.negativeCount})

| Metric | Value |
|--------|-------|
| Accuracy | ${fmtPct(m.accuracy)} |
| Precision | ${fmtPct(m.precision)} |
| Recall | ${fmtPct(m.recall)} |
| F1 | ${fmtPct(m.f1)} |

Confusion matrix:

|  | Predicted 0 | Predicted 1 |
|--|-------------|-------------|
| Actual 0 | ${m.confusion.tn} (TN) | ${m.confusion.fp} (FP) |
| Actual 1 | ${m.confusion.fn} (FN) | ${m.confusion.tp} (TP) |`;

  const fmtModel = (mm: ModelMetrics) =>
    `### ${mm.name}

${fmtMetrics("Train", mm.train)}

${fmtMetrics("Validation", mm.val)}

${fmtMetrics("Test", mm.test)}`;

  const positiveRate =
    meta.totalRows > 0
      ? ((meta.classDistribution.mistakeOrWorse / meta.totalRows) * 100).toFixed(1)
      : "0";

  // Model comparison table (test set)
  const comparisonHeader =
    "| Model | Accuracy | Precision | Recall | F1 |\n|-------|----------|-----------|--------|-----|";
  const comparisonRows = models
    .map(
      (m) =>
        `| ${m.name} | ${fmtPct(m.test.accuracy)} | ${fmtPct(m.test.precision)} | ${fmtPct(m.test.recall)} | ${fmtPct(m.test.f1)} |`
    )
    .join("\n");

  const bestModel = models.reduce((a, b) =>
    a.test.f1 >= b.test.f1 ? a : b
  );

  let configSection = "";
  if (meta.logisticConfig) {
    configSection += `
### Logistic Regression config

| Field | Value |
|-------|-------|
| Epochs | ${meta.logisticConfig.epochs} |
| Learning rate | ${meta.logisticConfig.learningRate} |
| Final train loss | ${meta.logisticConfig.finalTrainLoss.toFixed(4)} |
| Class weighted | ${meta.logisticConfig.classWeighted ? "Yes (inverse frequency)" : "No"} |
`;
  }
  if (meta.treeConfig) {
    configSection += `
### Decision Tree config

| Field | Value |
|-------|-------|
| Max depth | ${meta.treeConfig.maxDepth} |
| Min samples per leaf | ${meta.treeConfig.minSamplesLeaf} |
`;
  }

  // Feature importance section
  let featureImportanceSection = "";
  if (meta.featureImportance) {
    const top10 = meta.featureImportance.ranking.slice(0, 10);
    const fiRows = top10
      .map(
        (f, i) =>
          `| ${i + 1} | ${f.featureName} | ${(f.importance * 100).toFixed(1)}% |`
      )
      .join("\n");
    featureImportanceSection = `
## Feature Importance (Decision Tree)

Top 10 features by impurity-based importance:

| Rank | Feature | Importance |
|------|---------|-----------|
${fiRows}
`;
  }

  // Threshold tuning section
  let thresholdSection = "";
  if (meta.thresholdTuning) {
    const tt = meta.thresholdTuning;
    const ttRows = tt.results
      .map(
        (r) =>
          `| ${r.threshold.toFixed(2)} | ${fmtPct(r.metrics.accuracy)} | ${fmtPct(r.metrics.precision)} | ${fmtPct(r.metrics.recall)} | ${fmtPct(r.metrics.f1)} |`
      )
      .join("\n");
    thresholdSection = `
## Threshold Optimization (Logistic Regression)

Optimal threshold: **${tt.optimalThreshold.toFixed(2)}** (F1=${fmtPct(tt.optimalMetrics.f1)})

| Threshold | Accuracy | Precision | Recall | F1 |
|-----------|----------|-----------|--------|-----|
${ttRows}
`;
  }

  // Cross-validation section
  let cvSection = "";
  if (meta.crossValidation) {
    const cv = meta.crossValidation;

    const fmtAgg = (name: string, agg: AggregateMetrics) =>
      `| ${name} | ${fmtPct(agg.meanAccuracy)} (\u00b1${fmtPct(agg.stdAccuracy)}) | ${fmtPct(agg.meanPrecision)} (\u00b1${fmtPct(agg.stdPrecision)}) | ${fmtPct(agg.meanRecall)} (\u00b1${fmtPct(agg.stdRecall)}) | ${fmtPct(agg.meanF1)} (\u00b1${fmtPct(agg.stdF1)}) |`;

    const foldRows = cv.folds
      .map(
        (f) =>
          `| ${f.fold} | ${fmtPct(f.logistic.f1)} | ${fmtPct(f.tree.f1)} |`
      )
      .join("\n");

    cvSection = `
## Cross-Validation (${cv.k}-fold, seed=${cv.seed})

### Per-Fold F1

| Fold | Logistic Regression | Decision Tree |
|------|--------------------:|-------------:|
${foldRows}

### Aggregate Metrics (mean \u00b1 std)

| Model | Accuracy | Precision | Recall | F1 |
|-------|----------|-----------|--------|-----|
${fmtAgg("Logistic Regression", cv.logisticAggregate)}
${fmtAgg("Decision Tree", cv.treeAggregate)}
`;
  }

  // Analysis section
  const otherModel = models.find((m) => m !== bestModel);
  let analysisText = `${bestModel.name} achieves the best test F1 score of ${fmtPct(bestModel.test.f1)}.`;
  if (otherModel) {
    analysisText += ` Compared to ${otherModel.name} (F1=${fmtPct(otherModel.test.f1)}), it shows ${
      bestModel.test.recall > otherModel.test.recall
        ? "better recall on the minority class"
        : "a different precision-recall trade-off"
    }.`;
  }

  if (meta.crossValidation) {
    const cvTree = meta.crossValidation.treeAggregate;
    const cvLog = meta.crossValidation.logisticAggregate;
    analysisText += `\n\nCross-validation confirms stability: Decision Tree mean F1=${fmtPct(cvTree.meanF1)} (\u00b1${fmtPct(cvTree.stdF1)}), Logistic Regression mean F1=${fmtPct(cvLog.meanF1)} (\u00b1${fmtPct(cvLog.stdF1)}).`;
  }

  if (meta.thresholdTuning) {
    const tt = meta.thresholdTuning;
    analysisText += `\n\nOptimal logistic threshold=${tt.optimalThreshold.toFixed(2)} improves F1 from ${fmtPct(models.find((m) => m.name.includes("Logistic"))?.test.f1 ?? 0)} (at 0.50) to ${fmtPct(tt.optimalMetrics.f1)} on validation data.`;
  }

  return `# Model Evaluation Report

## Dataset Summary

| Field | Value |
|-------|-------|
| Path | ${meta.datasetPath} |
| Total rows | ${meta.totalRows} |
| Features | ${meta.featureCount} |
| Target | binary: mistake_or_worse vs not_mistake |
| not_mistake (class 0) | ${meta.classDistribution.notMistake} (${(100 - parseFloat(positiveRate)).toFixed(1)}%) |
| mistake_or_worse (class 1) | ${meta.classDistribution.mistakeOrWorse} (${positiveRate}%) |

## Split

| Field | Value |
|-------|-------|
| Strategy | ${meta.splitStrategy} |
| Train | ${meta.splitSizes.train} |
| Validation | ${meta.splitSizes.val} |
| Test | ${meta.splitSizes.test} |
${configSection}
## Model Performance (Test Set)

${comparisonHeader}
${comparisonRows}

**Best model by test F1: ${bestModel.name}** (F1=${fmtPct(bestModel.test.f1)})

## Detailed Results

${models.map(fmtModel).join("\n\n")}
${featureImportanceSection}${thresholdSection}${cvSection}
## Analysis

${analysisText}
`;
}
