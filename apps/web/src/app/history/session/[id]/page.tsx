import Link from "next/link";
import { loadSession, loadSessionResults } from "@/lib/artifacts";
import { buildCoachingInsight } from "@/lib/coaching-engine";
import { loadStudySession } from "@/lib/study-server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SessionReplay } from "@/components/history/session-replay";
import { BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HistorySessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, results, enriched] = await Promise.all([
    loadSession(id),
    loadSessionResults(id),
    loadStudySession(id),
  ]);

  if (!session || !results) {
    return (
      <>
        <PageHeader title="Session Replay" subtitle={id} />
        <EmptyState
          icon={<BookOpen className="h-10 w-10" />}
          title="Replay unavailable"
          description="This session has not been completed yet or its replay data is missing."
          action={
            <Link href="/history" className="text-xs text-accent hover:underline">
              Back to history
            </Link>
          }
        />
      </>
    );
  }

  const enrichedMap = new Map(
    enriched?.exercises.map((exercise) => [exercise.exerciseId, exercise]) ?? []
  );
  const sessionMap = new Map(
    session.exercises.map((exercise) => [exercise.exerciseId, exercise])
  );

  const attempts = results.results
    .map((result) => {
      const exercise = enrichedMap.get(result.exerciseId);
      const fallback = sessionMap.get(result.exerciseId);
      if (!exercise && !fallback) return null;

      const theme = exercise?.lessonCategory ?? fallback?.lessonCategory ?? "tactical_miss";
      const coaching = buildCoachingInsight({
        position: exercise?.fen ?? fallback?.fen ?? "",
        engineEvaluation: exercise?.evalBefore ?? null,
        bestMove: exercise?.bestMoveSan ?? fallback?.bestMoveSan ?? "-",
        userMove: result.userMoveSan ?? "(not recorded)",
        theme,
        reasonCodes: exercise?.reasonCodes,
      });

      return {
        exerciseId: result.exerciseId,
        fen: exercise?.fen ?? fallback?.fen ?? "",
        sideToMove: (exercise?.sideToMove ?? fallback?.sideToMove ?? "white") as "white" | "black",
        lessonCategory: theme,
        difficultyEstimate:
          exercise?.difficultyEstimate ?? fallback?.difficultyEstimate ?? "medium",
        userMove: result.userMoveSan ?? "(not recorded)",
        bestMove: exercise?.bestMoveSan ?? fallback?.bestMoveSan ?? "-",
        coachingExplanation: coaching.explanation,
        gradingTier: result.gradingTier ?? result.result,
      };
    })
    .filter((attempt): attempt is NonNullable<typeof attempt> => attempt !== null);

  return (
    <>
      <PageHeader
        title="Session Replay"
        subtitle={`${id} · ${attempts.length} recorded attempts`}
        action={
          <Link
            href="/history"
            className="text-xs text-text-secondary hover:text-text-primary"
          >
            Back to history
          </Link>
        }
      />
      <SessionReplay attempts={attempts} />
    </>
  );
}



