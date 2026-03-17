/**
 * Session checkpoint — persists in-progress study state to localStorage.
 *
 * Checkpoint is written after each exercise grading.
 * Checkpoint is restored on page reload if the session is still incomplete.
 * Checkpoint is cleared on successful session completion.
 */

const CHECKPOINT_PREFIX = "chess-os:checkpoint:";

export interface SessionCheckpoint {
  sessionId: string;
  startedAt: string;
  currentIndex: number;
  rawAttempts: Array<{
    exerciseId: string;
    exerciseIndex: number;
    fen: string;
    sideToMove: string;
    lessonCategory: string;
    difficultyEstimate: string;
    playedMoveSan: string;
    userMove: string;
    userMoveUci: string;
    engineMove: string;
    engineMoveUci: string;
    isCorrect: boolean;
    gradingTier: string;
    evalLossCp: number | null;
    timestamp: string;
  }>;
  savedAt: string;
}

function storageKey(sessionId: string): string {
  return `${CHECKPOINT_PREFIX}${sessionId}`;
}

export function saveCheckpoint(checkpoint: Omit<SessionCheckpoint, "savedAt">): void {
  try {
    const payload: SessionCheckpoint = {
      ...checkpoint,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey(checkpoint.sessionId), JSON.stringify(payload));
  } catch {
    // localStorage may be unavailable or full — fail silently
  }
}

export function loadCheckpoint(sessionId: string): SessionCheckpoint | null {
  try {
    const raw = localStorage.getItem(storageKey(sessionId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SessionCheckpoint;

    // Basic validation
    if (
      typeof parsed.sessionId !== "string" ||
      typeof parsed.startedAt !== "string" ||
      typeof parsed.currentIndex !== "number" ||
      !Array.isArray(parsed.rawAttempts) ||
      parsed.sessionId !== sessionId
    ) {
      clearCheckpoint(sessionId);
      return null;
    }

    // Reject checkpoints older than 7 days
    const age = Date.now() - new Date(parsed.savedAt).getTime();
    if (age > 7 * 24 * 60 * 60 * 1000) {
      clearCheckpoint(sessionId);
      return null;
    }

    return parsed;
  } catch {
    clearCheckpoint(sessionId);
    return null;
  }
}

export function clearCheckpoint(sessionId: string): void {
  try {
    localStorage.removeItem(storageKey(sessionId));
  } catch {
    // fail silently
  }
}
