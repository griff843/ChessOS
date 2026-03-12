import { loadSessionData } from "../actions";
import { StudyPlayer } from "@/components/study/study-player";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StudyPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const { exercises, error } = await loadSessionData(sessionId);

  if (error || exercises.length === 0) {
    return (
      <>
        <PageHeader title="Study" subtitle={sessionId} />
        <EmptyState
          icon={<BookOpen className="h-10 w-10" />}
          title="Unable to load session"
          description={
            error ||
            "Session exercises could not be enriched. Make sure training-exercises.jsonl exists."
          }
          action={
            <Link href="/sessions" className="text-xs text-accent hover:underline">
              Back to sessions
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Study Session"
        subtitle={`${sessionId} · ${exercises.length} exercises`}
        action={
          <Link
            href="/sessions"
            className="text-xs text-text-secondary hover:text-text-primary"
          >
            ← All sessions
          </Link>
        }
      />
      <StudyPlayer sessionId={sessionId} exercises={exercises} />
    </>
  );
}
