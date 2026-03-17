import type { RepertoireDefinition, RepertoireMap } from "./types.js";

const COURSE_WHITE_E4 = "Attacking Repertoire for Club Players: 1.e4";
const COURSE_JOBAVA = "Lifetime Repertoires: Jobava London";
const COURSE_BLACK = "Attacking Repertoire for Club Players for Black";

const REPERTOIRES: RepertoireDefinition[] = [
  {
    repertoireKey: "white_scotch",
    repertoireName: "White Scotch / Scotch Gambit",
    repertoireSide: "white",
    sourceCourse: COURSE_WHITE_E4,
    sourceTags: ["white", "primary-identity", "open-game", "practical-pressure"],
    openingFamilies: ["scotch_game", "scotch_gambit"],
    conceptMappings: ["opening_development", "initiative", "calculation_stability", "piece_activity"],
    priorityWeight: 1,
    reviewPriority: 1,
    intendedPositions: [
      "Open positions after 1.e4 e5 with central break d4.",
      "Fast development and initiative after the Scotch or Scotch Gambit tabiya.",
    ],
    criticalJunctions: [
      { lineId: "scotch_main", ply: 5, move: "d4", note: "Primary central break that defines the Scotch identity." },
      { lineId: "scotch_gambit", ply: 7, move: "Bc4", note: "Critical gambit branch that trades material for initiative." },
    ],
    lineTree: [
      {
        lineId: "scotch_main",
        lineName: "Scotch Game Mainline",
        openingFamily: "scotch_game",
        canonicalMoves: ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Nxd4"],
        sourceCourse: COURSE_WHITE_E4,
        sourceTags: ["mainline", "central-break", "primary"],
        conceptMappings: ["opening_development", "center_control", "initiative", "calculation_stability"],
        priorityWeight: 1,
        reviewPriority: 1,
        intendedPositions: ["Open center with active minor pieces and immediate central tension."],
        criticalJunctions: [5, 7],
      },
      {
        lineId: "scotch_gambit",
        lineName: "Scotch Gambit",
        openingFamily: "scotch_gambit",
        canonicalMoves: ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Bc4"],
        sourceCourse: COURSE_WHITE_E4,
        sourceTags: ["gambit", "initiative", "anti-prep"],
        conceptMappings: ["initiative", "king_attack", "piece_activity", "calculation_stability"],
        priorityWeight: 0.95,
        reviewPriority: 0.95,
        intendedPositions: ["Rapid development and kingside initiative instead of immediate recapture."],
        criticalJunctions: [5, 7],
      },
    ],
  },
  {
    repertoireKey: "white_jobava",
    repertoireName: "White Jobava London",
    repertoireSide: "white",
    sourceCourse: COURSE_JOBAVA,
    sourceTags: ["white", "secondary-weapon", "anti-prep", "system"],
    openingFamilies: ["jobava_london"],
    conceptMappings: ["opening_development", "king_safety", "piece_activity", "initiative"],
    priorityWeight: 0.9,
    reviewPriority: 0.9,
    intendedPositions: [
      "Jobava setup with Nc3 and Bf4 against ...d5 structures.",
      "Practical attacking positions with fast development and flexible kingside plans.",
    ],
    criticalJunctions: [
      { lineId: "jobava_main", ply: 5, move: "Bf4", note: "Defines the Jobava structure and piece placement." },
      { lineId: "jobava_indian", ply: 5, move: "Bf4", note: "Keeps the system identity versus Indian setups." },
    ],
    lineTree: [
      {
        lineId: "jobava_main",
        lineName: "Jobava Main Setup",
        openingFamily: "jobava_london",
        canonicalMoves: ["d4", "d5", "Nc3", "Nf6", "Bf4"],
        sourceCourse: COURSE_JOBAVA,
        sourceTags: ["mainline", "system", "primary"],
        conceptMappings: ["opening_development", "piece_activity", "king_safety", "initiative"],
        priorityWeight: 0.9,
        reviewPriority: 0.9,
        intendedPositions: ["Knight on c3 and bishop on f4 with flexible e3/e4 plans."],
        criticalJunctions: [3, 5],
      },
      {
        lineId: "jobava_indian",
        lineName: "Jobava vs Indian Setup",
        openingFamily: "jobava_london",
        canonicalMoves: ["d4", "Nf6", "Nc3", "g6", "Bf4"],
        sourceCourse: COURSE_JOBAVA,
        sourceTags: ["system", "hypermodern-response"],
        conceptMappings: ["opening_development", "king_safety", "center_control", "initiative"],
        priorityWeight: 0.85,
        reviewPriority: 0.85,
        intendedPositions: ["Flexible Jobava setup against kingside fianchetto structures."],
        criticalJunctions: [3, 5],
      },
    ],
  },
  {
    repertoireKey: "black_attacking_repertoire",
    repertoireName: "Black Attacking Repertoire for Club Players",
    repertoireSide: "black",
    sourceCourse: COURSE_BLACK,
    sourceTags: ["black", "default", "attacking", "practical"],
    openingFamilies: ["ruy_lopez", "albin_countergambit", "reverse_sicilian", "jobava_london"],
    conceptMappings: ["initiative", "center_control", "opening_development", "piece_activity"],
    priorityWeight: 1,
    reviewPriority: 1,
    intendedPositions: [
      "Active black setups that seek initiative instead of passive equality.",
      "Practical, lower-maintenance repertoire with early counterplay.",
    ],
    criticalJunctions: [
      { lineId: "black_open_spanish", ply: 6, move: "a6", note: "Commits to the active Spanish structure." },
      { lineId: "black_albin_countergambit", ply: 4, move: "e5", note: "Defines the attacking countergambit choice." },
    ],
    lineTree: [
      {
        lineId: "black_open_spanish",
        lineName: "Open Spanish Setup",
        openingFamily: "ruy_lopez",
        canonicalMoves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"],
        sourceCourse: COURSE_BLACK,
        sourceTags: ["vs-e4", "spanish", "active"],
        conceptMappings: ["opening_development", "initiative", "piece_activity"],
        priorityWeight: 1,
        reviewPriority: 1,
        intendedPositions: ["Classical e5 structure with active queenside challenge."],
        criticalJunctions: [4, 6],
      },
      {
        lineId: "black_albin_countergambit",
        lineName: "Albin Countergambit",
        openingFamily: "albin_countergambit",
        canonicalMoves: ["d4", "d5", "c4", "e5"],
        sourceCourse: COURSE_BLACK,
        sourceTags: ["vs-d4", "countergambit", "initiative"],
        conceptMappings: ["initiative", "center_control", "calculation_stability"],
        priorityWeight: 0.95,
        reviewPriority: 0.95,
        intendedPositions: ["Immediate central counterplay versus Queen's Gambit structures."],
        criticalJunctions: [3, 4],
      },
      {
        lineId: "black_reverse_sicilian",
        lineName: "Reverse Sicilian",
        openingFamily: "reverse_sicilian",
        canonicalMoves: ["c4", "e5"],
        sourceCourse: COURSE_BLACK,
        sourceTags: ["vs-c4", "counterattack", "practical"],
        conceptMappings: ["center_control", "initiative", "piece_activity"],
        priorityWeight: 0.85,
        reviewPriority: 0.85,
        intendedPositions: ["Immediate central strike against the English."],
        criticalJunctions: [1, 2],
      },
      {
        lineId: "black_reversed_jobava",
        lineName: "Reversed Jobava Setup",
        openingFamily: "jobava_london",
        canonicalMoves: ["Nf3", "d5", "d4", "Nc6", "Bf4"],
        sourceCourse: COURSE_BLACK,
        sourceTags: ["vs-nf3", "practical", "setup"],
        conceptMappings: ["opening_development", "piece_activity", "center_control"],
        priorityWeight: 0.8,
        reviewPriority: 0.8,
        intendedPositions: ["Practical setup against flank-order games with early ...Nc6 activity."],
        criticalJunctions: [2, 4],
      },
    ],
  },
];

export function buildRepertoireMap(generatedAt: string): RepertoireMap {
  const lineIndex: RepertoireMap["lineIndex"] = {};

  for (const repertoire of REPERTOIRES) {
    for (const line of repertoire.lineTree) {
      lineIndex[line.lineId] = {
        repertoireKey: repertoire.repertoireKey,
        repertoireName: repertoire.repertoireName,
        repertoireSide: repertoire.repertoireSide,
        openingFamily: line.openingFamily,
        sourceCourse: line.sourceCourse,
        priorityWeight: line.priorityWeight,
        reviewPriority: line.reviewPriority,
        criticalDepth: Math.max(...line.criticalJunctions, 0),
      };
    }
  }

  return {
    generatedAt,
    repertoires: REPERTOIRES.map((repertoire) => ({
      ...repertoire,
      sourceTags: [...repertoire.sourceTags],
      openingFamilies: [...repertoire.openingFamilies],
      conceptMappings: [...repertoire.conceptMappings],
      intendedPositions: [...repertoire.intendedPositions],
      criticalJunctions: repertoire.criticalJunctions.map((junction) => ({ ...junction })),
      lineTree: repertoire.lineTree.map((line) => ({
        ...line,
        canonicalMoves: [...line.canonicalMoves],
        sourceTags: [...line.sourceTags],
        conceptMappings: [...line.conceptMappings],
        intendedPositions: [...line.intendedPositions],
        criticalJunctions: [...line.criticalJunctions],
      })),
    })),
    lineIndex,
  };
}
