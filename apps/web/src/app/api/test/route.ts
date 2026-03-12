import { NextResponse } from "next/server";
import { generateNewSession, refreshInsights } from "@/app/actions/generation";
import {
  loadSessionData,
  submitMove,
  submitRecallAttempt,
  submitVisualizationAnswer,
  submitReconstructionMove,
  completeSession,
} from "@/app/study/actions";
import { checkReadiness, checkArtifactHealth, loadImportOverview } from "@/lib/artifacts";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { action, ...params } = body;

  try {
    switch (action) {
      case "generateNewSession":
        return NextResponse.json(await generateNewSession());

      case "refreshInsights":
        return NextResponse.json(await refreshInsights());

      case "runImportAnalysis": {
        const { runImportAnalysis } = await import("@/app/actions/import-analysis");
        return NextResponse.json(await runImportAnalysis());
      }

      case "generateImportSession": {
        const { generateImportSession } = await import("@/app/actions/import-session");
        return NextResponse.json(await generateImportSession(params.preset));
      }

      case "loadImportOverview":
        return NextResponse.json(await loadImportOverview());

      case "loadSessionData":
        return NextResponse.json(await loadSessionData(params.sessionId));

      case "submitMove":
        return NextResponse.json(
          await submitMove(params.sessionId, params.exerciseIndex, params.moveInput)
        );

      case "completeSession":
        return NextResponse.json(
          await completeSession(params.sessionId, params.rawAttempts, params.startedAt)
        );

      case "submitRecallAttempt":
        return NextResponse.json(
          await submitRecallAttempt(
            params.sessionId,
            params.exerciseId,
            params.originalFen,
            params.reconstructedPieces,
            params.timeTakenMs
          )
        );

      case "submitVisualizationAnswer":
        return NextResponse.json(
          await submitVisualizationAnswer(
            params.sessionId,
            params.exerciseId,
            params.answer,
            params.timeTakenMs,
            params.question
          )
        );

      case "submitReconstructionMove":
        return NextResponse.json(
          await submitReconstructionMove(
            params.sessionId,
            params.exerciseIndex,
            params.moveInput
          )
        );

      case "checkReadiness":
        return NextResponse.json(await checkReadiness());

      case "checkArtifactHealth":
        return NextResponse.json(await checkArtifactHealth());

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
