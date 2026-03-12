/**
 * Decision Tree classifier (binary, shallow).
 *
 * Builds a binary classification tree using Gini impurity for split selection.
 * Deterministic — evaluates all features at all unique thresholds, no randomness.
 *
 * Constrained to a shallow depth (default max_depth=5) to avoid overfitting.
 * No external ML dependencies.
 */

/** Serializable tree node. */
export interface TreeNodeParams {
  type: "leaf" | "split";
  /** Leaf: predicted class (0 or 1). */
  prediction?: number;
  /** Leaf: class probabilities [P(0), P(1)]. */
  probabilities?: [number, number];
  /** Split: feature index to split on. */
  featureIndex?: number;
  /** Split: threshold value. Samples with feature <= threshold go left. */
  threshold?: number;
  /** Split: left subtree (feature <= threshold). */
  left?: TreeNodeParams;
  /** Split: right subtree (feature > threshold). */
  right?: TreeNodeParams;
}

export interface DecisionTreeParams {
  root: TreeNodeParams;
  maxDepth: number;
  featureCount: number;
}

/** Gini impurity for a set of binary labels. */
function gini(labels: number[]): number {
  if (labels.length === 0) return 0;
  const p1 = labels.filter((l) => l === 1).length / labels.length;
  const p0 = 1 - p1;
  return 1 - p0 * p0 - p1 * p1;
}

/** Majority class prediction from a label array. Ties go to class 0. */
function majorityClass(labels: number[]): number {
  const p1 = labels.filter((l) => l === 1).length;
  return p1 > labels.length - p1 ? 1 : 0;
}

/** Class probabilities [P(0), P(1)]. */
function classProbabilities(labels: number[]): [number, number] {
  if (labels.length === 0) return [0.5, 0.5];
  const p1 = labels.filter((l) => l === 1).length / labels.length;
  return [1 - p1, p1];
}

interface SplitCandidate {
  featureIndex: number;
  threshold: number;
  giniScore: number;
  leftIndices: number[];
  rightIndices: number[];
}

/**
 * Find the best binary split across all features and thresholds.
 * Uses weighted Gini impurity to score splits.
 */
function findBestSplit(
  X: number[][],
  y: number[],
  indices: number[]
): SplitCandidate | null {
  const nFeatures = X[0].length;
  let best: SplitCandidate | null = null;

  for (let f = 0; f < nFeatures; f++) {
    // Collect unique sorted values for this feature
    const values = new Set<number>();
    for (const i of indices) {
      values.add(X[i][f]);
    }
    const sorted = Array.from(values).sort((a, b) => a - b);

    // Evaluate midpoint thresholds between consecutive unique values
    for (let k = 0; k < sorted.length - 1; k++) {
      const threshold = (sorted[k] + sorted[k + 1]) / 2;

      const leftIdx: number[] = [];
      const rightIdx: number[] = [];
      for (const i of indices) {
        if (X[i][f] <= threshold) {
          leftIdx.push(i);
        } else {
          rightIdx.push(i);
        }
      }

      if (leftIdx.length === 0 || rightIdx.length === 0) continue;

      const leftLabels = leftIdx.map((i) => y[i]);
      const rightLabels = rightIdx.map((i) => y[i]);

      const weightedGini =
        (leftIdx.length * gini(leftLabels) +
          rightIdx.length * gini(rightLabels)) /
        indices.length;

      if (best === null || weightedGini < best.giniScore) {
        best = {
          featureIndex: f,
          threshold,
          giniScore: weightedGini,
          leftIndices: leftIdx,
          rightIndices: rightIdx,
        };
      }
    }
  }

  return best;
}

/**
 * Recursively build the tree.
 */
function buildNode(
  X: number[][],
  y: number[],
  indices: number[],
  depth: number,
  maxDepth: number,
  minSamplesLeaf: number
): TreeNodeParams {
  const labels = indices.map((i) => y[i]);

  // Pure node or max depth reached or too few samples
  const uniqueLabels = new Set(labels);
  if (
    uniqueLabels.size === 1 ||
    depth >= maxDepth ||
    indices.length < minSamplesLeaf * 2
  ) {
    return {
      type: "leaf",
      prediction: majorityClass(labels),
      probabilities: classProbabilities(labels),
    };
  }

  const split = findBestSplit(X, y, indices);
  if (split === null) {
    return {
      type: "leaf",
      prediction: majorityClass(labels),
      probabilities: classProbabilities(labels),
    };
  }

  // Check min leaf size after split
  if (
    split.leftIndices.length < minSamplesLeaf ||
    split.rightIndices.length < minSamplesLeaf
  ) {
    return {
      type: "leaf",
      prediction: majorityClass(labels),
      probabilities: classProbabilities(labels),
    };
  }

  return {
    type: "split",
    featureIndex: split.featureIndex,
    threshold: split.threshold,
    left: buildNode(
      X,
      y,
      split.leftIndices,
      depth + 1,
      maxDepth,
      minSamplesLeaf
    ),
    right: buildNode(
      X,
      y,
      split.rightIndices,
      depth + 1,
      maxDepth,
      minSamplesLeaf
    ),
  };
}

/** Predict a single sample by traversing the tree. */
function predictNode(node: TreeNodeParams, x: number[]): number {
  if (node.type === "leaf") {
    return node.prediction!;
  }
  if (x[node.featureIndex!] <= node.threshold!) {
    return predictNode(node.left!, x);
  }
  return predictNode(node.right!, x);
}

/** Return leaf probabilities [P(0), P(1)] for a single sample. */
function predictProbaNode(
  node: TreeNodeParams,
  x: number[]
): [number, number] {
  if (node.type === "leaf") {
    return node.probabilities ?? [0.5, 0.5];
  }
  if (x[node.featureIndex!] <= node.threshold!) {
    return predictProbaNode(node.left!, x);
  }
  return predictProbaNode(node.right!, x);
}

export const DEFAULT_MAX_DEPTH = 5;
export const DEFAULT_MIN_SAMPLES_LEAF = 3;

export class DecisionTree {
  private root: TreeNodeParams | null = null;
  private maxDepth: number;
  private minSamplesLeaf: number;
  private featureCount: number = 0;

  constructor(
    maxDepth: number = DEFAULT_MAX_DEPTH,
    minSamplesLeaf: number = DEFAULT_MIN_SAMPLES_LEAF
  ) {
    this.maxDepth = maxDepth;
    this.minSamplesLeaf = minSamplesLeaf;
  }

  /**
   * Train the decision tree.
   * Deterministic — same data always produces the same tree.
   */
  train(X: number[][], y: number[]): void {
    this.featureCount = X[0].length;
    const indices = Array.from({ length: X.length }, (_, i) => i);
    this.root = buildNode(
      X,
      y,
      indices,
      0,
      this.maxDepth,
      this.minSamplesLeaf
    );
  }

  /** Predict class label for a single sample. */
  predict(x: number[]): number {
    if (!this.root) throw new Error("Model not trained");
    return predictNode(this.root, x);
  }

  /** Predict class labels for a batch. */
  predictBatch(X: number[][]): number[] {
    return X.map((x) => this.predict(x));
  }

  /** Return leaf probabilities [P(0), P(1)] for a single sample. */
  predictProba(x: number[]): [number, number] {
    if (!this.root) throw new Error("Model not trained");
    return predictProbaNode(this.root, x);
  }

  /** Return leaf probabilities for a batch. */
  predictProbaBatch(X: number[][]): Array<[number, number]> {
    return X.map((x) => this.predictProba(x));
  }

  /** Export model parameters for persistence. */
  toParams(): DecisionTreeParams {
    if (!this.root) throw new Error("Model not trained");
    return {
      root: JSON.parse(JSON.stringify(this.root)),
      maxDepth: this.maxDepth,
      featureCount: this.featureCount,
    };
  }

  /** Load model from parameters. */
  static fromParams(params: DecisionTreeParams): DecisionTree {
    const tree = new DecisionTree(params.maxDepth);
    tree.root = params.root;
    tree.featureCount = params.featureCount;
    return tree;
  }
}
