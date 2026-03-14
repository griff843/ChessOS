"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Stethoscope } from "lucide-react";
import { generateGameDiagnosis } from "@/app/actions/generation";
import { SectionCard } from "@/components/ui/section-card";

export function GameDiagnosisActions({
  gameId,
  heroColor,
}: {
  gameId: string;
  heroColor?: "white" | "black" | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDiagnose = () => {
    setError(null);
    startTransition(async () => {
      const result = await generateGameDiagnosis(gameId, heroColor);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Failed to generate diagnosis");
      }
    });
  };

  return (
    <SectionCard
      title="Game Diagnosis"
      subtitle="Analyze this game to identify key decisions and patterns"
    >
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-text-muted">
          Run a diagnosis to identify the primary cause of the result, the first
          critical decision point, and any contributing factors.
        </p>
        <button
          type="button"
          onClick={handleDiagnose}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Stethoscope className="h-4 w-4" />
          )}
          Diagnose Game
        </button>
        {error && (
          <p className="text-xs text-danger">{error}</p>
        )}
      </div>
    </SectionCard>
  );
}
