import { NextResponse } from "next/server";
import {
  loadRepertoireDrillSession,
  startRepertoireDrillSession,
  submitRepertoireDrillAttempt,
} from "@/app/repertoire/actions";

export async function POST(request: Request) {
  const body = await request.json();
  const { action, ...params } = body;

  try {
    switch (action) {
      case "startSession":
        return NextResponse.json(await startRepertoireDrillSession(params.preferredLineId));
      case "loadSession":
        return NextResponse.json(await loadRepertoireDrillSession(params.sessionId));
      case "submitAttempt":
        return NextResponse.json(
          await submitRepertoireDrillAttempt({
            sessionId: params.sessionId,
            userResponse: params.userResponse,
            confidence: params.confidence,
          })
        );
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
