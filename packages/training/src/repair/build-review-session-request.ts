/**
 * Builds a typed ReviewSessionRequest from coaching review outputs.
 *
 * Pure function (no I/O). Returns null when repair is not needed.
 */

import type {
  RepairTargetRecommendation,
  RepairEvidence,
  RepertoireBranchRepair,
  ReviewSessionRequest,
  ReviewWeightingStrength,
  EvidenceStatus,
} from "./types.js";

function deriveBoostStrength(
  status: EvidenceStatus | null
): ReviewWeightingStrength {
  if (status === null) return "moderate";
  switch (status) {
    case "recurring":
    case "persistent":
      return "strong";
    case "emerging":
      return "moderate";
    case "isolated":
      return "weak";
    case "improving":
      // System is already trending correctly — don't over-correct with forced targeting
      return "none";
  }
}

export interface BuildReviewSessionRequestArgs {
  sourceGameId: string;
  recommendation: RepairTargetRecommendation;
  evidence: RepairEvidence | null;
  branchRepair: RepertoireBranchRepair | null;
}

/**
 * Build the review session request from coaching review outputs.
 *
 * Returns null when:
 * - repair is not needed (game was not lost or no actionable target)
 */
export function buildReviewSessionRequest({
  sourceGameId,
  recommendation,
  evidence,
  branchRepair,
}: BuildReviewSessionRequestArgs): ReviewSessionRequest | null {
  if (!recommendation.repairNeeded) return null;

  const evidenceStatus = evidence?.status ?? null;
  const targetBoostStrength = deriveBoostStrength(evidenceStatus);
  const secondaryTargets = recommendation.secondaryTargets.map((s) => s.target);
  const branchRepairMatched = branchRepair?.matched ?? false;

  return {
    sourceGameId,
    primaryTarget: recommendation.primaryTarget,
    secondaryTargets,
    evidenceStatus,
    branchRepairMatched,
    targetBoostStrength,
  };
}
