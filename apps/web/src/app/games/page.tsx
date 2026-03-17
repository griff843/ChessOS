import Link from "next/link";
import { loadAllGamesSummary } from "@/lib/game-context";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Swords, CheckCircle, Circle, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GamesPage() {
  const allGames = await loadAllGamesSummary();
  // Filter out legacy demo games that have no real metadata
  const games = allGames.filter((g) => {
    if (g.gameId === "demo-game-001") return false;
    // Also filter games where all metadata is missing (no players, no opening, no date)
    const hasMetadata = g.white || g.black || g.opening || g.eco || g.date;
    const isLegacyPlaceholder = !hasMetadata && g.gameId.startsWith("demo-");
    return !isLegacyPlaceholder;
  });

  if (games.length === 0) {
    return (
      <>
        <PageHeader
          title="Games"
          subtitle="Analyzed game library"
        />
        <EmptyState
          icon={<Swords className="h-10 w-10" />}
          title="No games analyzed yet"
          description="Import and analyze PGN files to build your game library."
          action={
            <Link
              href="/import"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              Import & Analyze
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Games"
        subtitle={`${games.length} analyzed game${games.length === 1 ? "" : "s"}${allGames.length > games.length ? ` (${allGames.length - games.length} hidden)` : ""}`}
        action={
          <Link
            href="/import"
            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            Import more
          </Link>
        }
      />

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[2fr_1.2fr_0.8fr_0.7fr_1fr] gap-4 border-b border-border-subtle bg-surface-elevated px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          <span>Game</span>
          <span>Opening</span>
          <span>Result</span>
          <span>Date</span>
          <span>Review</span>
        </div>

        {/* Game rows */}
        <div>
          {games.map((game, i) => {
            const title =
              game.white && game.black
                ? `${game.white} vs ${game.black}`
                : game.gameId;
            const opening = game.opening ?? game.eco ?? null;

            return (
              <Link
                key={game.gameId}
                href={`/games/${game.gameId}`}
                className={`grid grid-cols-[2fr_1.2fr_0.8fr_0.7fr_1fr] gap-4 items-center px-5 py-3.5 text-sm transition-colors hover:bg-surface-hover ${
                  i > 0 ? "border-t border-border-subtle" : ""
                }`}
              >
                {/* Game name */}
                <span className="font-medium text-text-primary truncate">
                  {title}
                </span>

                {/* Opening */}
                <span className="text-text-secondary text-xs truncate">
                  {opening ?? <span className="text-text-muted">--</span>}
                </span>

                {/* Result */}
                <span>
                  {game.result ? (
                    <Badge
                      variant={
                        game.result === "Won"
                          ? "success"
                          : game.result === "Lost"
                            ? "danger"
                            : game.result === "Draw"
                              ? "muted"
                              : "default"
                      }
                    >
                      {game.result}
                    </Badge>
                  ) : (
                    <span className="text-xs text-text-muted">--</span>
                  )}
                </span>

                {/* Date */}
                <span className="text-xs text-text-muted whitespace-nowrap">
                  {game.date ?? "--"}
                </span>

                {/* Diagnosis status */}
                <span className="flex items-center gap-1.5">
                  {game.hasDiagnosis ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 text-success" />
                      <span className="text-xs text-text-secondary">Reviewed</span>
                    </>
                  ) : (
                    <>
                      <Circle className="h-3.5 w-3.5 text-text-muted" />
                      <span className="text-xs text-text-muted">Not reviewed</span>
                    </>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
