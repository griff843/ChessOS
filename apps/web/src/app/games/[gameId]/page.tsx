import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { loadGameDiagnosis, loadAllGameDiagnoses } from "@/lib/artifacts";
import { loadGameContext } from "@/lib/game-context";
import { GameDiagnosisActions } from "@/components/diagnosis/game-diagnosis-actions";
import { CoachingReview } from "@/components/review/coaching-review";
import {
  generateRepairTargets,
  evaluateRepairEvidence,
  CATEGORY_TO_TARGET,
} from "@chess-os/training";
import type { DiagnosisHistoryEntry } from "@/lib/types";
import { FileCode2, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const ctx = await loadGameContext(gameId);

  if (!ctx.rowCount) {
    return (
      <>
        <PageHeader title="Game Review" subtitle={gameId} />
        <EmptyState
          icon={<FileCode2 className="h-10 w-10" />}
          title="Game not found"
          description="No analyzed data found for this game."
          action={
            <Link
              href="/import"
              className="text-xs text-accent hover:underline"
            >
              Import & Analyze
            </Link>
          }
        />
      </>
    );
  }

  const diagnosis = await loadGameDiagnosis(gameId);

  // Compute repair targets + evidence when diagnosis exists
  let recommendation = null;
  let evidence = null;
  if (diagnosis) {
    recommendation = generateRepairTargets(
      diagnosis as Parameters<typeof generateRepairTargets>[0]
    );

    if (recommendation.repairNeeded) {
      const allDiagnoses = await loadAllGameDiagnoses();
      const history: DiagnosisHistoryEntry[] = allDiagnoses
        .filter((d) => d.gameLost)
        .map((d) => ({
          gameId: d.gameId,
          primaryTarget:
            CATEGORY_TO_TARGET[
              d.primaryCategory as keyof typeof CATEGORY_TO_TARGET
            ],
          diagnosedAt: d.diagnosedAt,
        }));
      evidence = evaluateRepairEvidence(
        recommendation.primaryTarget,
        gameId,
        history
      );
    }
  }

  // Build context bar items
  const contextParts: string[] = [];
  if (ctx.white && ctx.black) {
    contextParts.push(`${ctx.white} vs ${ctx.black}`);
  }
  if (ctx.opening) {
    contextParts.push(ctx.opening);
  } else if (ctx.eco) {
    contextParts.push(ctx.eco);
  }

  const subtitle = contextParts.length > 0
    ? contextParts.join(" · ")
    : `${gameId} · ${ctx.rowCount} positions`;

  return (
    <>
      {/* Header with game context */}
      <div className="mb-6 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              Game Review
            </h1>
            {ctx.result && (
              <Badge
                variant={
                  ctx.result === "Won"
                    ? "success"
                    : ctx.result === "Lost"
                      ? "danger"
                      : ctx.result === "Draw"
                        ? "muted"
                        : "default"
                }
              >
                {ctx.result}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-text-secondary truncate">
            {subtitle}
          </p>
          {/* Secondary context line */}
          {(ctx.date || ctx.whiteElo || ctx.blackElo) && (
            <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
              {ctx.date && <span>{ctx.date}</span>}
              {ctx.whiteElo && ctx.blackElo && (
                <span>Elo {ctx.whiteElo} vs {ctx.blackElo}</span>
              )}
              {ctx.rowCount && <span>{ctx.rowCount} positions</span>}
            </div>
          )}
        </div>
        <Link
          href="/import"
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Import
        </Link>
      </div>

      {/* Main content */}
      {diagnosis && recommendation ? (
        <CoachingReview
          diagnosis={diagnosis}
          recommendation={recommendation}
          evidence={evidence}
          heroColor={ctx.heroColor}
        />
      ) : (
        <GameDiagnosisActions gameId={gameId} heroColor={ctx.heroColor} />
      )}
    </>
  );
}
