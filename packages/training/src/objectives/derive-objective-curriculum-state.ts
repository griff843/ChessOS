import type { CurriculumPlan } from "../curriculum/types";
import type { ObjectiveCurriculumState } from "./types";

export function deriveObjectiveCurriculumState(
  plan: CurriculumPlan | null | undefined
): ObjectiveCurriculumState {
  if (!plan) {
    return {
      activeTheme: "none",
      blockedGateCount: 0,
      overallReadiness: false,
      sessionCount: 0,
      expansionReserved: false,
    };
  }

  return {
    activeTheme: plan.themeAssignments[0]?.theme ?? "none",
    blockedGateCount: plan.progressionGates.gates.filter((gate) => !gate.allPassed).length,
    overallReadiness: plan.progressionGates.overallReadiness,
    sessionCount: plan.sessionCount,
    expansionReserved: plan.themeAssignments.some(
      (assignment) => assignment.theme === "difficulty_expansion"
    ),
  };
}
