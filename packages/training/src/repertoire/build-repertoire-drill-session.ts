import type { RepertoireDrillQueueReport, RepertoireDrillSession, RepertoireMap } from "./types.js";

function buildDrillSessionId(entries: string[], generatedAt: string): string {
  const seed = `${generatedAt}:${entries.join("|")}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `repertoire-drill-${hash.toString(16)}`;
}

export function buildRepertoireDrillSession(args: {
  generatedAt: string;
  queue: RepertoireDrillQueueReport;
  repertoireMap: RepertoireMap;
  sessionSize?: number;
}): RepertoireDrillSession {
  const lineLookup = new Map(
    args.repertoireMap.repertoires.flatMap((repertoire) =>
      repertoire.lineTree.map((line) => [line.lineId, { repertoire, line }] as const)
    )
  );

  const exercises = args.queue.entries.slice(0, args.sessionSize ?? 5).flatMap((entry) => {
    const resolved = lineLookup.get(entry.lineId);
    if (!resolved) return [];

    const presentedLength = Math.max(2, resolved.line.canonicalMoves.length - 2);
    const presentedLine = resolved.line.canonicalMoves.slice(0, presentedLength);
    const expectedContinuation = resolved.line.canonicalMoves.slice(presentedLength);

    return [{
      lineId: resolved.line.lineId,
      lineKey: `${resolved.repertoire.repertoireKey}:${resolved.line.lineId}`,
      repertoireKey: resolved.repertoire.repertoireKey,
      repertoireName: resolved.repertoire.repertoireName,
      lineName: resolved.line.lineName,
      sourceOpeningFamily: resolved.line.openingFamily,
      presentedLine,
      expectedContinuation,
      conceptLinkedWeaknesses: [...entry.conceptLinkedWeaknesses],
      nextRecommendedReviewAt: entry.nextRecommendedReviewAt,
    }];
  });

  const drillSessionId = buildDrillSessionId(exercises.map((entry) => entry.lineKey), args.generatedAt);

  return {
    drillSessionId,
    generatedAt: args.generatedAt,
    completedAt: null,
    sessionSize: exercises.length,
    currentIndex: 0,
    exercises,
    results: [],
  };
}
