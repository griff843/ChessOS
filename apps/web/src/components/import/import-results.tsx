"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Loader2, Sparkles, Swords, Trophy } from "lucide-react";
import { generateImportSession } from "@/app/actions/import-session";
import type { ImportGameResult, ImportResults, ImportSessionPreset } from "@/lib/import-types";

interface ImportResultsProps {
  results: ImportResults;
}

function numberFormat(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function ImportResultsPanel({ results }: ImportResultsProps) {
  const router = useRouter();
  const [expandedGame, setExpandedGame] = useState<string | null>(results.games[0]?.gameId ?? null);
  const [pendingPreset, setPendingPreset] = useState<ImportSessionPreset | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const topThemes = useMemo(() => results.topThemes.slice(0, 4), [results.topThemes]);

  const launchSession = (preset: ImportSessionPreset) => {
    setFeedback(null);
    setPendingPreset(preset);
    startTransition(async () => {
      const result = await generateImportSession(preset);
      setFeedback(result.message);
      setPendingPreset(null);
      if (result.success && result.redirectPath) {
        router.push(result.redirectPath);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">Import Results</h3>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-surface-elevated px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Games analyzed</p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">{numberFormat(results.summary.gamesAnalyzed)}</p>
          </div>
          <div className="rounded-xl bg-surface-elevated px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Positions analyzed</p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">{numberFormat(results.summary.positionsAnalyzed)}</p>
          </div>
          <div className="rounded-xl bg-surface-elevated px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Exercises generated</p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">{numberFormat(results.summary.exercisesGenerated)}</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-border-subtle bg-surface-elevated px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Trophy className="h-4 w-4 text-accent" />
            Top detected weaknesses
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {topThemes.map((theme) => (
              <span key={theme.key} className="rounded-full border border-accent/20 bg-accent/5 px-3 py-1.5 text-xs font-medium text-text-primary">
                {theme.label} <span className="text-text-muted">({theme.count})</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-text-primary">Game Breakdown</h3>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-border-subtle">
            <div className="grid grid-cols-[1.4fr_1.1fr_0.7fr_1fr] gap-3 bg-surface-elevated px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              <p>Game</p>
              <p>Opponent</p>
              <p>Mistakes</p>
              <p>Themes</p>
            </div>
            <div>
              {results.games.map((game) => {
                const expanded = expandedGame === game.gameId;
                return (
                  <div key={game.gameId} className="border-t border-border-subtle">
                    <button
                      type="button"
                      onClick={() => setExpandedGame(expanded ? null : game.gameId)}
                      className="grid w-full grid-cols-[1.4fr_1.1fr_0.7fr_1fr] gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-surface-elevated"
                    >
                      <div className="flex items-center gap-2 text-text-primary">
                        {expanded ? <ChevronDown className="h-4 w-4 text-text-muted" /> : <ChevronRight className="h-4 w-4 text-text-muted" />}
                        <span className="font-medium">{game.fileName}</span>
                      </div>
                      <p className="text-text-secondary">{game.opponent}</p>
                      <p className="text-text-primary">{game.mistakes}</p>
                      <p className="text-text-secondary">{game.themes.join(", ") || "No dominant themes"}</p>
                    </button>
                    {expanded && <ExpandedGameDetails game={game} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-text-primary">Generate Training Session</h3>
            <p className="mt-2 text-xs leading-relaxed text-text-muted">
              Launch a focused study block from your imported games without leaving the import flow.
            </p>
            <div className="mt-4 grid gap-3">
              {results.sessionOptions.map((option) => {
                const active = isPending && pendingPreset === option.preset;
                return (
                  <button
                    key={option.preset}
                    type="button"
                    onClick={() => launchSession(option.preset)}
                    disabled={isPending}
                    className="rounded-xl border border-border-subtle bg-surface-elevated px-4 py-3 text-left transition-colors hover:border-accent/30 hover:bg-surface-hover disabled:opacity-60"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-text-primary">{option.label}</span>
                      {active ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : null}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-text-muted">{option.description}</p>
                    <p className="mt-2 text-[11px] text-text-muted">Best for: {option.recommendedThemes.join(", ")}</p>
                  </button>
                );
              })}
            </div>
            {feedback && <p className="mt-3 text-xs leading-relaxed text-accent">{feedback}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpandedGameDetails({ game }: { game: ImportGameResult }) {
  if (game.details.length === 0) {
    return (
      <div className="px-4 pb-4 text-xs text-text-muted">No expandable details were produced for this game.</div>
    );
  }

  return (
    <div className="border-t border-border-subtle bg-surface-elevated/40 px-4 py-4">
      <div className="grid grid-cols-[0.6fr_0.8fr_0.9fr_1.2fr_0.8fr] gap-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        <p>Move</p>
        <p>Evaluation</p>
        <p>Theme</p>
        <p>Suggested training</p>
        <p>Difficulty</p>
      </div>
      <div className="mt-3 space-y-2">
        {game.details.map((detail) => (
          <div key={detail.positionId} className="grid grid-cols-[0.6fr_0.8fr_0.9fr_1.2fr_0.8fr] gap-3 rounded-xl bg-surface px-3 py-3 text-xs">
            <p className="font-medium text-text-primary">{detail.move} <span className="text-text-muted">(ply {detail.ply})</span></p>
            <p className="text-text-secondary">{detail.evaluationSwing} cp</p>
            <p className="text-text-primary">{detail.theme}</p>
            <p className="text-text-secondary">{detail.suggestedTraining}</p>
            <p className="text-text-secondary">{detail.difficulty}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
