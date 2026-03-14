"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateNewSession } from "@/app/actions/generation";
import { Play, Loader2 } from "lucide-react";

interface StartReviewSessionButtonProps {
  hasItems: boolean;
}

export function StartReviewSessionButton({
  hasItems,
}: StartReviewSessionButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await generateNewSession("hero");
      if (result.success && result.sessionId) {
        router.push(`/study/${result.sessionId}`);
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={!hasItems || pending}
      className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
      title={
        !hasItems
          ? "No review items available"
          : "Generate a session prioritizing overdue exercises"
      }
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Play className="h-4 w-4" />
      )}
      {pending ? "Generating..." : "Start Session"}
    </button>
  );
}
