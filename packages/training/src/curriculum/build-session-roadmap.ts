/**
 * Build a per-session roadmap for a single curriculum session.
 *
 * Pure function: determines focus, difficulty mix, review/fresh quota
 * based on the assigned theme and current learner state. No I/O.
 */

import type { LearnerOverview, FocusRecommendation } from "../dashboard/types.js";
import type { MistakePatterns } from "../coach/types.js";
import type { ReviewQueue } from "../mastery/build-review-queue.js";
import type { LessonCategory } from "../exercises/types.js";
import type { TrendProfile } from "../trends/types.js";
import type { CurriculumTheme, SessionRoadmap } from "./types.js";
import { CURRICULUM_CONFIG } from "./types.js";

/**
 * Build a session roadmap for the given theme and learner state.
 */
export function buildSessionRoadmap(
  sessionIndex: number,
  theme: CurriculumTheme,
  overview: LearnerOverview,
  mistakePatterns: MistakePatterns,
  focusRecommendations: FocusRecommendation[],
  reviewQueue: ReviewQueue,
  trendProfile: TrendProfile,
  sessionSize: number = CURRICULUM_CONFIG.defaultSessionSize
): SessionRoadmap {
  // ── Difficulty Mix ──────────────────────────────────────────────

  const difficultyMix = { ...CURRICULUM_CONFIG.difficultyMixByTheme[theme] };

  // ── Focus Category ──────────────────────────────────────────────

  const fallbackCategory: LessonCategory = focusRecommendations.length > 0
    ? focusRecommendations[0].category
    : "calculation_error";

  let focusCategory: LessonCategory;

  switch (theme) {
    case "blunder_cleanup": {
      const worst = mistakePatterns.blunderProfile.worstCategories[0];
      focusCategory = (worst as LessonCategory) ?? fallbackCategory;
      break;
    }
    case "tactical_repair": {
      const tacticalCats = CURRICULUM_CONFIG.themeThresholds.tacticalRepairCategories;
      const worsening = tacticalCats.find((cat) => {
        const bucket = trendProfile.byCategory[cat];
        return bucket?.trendDirection === "worsening";
      });
      focusCategory = worsening ?? fallbackCategory;
      break;
    }
    case "instability_reduction": {
      // Category with highest unstable count from mistake patterns
      let maxUnstable = 0;
      let unstableCat: LessonCategory | null = null;
      for (const pattern of mistakePatterns.categoryPatterns) {
        if (pattern.unstableCount > maxUnstable) {
          maxUnstable = pattern.unstableCount;
          unstableCat = pattern.category;
        }
      }
      focusCategory = unstableCat ?? fallbackCategory;
      break;
    }
    case "consolidation": {
      const improving = overview.trendSummary.improvingCategories[0];
      focusCategory = (improving as LessonCategory) ?? fallbackCategory;
      break;
    }
    case "difficulty_expansion": {
      // Strongest category (highest accuracy)
      let bestAcc = -1;
      let bestCat: LessonCategory | null = null;
      for (const [cat, bucket] of Object.entries(trendProfile.byCategory)) {
        if (bucket.lifetimeAccuracy > bestAcc && bucket.lifetimeSeen >= 3) {
          bestAcc = bucket.lifetimeAccuracy;
          bestCat = cat as LessonCategory;
        }
      }
      focusCategory = bestCat ?? fallbackCategory;
      break;
    }
    default:
      focusCategory = fallbackCategory;
  }

  // ── Secondary Category ──────────────────────────────────────────

  let secondaryCategory: LessonCategory | null = null;
  if (focusRecommendations.length >= 2) {
    const candidate = focusRecommendations[1].category;
    if (candidate !== focusCategory) {
      secondaryCategory = candidate;
    } else if (focusRecommendations.length >= 3) {
      secondaryCategory = focusRecommendations[2].category;
    }
  }

  // ── Review / Fresh Quota ────────────────────────────────────────

  const { pressureThresholds, reviewSlotsByPressure } = CURRICULUM_CONFIG;
  const overdueCount = overview.reviewLoad.overdueCount;

  let pressureLevel: keyof typeof reviewSlotsByPressure;
  if (overdueCount >= pressureThresholds.high) {
    pressureLevel = "high";
  } else if (overdueCount >= pressureThresholds.normal) {
    pressureLevel = "normal";
  } else if (overdueCount >= pressureThresholds.low) {
    pressureLevel = "low";
  } else {
    pressureLevel = "none";
  }

  let reviewSlots: number = reviewSlotsByPressure[pressureLevel];

  // Theme modifier: +1 for review-heavy themes
  if (theme === "blunder_cleanup" || theme === "instability_reduction") {
    reviewSlots += 1;
  }

  // Cap: minimum 2 fresh slots
  reviewSlots = Math.min(reviewSlots, sessionSize - 2);
  reviewSlots = Math.max(reviewSlots, 0);

  const freshSlots = sessionSize - reviewSlots;

  const quotaReason = reviewSlots > 0
    ? `${overdueCount} overdue → ${pressureLevel} pressure → ${reviewSlots} review slots`
    : "No overdue exercises — full session of fresh material";

  const exerciseQuota = {
    reviewSlots,
    freshSlots,
    total: sessionSize,
    reason: quotaReason,
  };

  // ── Rationale ───────────────────────────────────────────────────

  const parts: string[] = [];
  parts.push(`Session ${sessionIndex + 1}: ${theme.replace(/_/g, " ")} theme.`);
  parts.push(`Primary focus: ${focusCategory}.`);
  if (secondaryCategory) {
    parts.push(`Secondary: ${secondaryCategory}.`);
  }
  parts.push(
    `Mix: ${difficultyMix.easy}E/${difficultyMix.medium}M/${difficultyMix.hard}H.`
  );
  if (reviewSlots > 0) {
    parts.push(`${reviewSlots} review + ${freshSlots} fresh exercises.`);
  }

  return {
    sessionIndex,
    theme,
    focusCategory,
    secondaryCategory,
    difficultyMix,
    exerciseQuota,
    rationale: parts.join(" "),
  };
}
