/**
 * Logistic regression classifier with class weighting.
 *
 * Binary classification: predicts P(y=1|x) using sigmoid(w·x + b).
 * Trained via gradient descent with fixed learning rate.
 * Fully deterministic — weights initialized to 0, no randomness.
 *
 * Class weighting: each sample's gradient contribution is multiplied by
 * its class weight. This compensates for class imbalance by making the
 * minority class contribute more to the loss gradient.
 */
export interface LogisticRegressionParams {
  weights: number[];
  bias: number;
}

export interface ClassWeights {
  /** Weight for class 0 (not_mistake). */
  w0: number;
  /** Weight for class 1 (mistake_or_worse). */
  w1: number;
}

/**
 * Compute inverse-frequency class weights.
 *
 * Formula: w_class = total / (2 * count_class)
 *
 * For balanced data (50/50), both weights = 1.0.
 * For imbalanced data (e.g. 90% class 0, 10% class 1),
 * w0 ≈ 0.56 and w1 ≈ 5.0 — the minority class contributes ~9x more per sample.
 */
export function computeClassWeights(y: number[]): ClassWeights {
  const n = y.length;
  const nPos = y.filter((v) => v === 1).length;
  const nNeg = n - nPos;
  return {
    w0: nNeg > 0 ? n / (2 * nNeg) : 1,
    w1: nPos > 0 ? n / (2 * nPos) : 1,
  };
}

function sigmoid(z: number): number {
  if (z > 500) return 1;
  if (z < -500) return 0;
  return 1 / (1 + Math.exp(-z));
}

function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

export class LogisticRegression {
  weights: number[];
  bias: number;

  constructor(nFeatures: number) {
    this.weights = new Array(nFeatures).fill(0);
    this.bias = 0;
  }

  /** Predict P(y=1) for a single sample. */
  predictProba(x: number[]): number {
    return sigmoid(dot(this.weights, x) + this.bias);
  }

  /** Predict class label (threshold = 0.5). */
  predict(x: number[]): number {
    return this.predictProba(x) >= 0.5 ? 1 : 0;
  }

  /** Predict class labels for a batch. */
  predictBatch(X: number[][]): number[] {
    return X.map((x) => this.predict(x));
  }

  /**
   * Train via gradient descent with optional class weighting.
   *
   * When classWeights is provided, each sample's gradient contribution
   * is scaled by the weight for its true class. This effectively
   * upsamples the minority class without duplicating data.
   *
   * Returns training loss history (one value per epoch).
   */
  train(
    X: number[][],
    y: number[],
    epochs: number = 100,
    learningRate: number = 0.1,
    classWeights?: ClassWeights
  ): number[] {
    const n = X.length;
    const nFeatures = X[0].length;
    const lossHistory: number[] = [];

    for (let epoch = 0; epoch < epochs; epoch++) {
      const gradW = new Array(nFeatures).fill(0);
      let gradB = 0;
      let totalLoss = 0;

      for (let i = 0; i < n; i++) {
        const p = this.predictProba(X[i]);
        const error = p - y[i];

        // Sample weight: use class weight if provided, else 1.0
        const sampleWeight = classWeights
          ? y[i] === 1
            ? classWeights.w1
            : classWeights.w0
          : 1;

        for (let j = 0; j < nFeatures; j++) {
          gradW[j] += sampleWeight * error * X[i][j];
        }
        gradB += sampleWeight * error;

        // Binary cross-entropy (clamped for numerical stability)
        const pClamped = Math.max(1e-15, Math.min(1 - 1e-15, p));
        totalLoss +=
          -sampleWeight *
          (y[i] * Math.log(pClamped) + (1 - y[i]) * Math.log(1 - pClamped));
      }

      // Update weights
      for (let j = 0; j < nFeatures; j++) {
        this.weights[j] -= (learningRate / n) * gradW[j];
      }
      this.bias -= (learningRate / n) * gradB;

      lossHistory.push(totalLoss / n);
    }

    return lossHistory;
  }

  /** Export model parameters for persistence. */
  toParams(): LogisticRegressionParams {
    return {
      weights: [...this.weights],
      bias: this.bias,
    };
  }

  /** Load model parameters. */
  static fromParams(params: LogisticRegressionParams): LogisticRegression {
    const model = new LogisticRegression(params.weights.length);
    model.weights = [...params.weights];
    model.bias = params.bias;
    return model;
  }
}
