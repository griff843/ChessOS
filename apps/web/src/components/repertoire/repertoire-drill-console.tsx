"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { formatDrillGrade } from "@/lib/repertoire-utils";

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

interface RepertoireDrillConsoleProps {
  preferredLineId?: string | null;
  /** Resolved server-side from queue data; null when lineId cannot be found. */
  preferredLineName?: string | null;
}

export function RepertoireDrillConsole({
  preferredLineId,
  preferredLineName,
}: RepertoireDrillConsoleProps) {
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
      if (result.success) {
        const gradeLabel = formatDrillGrade(result.grade ?? "");
        const nextReview = result.nextRecommendedReviewAt
          ? ` Next review: ${result.nextRecommendedReviewAt}.`
          : "";
        setFeedback(`${gradeLabel}.${nextReview}`);
      } else {
        setFeedback(result.error ?? "Submission failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Contextual line name: prefer the active exercise's name, fall back to server-resolved name
  const targetLineName = currentExercise?.lineName ?? preferredLineName;
  const isTargeted = Boolean(preferredLineId);

  // Session complete summary
  const correctCount = session?.results.filter((r) => r.correctness).length ?? 0;
  const totalCount = session?.results.length ?? 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-text-primary">Repertoire Drill</h2>
          {isTargeted && targetLineName ? (
            <p className="mt-1 text-sm text-accent">
              Targeting: <span className="font-medium">{targetLineName}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-text-secondary">
              Practice your opening lines based on recall urgency and forgetting risk.
            </p>
          )}
        </div>

        {/* Start button — replaced with loading indicator during auto-start */}
        {loading && !session ? (
          <div className="flex shrink-0 items-center gap-2 text-sm text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
              {isTargeted && targetLineName
                ? `Preparing ${targetLineName}\u2026`
                : "Starting drill\u2026"}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => startSession(preferredLineId)}
            disabled={loading}
            aria-label="Start a repertoire drill session"
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {session ? "New Session" : "Start Drill"}
          </button>
        )}
      </div>

      {/* Active exercise */}
      {currentExercise ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg bg-surface-elevated px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
              {currentExercise.repertoireName}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-text-primary">
              {currentExercise.lineName}
            </p>
            <p className="mt-2 text-xs text-text-muted">Position to continue from:</p>
            <p className="mt-0.5 font-mono text-xs text-text-primary">
              {currentExercise.presentedLine.join(" ")}
            </p>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-text-primary">Enter the continuation</span>
            <input
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && answer.trim()) void submitAttempt();
              }}
              className="mt-2 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
              placeholder="e.g. Nxd4 Kb8 — enter the next moves"
            />
          </label>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">Confidence</span>
              <select
                value={confidence}
                onChange={(event) => setConfidence(event.target.value)}
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary"
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
              {loading ? "Submitting\u2026" : "Submit"}
            </button>
          </div>
        </div>
      ) : !session ? (
        /* Idle — no active session */
        <p className="mt-5 text-sm text-text-muted">
          {isTargeted && targetLineName
            ? `Ready to drill ${targetLineName}. Click Start Drill to begin.`
            : "Select a line from the repair or drill queue below, or click Start Drill to practice your most urgent lines."}
        </p>
      ) : null}

      {/* Session complete */}
      {session?.completedAt && (
        <p className="mt-4 text-sm text-success">
          Session complete — {correctCount}/{totalCount} lines recalled.{" "}
          {correctCount < totalCount
            ? "Keep drilling to reinforce the missed lines."
            : "Excellent work!"}
        </p>
      )}

      {/* Last attempt feedback */}
      {feedback && (
        <p className="mt-3 text-sm text-text-secondary">{feedback}</p>
      )}
    </div>
  );
}
