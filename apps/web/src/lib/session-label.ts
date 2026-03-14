import type { StudySession } from "@chess-os/training";

const OBJECTIVE_LABELS: Record<string, string> = {
  candidate_move_generation: "Candidate Moves",
  tactical_pattern_recognition: "Tactical Patterns",
  calculation_stability: "Calculation",
  visualization_depth: "Visualization",
  defensive_resource_finding: "Defensive Resources",
  endgame_conversion: "Endgame Technique",
  attacking_coordination: "Attacking Play",
  practical_decision_quality: "Practical Decisions",
};

function dominantKey(dist: Record<string, number>): string | null {
  let best: string | null = null;
  let bestCount = 0;
  for (const [key, count] of Object.entries(dist)) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

function formatSnake(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Derive a human-readable label for a session from its metadata.
 *
 * Priority:
 * 1. Training objective (if set) — e.g. "Tactical Patterns"
 * 2. Exercise type mix (if non-tactical types present) — e.g. "Mixed Training"
 * 3. Dominant category — e.g. "Tactical Miss"
 * 4. Fallback — "Study Session"
 */
export function deriveSessionLabel(session: StudySession): string {
  const meta = session.metadata;

  // 1. Training objective
  const objective = meta.trainingObjective as string | undefined;
  if (objective && OBJECTIVE_LABELS[objective]) {
    return OBJECTIVE_LABELS[objective];
  }
  if (objective) {
    return formatSnake(objective);
  }

  // 2. Exercise type mix — detect cognitive/mixed sessions
  const typeMix = meta.exerciseTypeMix as Record<string, number> | undefined;
  if (typeMix) {
    const nonTactical = Object.entries(typeMix).filter(
      ([k, v]) => k !== "tactical" && v > 0
    );
    if (nonTactical.length > 0) {
      return "Mixed Training";
    }
  }

  // 3. Dominant category
  const dominant = dominantKey(meta.categoryDistribution);
  if (dominant) {
    return formatSnake(dominant);
  }

  // 4. Fallback
  return "Study Session";
}

/**
 * Build a full display string: "Label — Date"
 */
export function deriveSessionDisplayName(session: StudySession): string {
  const label = deriveSessionLabel(session);
  const date = formatShortDate(session.createdAt);
  return `${label} — ${date}`;
}
