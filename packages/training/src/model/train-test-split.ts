/**
 * Deterministic stratified train/validation/test split.
 *
 * Uses a seeded PRNG (mulberry32) for Fisher-Yates shuffle,
 * then splits each class independently to preserve class proportions.
 */
export interface DatasetSplit<T> {
  train: T[];
  val: T[];
  test: T[];
}

export interface SplitRatios {
  train: number;
  val: number;
  test: number;
}

export const DEFAULT_SPLIT_RATIOS: SplitRatios = {
  train: 0.8,
  val: 0.1,
  test: 0.1,
};

/** Default seed for reproducibility. */
export const DEFAULT_SEED = 42;

/**
 * mulberry32 — a simple 32-bit seeded PRNG.
 * Returns a function that yields [0, 1) on each call.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle (in-place) with a seeded PRNG.
 */
function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]; // copy to avoid mutating input
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Split an array sequentially by ratios.
 */
function splitByRatio<T>(rows: T[], ratios: SplitRatios): DatasetSplit<T> {
  const n = rows.length;
  const trainEnd = Math.floor(n * ratios.train);
  const valEnd = trainEnd + Math.floor(n * ratios.val);
  return {
    train: rows.slice(0, trainEnd),
    val: rows.slice(trainEnd, valEnd),
    test: rows.slice(valEnd),
  };
}

/**
 * Deterministic stratified split.
 *
 * 1. Partition rows by class using the getTarget function.
 * 2. Shuffle each partition with the same seed (independent streams).
 * 3. Split each partition by the given ratios.
 * 4. Merge the class-specific splits.
 *
 * This guarantees approximate class proportions in every split.
 */
export function stratifiedSplit<T>(
  rows: T[],
  getTarget: (row: T) => number,
  ratios: SplitRatios = DEFAULT_SPLIT_RATIOS,
  seed: number = DEFAULT_SEED
): DatasetSplit<T> {
  // Partition by class
  const class0: T[] = [];
  const class1: T[] = [];
  for (const row of rows) {
    if (getTarget(row) === 1) {
      class1.push(row);
    } else {
      class0.push(row);
    }
  }

  // Shuffle each class with its own seeded RNG stream
  const rng0 = mulberry32(seed);
  const rng1 = mulberry32(seed + 1);
  const shuffled0 = seededShuffle(class0, rng0);
  const shuffled1 = seededShuffle(class1, rng1);

  // Split each class by ratio
  const split0 = splitByRatio(shuffled0, ratios);
  const split1 = splitByRatio(shuffled1, ratios);

  // Merge
  return {
    train: [...split0.train, ...split1.train],
    val: [...split0.val, ...split1.val],
    test: [...split0.test, ...split1.test],
  };
}

/**
 * Simple (non-stratified) deterministic shuffled split.
 * Kept for backward compatibility / non-classification use cases.
 */
export function splitDataset<T>(
  rows: T[],
  ratios: SplitRatios = DEFAULT_SPLIT_RATIOS,
  seed: number = DEFAULT_SEED
): DatasetSplit<T> {
  const rng = mulberry32(seed);
  const shuffled = seededShuffle(rows, rng);
  return splitByRatio(shuffled, ratios);
}
