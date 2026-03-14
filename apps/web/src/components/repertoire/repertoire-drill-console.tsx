"use client";

import { useEffect, useRef, useState } from "react";

type DrillSession = {
  drillSessionId: string;
  completedAt: string | null;
  currentIndex: number;
  exercises: Array<{
    lineId: string;
    lineName: string;
    repertoireName: string;
    presentedLine: string[];
    expectedContinuation: string[];
    nextRecommendedReviewAt: string | null;
  }>;
  results: Array<{
    recallGrade: string;
    correctness: boolean;
  }>;
};

async function callDrillApi(action: string, body: Record<string, unknown> = {}) {
  const response = await fetch("/api/repertoire-drills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  if (!response.ok) {
    throw new Error(`Repertoire drill request failed: ${response.status}`);
  }
  return response.json();
}

export function RepertoireDrillConsole({ preferredLineId }: { preferredLineId?: string | null }) {
  const [session, setSession] = useState<DrillSession | null>(null);
  const [answer, setAnswer] = useState("");
  const [confidence, setConfidence] = useState("0.7");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const autoStartedRef = useRef(false);

  const currentExercise = session ? session.exercises[session.currentIndex] ?? null : null;

  async function startSession(lineId?: string | null) {
    setLoading(true);
    setFeedback(null);
    try {
      const started = await callDrillApi("startSession", lineId ? { preferredLineId: lineId } : {});
      if (!started.success || !started.drillSessionId) {
        setFeedback(started.error ?? "Unable to start repertoire drill session.");
        return;
      }
      const loaded = await callDrillApi("loadSession", { sessionId: started.drillSessionId });
      setSession(loaded);
      setAnswer("");
      setFeedback(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!preferredLineId || session || loading || autoStartedRef.current) return;
    autoStartedRef.current = true;
    void startSession(preferredLineId);
  }, [preferredLineId, session, loading]);

  async function submitAttempt() {
    if (!session) return;
    setLoading(true);
    try {
      const result = await callDrillApi("submitAttempt", {
        sessionId: session.drillSessionId,
        userResponse: answer,
        confidence: Number(confidence),
      });
      const loaded = await callDrillApi("loadSession", { sessionId: session.drillSessionId });
      setSession(loaded);
      setAnswer("");
      setFeedback(
        result.success
          ? `Grade: ${result.grade}. ${result.nextRecommendedReviewAt ? `Next review ${result.nextRecommendedReviewAt}.` : ""}`
          : result.error ?? "Submission failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Repertoire Drill Session</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Practice your opening lines. The system selects lines based on recall urgency and forgetting risk.
            {preferredLineId ? " A repair-targeted line will be prioritized first." : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => startSession(preferredLineId)}
          disabled={loading}
          aria-label="Start a repertoire drill session"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Start Drill Session
        </button>
      </div>

      {currentExercise ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg bg-surface-elevated px-4 py-3">
            <p className="text-sm font-medium text-text-primary">{currentExercise.repertoireName} - {currentExercise.lineName}</p>
            <p className="mt-1 text-xs text-text-muted">Presented line: {currentExercise.presentedLine.join(" ")}</p>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-text-primary">Enter the continuation</span>
            <input
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary"
              placeholder="Example: exd4 Nxd4"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-text-primary">Confidence</span>
            <select
              value={confidence}
              onChange={(event) => setConfidence(event.target.value)}
              className="mt-2 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary"
            >
              <option value="0.3">Low</option>
              <option value="0.7">Medium</option>
              <option value="0.9">High</option>
            </select>
          </label>

          <button
            type="button"
            onClick={submitAttempt}
            disabled={loading || answer.trim().length === 0}
            className="rounded-lg border border-border bg-surface-elevated px-4 py-2 text-sm font-medium text-text-primary disabled:opacity-60"
          >
            Submit Recall Attempt
          </button>
        </div>
      ) : (
        <p className="mt-5 text-sm text-text-muted">No active repertoire drill session.</p>
      )}

      {session?.completedAt && (
        <p className="mt-4 text-sm text-success">Session complete.</p>
      )}

      {feedback && (
        <p className="mt-4 text-sm text-text-secondary">{feedback}</p>
      )}
    </div>
  );
}
