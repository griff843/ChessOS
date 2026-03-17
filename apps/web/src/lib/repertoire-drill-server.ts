import { appendFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { atomicWriteFile } from "@chess-os/db";
import {
  buildRepertoireDrillSession,
  gradeRepertoireDrillAttempt,
  type RepertoireDrillEvent,
  type RepertoireDrillQueueReport,
  type RepertoireMap,
  type RepertoireDrillSession,
  type RepertoireDrillSessionSummary,
} from "@chess-os/training";
import { OUT } from "./generation-server";
import { loadRepertoireDrillQueue, loadRepertoireMap, loadRepertoireRepairQueue } from "./artifacts";
import { loadRepertoireDrillSessionsRaw } from "./generation-server";

const DRILL_SESSIONS_DIR = join(OUT, "repertoire", "drill-sessions");

function buildSummary(session: RepertoireDrillSession): RepertoireDrillSessionSummary {
  const exactCount = session.results.filter((entry) => entry.recallGrade === "exact_recall").length;
  const acceptableCount = session.results.filter((entry) => entry.recallGrade === "acceptable_recall").length;
  const partialCount = session.results.filter((entry) => entry.recallGrade === "partial_recall").length;
  const failedCount = session.results.filter((entry) => entry.recallGrade === "failed_recall").length;

  return {
    drillSessionId: session.drillSessionId,
    generatedAt: session.generatedAt,
    completedAt: session.completedAt,
    sessionSize: session.sessionSize,
    completedCount: session.results.length,
    exactCount,
    acceptableCount,
    partialCount,
    failedCount,
  };
}

async function writeSessionArtifacts(session: RepertoireDrillSession): Promise<void> {
  await mkdir(DRILL_SESSIONS_DIR, { recursive: true });
  await atomicWriteFile(
    join(DRILL_SESSIONS_DIR, `${session.drillSessionId}.json`),
    JSON.stringify(session, null, 2)
  );

  const existing = await loadRepertoireDrillSessionsRaw();
  const next = [...existing.filter((entry) => entry.drillSessionId !== session.drillSessionId), buildSummary(session)]
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  await atomicWriteFile(
    join(OUT, "repertoire", "repertoire-drill-sessions.json"),
    JSON.stringify(next, null, 2)
  );
}

export async function startRepertoireDrillSession(preferredLineId?: string): Promise<{
  success: boolean;
  drillSessionId: string | null;
  exerciseCount: number;
  error: string | null;
}> {
  const [queue, repertoireMap, repairQueue] = await Promise.all([
    loadRepertoireDrillQueue(),
    loadRepertoireMap(),
    loadRepertoireRepairQueue(),
  ]);

  if (!queue || !repertoireMap) {
    return {
      success: false,
      drillSessionId: null,
      exerciseCount: 0,
      error: "Repertoire drill artifacts are not ready. Refresh insights first.",
    };
  }

  const prioritizedEntries = (() => {
    const repairPreferred = repairQueue?.entries.map((entry) => entry.lineId) ?? [];
    const boosted = preferredLineId ? [preferredLineId, ...repairPreferred] : repairPreferred;
    if (boosted.length === 0) return queue.entries;
    const boostedSet = new Set(boosted);
    const preferred = boosted
      .map((lineId) => queue.entries.find((entry) => entry.lineId === lineId))
      .filter((entry): entry is RepertoireDrillQueueReport["entries"][number] => Boolean(entry));
    const remainder = queue.entries.filter((entry) => !boostedSet.has(entry.lineId));
    return [...preferred, ...remainder];
  })();

  const session = buildRepertoireDrillSession({
    generatedAt: new Date().toISOString(),
    queue: { ...queue, entries: prioritizedEntries } as unknown as RepertoireDrillQueueReport,
    repertoireMap: repertoireMap as unknown as RepertoireMap,
    sessionSize: 5,
  });

  await writeSessionArtifacts(session);

  return {
    success: true,
    drillSessionId: session.drillSessionId,
    exerciseCount: session.sessionSize,
    error: null,
  };
}

export async function loadRepertoireDrillSession(sessionId: string): Promise<RepertoireDrillSession | null> {
  try {
    const raw = await readFile(join(DRILL_SESSIONS_DIR, `${sessionId}.json`), "utf-8");
    return JSON.parse(raw) as RepertoireDrillSession;
  } catch {
    return null;
  }
}

export async function submitRepertoireDrillAttempt(args: {
  sessionId: string;
  userResponse: string;
  confidence: number;
}): Promise<{
  success: boolean;
  completed: boolean;
  grade: RepertoireDrillEvent["recallGrade"] | null;
  correctness: boolean | null;
  nextRecommendedReviewAt: string | null;
  error: string | null;
}> {
  const session = await loadRepertoireDrillSession(args.sessionId);
  if (!session) {
    return {
      success: false,
      completed: false,
      grade: null,
      correctness: null,
      nextRecommendedReviewAt: null,
      error: "Drill session not found.",
    };
  }

  const exercise = session.exercises[session.currentIndex];
  if (!exercise) {
    return {
      success: false,
      completed: Boolean(session.completedAt),
      grade: null,
      correctness: null,
      nextRecommendedReviewAt: null,
      error: "No remaining drill exercises in this session.",
    };
  }

  const reviewedAt = new Date().toISOString();
  const graded = gradeRepertoireDrillAttempt({
    exercise,
    userResponse: args.userResponse,
    confidence: args.confidence,
    reviewedAt,
  });
  graded.drillSessionId = session.drillSessionId;

  session.results.push(graded);
  session.currentIndex += 1;
  if (session.currentIndex >= session.exercises.length) {
    session.completedAt = reviewedAt;
  }

  await writeSessionArtifacts(session);
  await appendFile(
    join(OUT, "repertoire", "repertoire-drill-events.jsonl"),
    JSON.stringify(graded) + "\n"
  );

  return {
    success: true,
    completed: Boolean(session.completedAt),
    grade: graded.recallGrade,
    correctness: graded.correctness,
    nextRecommendedReviewAt: graded.nextRecommendedReviewAt,
    error: null,
  };
}
