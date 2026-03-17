import type {
  SessionResults,
  SessionSnapshot,
  StudySession,
} from "./types";

export interface SessionHistoryRow {
  sessionId: string;
  completedAt: string;
  theme: string;
  accuracy: number;
  exerciseCount: number;
  correctCount: number;
  difficulty: string;
}

export interface ThemeAccuracyPoint {
  sessionId: string;
  completedAt: string;
  label: string;
  [theme: string]: string | number | null;
}

export interface ThemePerformanceSummary {
  theme: string;
  accuracy: number;
  attempts: number;
  firstAccuracy: number | null;
  latestAccuracy: number | null;
  delta: number | null;
}

export interface ProgressReport {
  summary: {
    sessionCount: number;
    totalExercises: number;
    averageAccuracy: number;
    latestAccuracy: number | null;
  };
  sessions: SessionHistoryRow[];
  sessionTrend: SessionSnapshot[];
  themeAccuracy: ThemePerformanceSummary[];
  themeTrend: {
    themes: string[];
    points: ThemeAccuracyPoint[];
  };
  topWeaknesses: ThemePerformanceSummary[];
  topImprovements: ThemePerformanceSummary[];
  recommendedNextTheme: string | null;
}

type ThemeSessionBucket = {
  total: number;
  correct: number;
};

function computeAccuracy(correct: number, total: number): number {
  return total > 0 ? correct / total : 0;
}

function dominantKey(record: Record<string, number>): string {
  const entries = Object.entries(record);
  if (entries.length === 0) return "mixed";
  return entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? "mixed";
}

export function buildProgressReport(input: {
  sessions: StudySession[];
  resultsMap: Map<string, SessionResults>;
}): ProgressReport {
  const completed = input.sessions
    .map((session) => ({
      session,
      results: input.resultsMap.get(session.sessionId) ?? null,
    }))
    .filter(
      (entry): entry is { session: StudySession; results: SessionResults } =>
        entry.results !== null
    )
    .sort(
      (a, b) =>
        new Date(a.results.completedAt).getTime() -
        new Date(b.results.completedAt).getTime()
    );

  const themeSeries = new Map<string, Array<{ accuracy: number; attempts: number }>>();
  const sessionRows: SessionHistoryRow[] = [];
  const sessionTrend: SessionSnapshot[] = [];

  completed.forEach(({ session, results }, index) => {
    const exerciseMap = new Map(
      session.exercises.map((exercise) => [exercise.exerciseId, exercise])
    );
    const correctCount =
      results.summary?.correctCount ??
      results.results.filter((result) => result.result === "correct").length;
    const totalExercises =
      results.summary?.totalExercises ?? results.results.length;
    const accuracy =
      results.summary?.accuracy ?? computeAccuracy(correctCount, totalExercises);

    const themeBuckets = new Map<string, ThemeSessionBucket>();
    for (const result of results.results) {
      const exercise = exerciseMap.get(result.exerciseId);
      const theme = exercise?.lessonCategory ?? "unknown";
      const bucket = themeBuckets.get(theme) ?? { total: 0, correct: 0 };
      bucket.total += 1;
      bucket.correct += result.result === "correct" ? 1 : 0;
      themeBuckets.set(theme, bucket);
    }

    themeBuckets.forEach((bucket, theme) => {
      const series = themeSeries.get(theme) ?? [];
      series.push({
        accuracy: computeAccuracy(bucket.correct, bucket.total),
        attempts: bucket.total,
      });
      themeSeries.set(theme, series);
    });

    sessionRows.push({
      sessionId: session.sessionId,
      completedAt: results.completedAt,
      theme: dominantKey(session.metadata.categoryDistribution),
      accuracy,
      exerciseCount: totalExercises,
      correctCount,
      difficulty: dominantKey(session.metadata.difficultyDistribution),
    });

    sessionTrend.push({
      sessionId: session.sessionId,
      completedAt: results.completedAt,
      accuracy,
      exerciseCount: totalExercises,
      correctCount,
    });
  });

  const themeAccuracy = [...themeSeries.entries()]
    .map(([theme, series]) => {
      const attempts = series.reduce((sum, point) => sum + point.attempts, 0);
      const weightedAccuracy =
        attempts > 0
          ? series.reduce(
              (sum, point) => sum + point.accuracy * point.attempts,
              0
            ) / attempts
          : 0;

      return {
        theme,
        accuracy: weightedAccuracy,
        attempts,
        firstAccuracy: series[0]?.accuracy ?? null,
        latestAccuracy: series.at(-1)?.accuracy ?? null,
        delta:
          series.length >= 2
            ? (series.at(-1)?.accuracy ?? 0) - (series[0]?.accuracy ?? 0)
            : null,
      } satisfies ThemePerformanceSummary;
    })
    .sort((a, b) => a.accuracy - b.accuracy);

  const chartThemes = [...themeAccuracy]
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 4)
    .map((entry) => entry.theme);

  const themeTrendPoints = completed.map(({ session, results }, index) => {
    const exerciseMap = new Map(
      session.exercises.map((exercise) => [exercise.exerciseId, exercise])
    );
    const themeBuckets = new Map<string, ThemeSessionBucket>();

    for (const result of results.results) {
      const exercise = exerciseMap.get(result.exerciseId);
      const theme = exercise?.lessonCategory ?? "unknown";
      const bucket = themeBuckets.get(theme) ?? { total: 0, correct: 0 };
      bucket.total += 1;
      bucket.correct += result.result === "correct" ? 1 : 0;
      themeBuckets.set(theme, bucket);
    }

    const point: ThemeAccuracyPoint = {
      sessionId: session.sessionId,
      completedAt: results.completedAt,
      label: `Session ${index + 1}`,
    };

    for (const theme of chartThemes) {
      const bucket = themeBuckets.get(theme);
      point[theme] = bucket ? Math.round(computeAccuracy(bucket.correct, bucket.total) * 100) : null;
    }

    return point;
  });

  const totalExercises = sessionRows.reduce(
    (sum, row) => sum + row.exerciseCount,
    0
  );
  const averageAccuracy =
    sessionRows.length > 0
      ? sessionRows.reduce((sum, row) => sum + row.accuracy, 0) /
        sessionRows.length
      : 0;

  return {
    summary: {
      sessionCount: sessionRows.length,
      totalExercises,
      averageAccuracy,
      latestAccuracy: sessionRows.at(-1)?.accuracy ?? null,
    },
    sessions: [...sessionRows].sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    ),
    sessionTrend,
    themeAccuracy,
    themeTrend: {
      themes: chartThemes,
      points: themeTrendPoints,
    },
    topWeaknesses: themeAccuracy.slice(0, 3),
    topImprovements: [...themeAccuracy]
      .filter((entry) => entry.delta !== null)
      .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
      .slice(0, 3),
    recommendedNextTheme: themeAccuracy[0]?.theme ?? null,
  };
}

