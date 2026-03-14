import type {
  ConceptCategory,
  ConceptGraph,
  ConceptNode,
  ConceptSourceTheme,
} from "./types";
import type { LessonCategory, ReasonCode } from "../exercises/types";
import type { OpeningMistakeTheme } from "../openings/types";

interface ConceptSeed {
  conceptKey: string;
  conceptName: string;
  conceptCategory: ConceptCategory;
  description: string;
  parentConcepts?: string[];
  childConcepts?: string[];
  relatedConcepts?: string[];
  prerequisiteConcepts?: string[];
  difficultyBand: ConceptNode["difficultyBand"];
  trainingTags: string[];
  sourceThemes?: ConceptSourceTheme[];
  sourceLessonCategories?: LessonCategory[];
  sourceReasonCodes?: ReasonCode[];
  sourceOpeningThemes?: OpeningMistakeTheme[];
  openingFamilies?: string[];
}

function seed(node: ConceptSeed): ConceptNode {
  return {
    conceptKey: node.conceptKey,
    conceptName: node.conceptName,
    conceptCategory: node.conceptCategory,
    description: node.description,
    parentConcepts: node.parentConcepts ?? [],
    childConcepts: node.childConcepts ?? [],
    relatedConcepts: node.relatedConcepts ?? [],
    prerequisiteConcepts: node.prerequisiteConcepts ?? [],
    difficultyBand: node.difficultyBand,
    trainingTags: node.trainingTags,
    sourceThemes: node.sourceThemes ?? [node.conceptKey as ConceptSourceTheme],
    sourceLessonCategories: node.sourceLessonCategories ?? [],
    sourceReasonCodes: node.sourceReasonCodes ?? [],
    sourceOpeningThemes: node.sourceOpeningThemes ?? [],
    openingFamilies: node.openingFamilies,
  };
}

const CONCEPTS: ConceptNode[] = [
  seed({
    conceptKey: "tactical_pattern_recognition",
    conceptName: "Tactical Pattern Recognition",
    conceptCategory: "meta",
    description: "Recognizes recurring tactical motifs quickly enough to convert them into candidate moves before calculation collapses.",
    childConcepts: ["tactical_awareness", "fork", "pin", "skewer", "deflection", "overload", "discovered_attack", "back_rank", "hanging_piece"],
    relatedConcepts: ["calculation_stability", "visualization_depth"],
    difficultyBand: "foundation",
    trainingTags: ["patterns", "recognition", "candidate-moves"],
    sourceThemes: ["tactical_pattern_recognition"],
    sourceLessonCategories: ["tactical_miss", "calculation_error", "material_loss"],
    sourceReasonCodes: ["high_eval_swing", "critical_position", "blunder", "long_calculation"],
    sourceOpeningThemes: ["early_tactical_concession", "repeated_opening_drift"],
  }),
  seed({
    conceptKey: "tactical_awareness",
    conceptName: "Tactical Awareness",
    conceptCategory: "tactical",
    description: "Maintains a live scan for direct threats, loose pieces, forcing moves, and tactical opportunities in unstable positions.",
    parentConcepts: ["tactical_pattern_recognition"],
    childConcepts: ["fork", "pin", "skewer", "discovered_attack", "overload", "deflection", "back_rank", "hanging_piece", "king_attack"],
    relatedConcepts: ["initiative", "piece_activity", "calculation_stability"],
    prerequisiteConcepts: ["tactical_pattern_recognition"],
    difficultyBand: "foundation",
    trainingTags: ["tactics", "calculation"],
    sourceLessonCategories: ["tactical_miss", "calculation_error", "critical_defense", "material_loss"],
    sourceReasonCodes: ["high_eval_swing", "critical_position", "blunder", "long_calculation"],
    sourceOpeningThemes: ["early_tactical_concession", "repeated_opening_drift"],
  }),
  seed({
    conceptKey: "hanging_piece",
    conceptName: "Hanging Piece",
    conceptCategory: "tactical",
    description: "Tracks loose or underdefended material so immediate tactical losses do not go unseen.",
    parentConcepts: ["tactical_awareness"],
    relatedConcepts: ["fork", "deflection", "piece_activity"],
    prerequisiteConcepts: ["tactical_pattern_recognition", "tactical_awareness"],
    difficultyBand: "foundation",
    trainingTags: ["material", "loose-pieces"],
    sourceThemes: ["hanging_piece"],
    sourceLessonCategories: ["material_loss"],
    sourceReasonCodes: ["blunder", "high_eval_swing"],
  }),
  seed({
    conceptKey: "fork",
    conceptName: "Fork",
    conceptCategory: "tactical",
    description: "Creates a double attack that overloads the opponent's ability to answer multiple threats at once.",
    parentConcepts: ["tactical_awareness"],
    relatedConcepts: ["skewer", "discovered_attack", "overload"],
    prerequisiteConcepts: ["tactical_pattern_recognition", "tactical_awareness"],
    difficultyBand: "foundation",
    trainingTags: ["double-attack"],
    sourceThemes: ["fork"],
    sourceLessonCategories: ["tactical_miss", "calculation_error"],
    sourceReasonCodes: ["high_eval_swing", "long_calculation"],
  }),
  seed({
    conceptKey: "pin",
    conceptName: "Pin",
    conceptCategory: "tactical",
    description: "Uses line pressure to restrict a defender because moving it would concede a more valuable target.",
    parentConcepts: ["tactical_awareness"],
    relatedConcepts: ["skewer", "back_rank", "piece_activity"],
    prerequisiteConcepts: ["tactical_pattern_recognition", "tactical_awareness", "visualization_depth"],
    difficultyBand: "foundation",
    trainingTags: ["constraint", "piece-pressure"],
    sourceThemes: ["pin"],
    sourceLessonCategories: ["tactical_miss", "critical_defense"],
    sourceReasonCodes: ["critical_position", "long_calculation"],
  }),
  seed({
    conceptKey: "skewer",
    conceptName: "Skewer",
    conceptCategory: "tactical",
    description: "Wins material by forcing a valuable target to move off a line and reveal a weaker target behind it.",
    parentConcepts: ["tactical_awareness"],
    relatedConcepts: ["pin", "fork", "visualization_depth"],
    prerequisiteConcepts: ["tactical_pattern_recognition", "tactical_awareness", "visualization_depth"],
    difficultyBand: "core",
    trainingTags: ["line-tactics"],
    sourceThemes: ["skewer"],
    sourceLessonCategories: ["tactical_miss", "calculation_error"],
    sourceReasonCodes: ["high_eval_swing", "long_calculation"],
  }),
  seed({
    conceptKey: "discovered_attack",
    conceptName: "Discovered Attack",
    conceptCategory: "tactical",
    description: "Coordinates one move to uncover a second threat, often combining tempo with latent force.",
    parentConcepts: ["tactical_awareness"],
    relatedConcepts: ["initiative", "deflection", "visualization_depth"],
    prerequisiteConcepts: ["tactical_pattern_recognition", "tactical_awareness", "calculation_stability"],
    difficultyBand: "core",
    trainingTags: ["line-opening", "tempo"],
    sourceThemes: ["discovered_attack"],
    sourceLessonCategories: ["calculation_error", "tactical_miss"],
    sourceReasonCodes: ["long_calculation", "high_eval_swing"],
  }),
  seed({
    conceptKey: "overload",
    conceptName: "Overload",
    conceptCategory: "tactical",
    description: "Punishes a piece or square that is responsible for too many defensive jobs at once.",
    parentConcepts: ["tactical_awareness"],
    relatedConcepts: ["deflection", "back_rank", "fork"],
    prerequisiteConcepts: ["tactical_pattern_recognition", "tactical_awareness", "calculation_stability"],
    difficultyBand: "advanced",
    trainingTags: ["defensive-collapse"],
    sourceThemes: ["overload"],
    sourceLessonCategories: ["calculation_error", "critical_defense"],
    sourceReasonCodes: ["critical_position", "long_calculation"],
  }),
  seed({
    conceptKey: "deflection",
    conceptName: "Deflection",
    conceptCategory: "tactical",
    description: "Removes a defender from its post so a second tactical idea becomes possible.",
    parentConcepts: ["tactical_awareness"],
    relatedConcepts: ["overload", "king_attack", "hanging_piece"],
    prerequisiteConcepts: ["tactical_pattern_recognition", "tactical_awareness", "calculation_stability"],
    difficultyBand: "core",
    trainingTags: ["remove-defender"],
    sourceThemes: ["deflection"],
    sourceLessonCategories: ["tactical_miss", "critical_defense"],
    sourceReasonCodes: ["critical_position", "high_eval_swing"],
  }),
  seed({
    conceptKey: "back_rank",
    conceptName: "Back Rank",
    conceptCategory: "tactical",
    description: "Exploits trapped king geometry and inflexible defensive structure around the back rank.",
    parentConcepts: ["tactical_awareness"],
    relatedConcepts: ["pin", "king_attack", "king_safety"],
    prerequisiteConcepts: ["tactical_pattern_recognition", "tactical_awareness", "king_safety"],
    difficultyBand: "foundation",
    trainingTags: ["mating-net", "king-safety"],
    sourceThemes: ["back_rank"],
    sourceLessonCategories: ["tactical_miss", "critical_defense"],
    sourceReasonCodes: ["critical_position", "high_eval_swing"],
  }),
  seed({
    conceptKey: "king_attack",
    conceptName: "King Attack",
    conceptCategory: "tactical",
    description: "Coordinates pieces and tempos around the king to create sustained direct threats.",
    parentConcepts: ["tactical_awareness"],
    relatedConcepts: ["initiative", "piece_activity", "back_rank", "king_safety"],
    prerequisiteConcepts: ["tactical_pattern_recognition", "initiative", "piece_activity", "king_safety"],
    difficultyBand: "advanced",
    trainingTags: ["attack", "coordination"],
    sourceThemes: ["king_attack"],
    sourceLessonCategories: ["tactical_miss", "critical_defense", "opening_inaccuracy"],
    sourceReasonCodes: ["critical_position", "high_eval_swing"],
    sourceOpeningThemes: ["king_safety_neglect", "early_tactical_concession"],
  }),
  seed({
    conceptKey: "endgame_conversion",
    conceptName: "Endgame Conversion",
    conceptCategory: "endgame",
    description: "Turns small technical advantages into full points without releasing control or allowing counterplay.",
    relatedConcepts: ["initiative", "pawn_structure", "piece_activity"],
    prerequisiteConcepts: ["piece_activity", "calculation_stability"],
    difficultyBand: "core",
    trainingTags: ["endgame", "technique"],
    sourceThemes: ["endgame_conversion"],
    sourceLessonCategories: ["endgame_technique"],
    sourceReasonCodes: ["endgame_mistake", "late_blunder"],
  }),
  seed({
    conceptKey: "opening_development",
    conceptName: "Opening Development",
    conceptCategory: "opening",
    description: "Brings pieces into active squares efficiently so the middlegame begins with coordination and safety.",
    relatedConcepts: ["king_safety", "center_control", "piece_activity"],
    difficultyBand: "foundation",
    trainingTags: ["opening", "development"],
    sourceThemes: ["opening_development"],
    sourceLessonCategories: ["opening_inaccuracy"],
    sourceReasonCodes: ["opening_error"],
    sourceOpeningThemes: ["poor_development", "theory_deviation", "premature_queen_activity", "repeated_opening_drift"],
    openingFamilies: ["italian_game", "ruy_lopez", "queens_gambit", "sicilian_defense", "french_defense", "caro_kann", "kings_indian", "english_opening"],
  }),
  seed({
    conceptKey: "center_control",
    conceptName: "Center Control",
    conceptCategory: "opening",
    description: "Claims or challenges central space so tactical and positional plans have enough room and energy.",
    relatedConcepts: ["opening_development", "initiative", "pawn_structure"],
    difficultyBand: "foundation",
    trainingTags: ["opening", "center"],
    sourceThemes: ["center_control"],
    sourceLessonCategories: ["opening_inaccuracy", "positional_error"],
    sourceReasonCodes: ["opening_error"],
    sourceOpeningThemes: ["center_control_loss", "theory_deviation", "repeated_opening_drift"],
    openingFamilies: ["sicilian_defense", "french_defense", "caro_kann", "queens_gambit"],
  }),
  seed({
    conceptKey: "king_safety",
    conceptName: "King Safety",
    conceptCategory: "opening",
    description: "Keeps the king sheltered and the surrounding structure resilient before complications accelerate.",
    relatedConcepts: ["opening_development", "back_rank", "king_attack"],
    prerequisiteConcepts: ["opening_development"],
    difficultyBand: "foundation",
    trainingTags: ["castling", "safety"],
    sourceThemes: ["king_safety"],
    sourceLessonCategories: ["opening_inaccuracy", "critical_defense"],
    sourceReasonCodes: ["opening_error", "critical_position"],
    sourceOpeningThemes: ["king_safety_neglect", "premature_queen_activity"],
    openingFamilies: ["italian_game", "ruy_lopez", "sicilian_defense", "kings_indian"],
  }),
  seed({
    conceptKey: "pawn_structure",
    conceptName: "Pawn Structure",
    conceptCategory: "positional",
    description: "Understands how pawn decisions shape weak squares, plans, space, and endgame prospects.",
    relatedConcepts: ["piece_activity", "center_control", "endgame_conversion"],
    difficultyBand: "core",
    trainingTags: ["structure", "planning"],
    sourceThemes: ["pawn_structure"],
    sourceLessonCategories: ["positional_error", "opening_inaccuracy", "endgame_technique"],
    sourceReasonCodes: ["opening_error", "endgame_mistake", "near_equality"],
    sourceOpeningThemes: ["structural_concession", "center_control_loss"],
  }),
  seed({
    conceptKey: "initiative",
    conceptName: "Initiative",
    conceptCategory: "positional",
    description: "Keeps the opponent reacting so plans gain tempo and tactical chances arrive on favorable terms.",
    relatedConcepts: ["piece_activity", "king_attack", "discovered_attack", "center_control"],
    prerequisiteConcepts: ["opening_development", "piece_activity"],
    difficultyBand: "core",
    trainingTags: ["tempo", "pressure"],
    sourceThemes: ["initiative"],
    sourceLessonCategories: ["positional_error", "calculation_error", "tactical_miss"],
    sourceReasonCodes: ["long_calculation", "near_equality", "high_risk_correct"],
    sourceOpeningThemes: ["early_tactical_concession", "repeated_opening_drift"],
  }),
  seed({
    conceptKey: "piece_activity",
    conceptName: "Piece Activity",
    conceptCategory: "positional",
    description: "Improves coordination, scope, and piece usefulness so tactics and endgames become easier to handle.",
    relatedConcepts: ["initiative", "opening_development", "endgame_conversion", "king_attack"],
    difficultyBand: "foundation",
    trainingTags: ["coordination", "improvement"],
    sourceThemes: ["piece_activity"],
    sourceLessonCategories: ["positional_error", "opening_inaccuracy", "endgame_technique"],
    sourceReasonCodes: ["opening_error", "near_equality", "endgame_mistake"],
    sourceOpeningThemes: ["poor_development", "structural_concession", "premature_queen_activity"],
  }),
  seed({
    conceptKey: "calculation_stability",
    conceptName: "Calculation Stability",
    conceptCategory: "meta",
    description: "Maintains disciplined move comparison through tactical branches without dropping key variations mid-stream.",
    relatedConcepts: ["tactical_pattern_recognition", "visualization_depth", "initiative"],
    prerequisiteConcepts: ["tactical_pattern_recognition"],
    difficultyBand: "core",
    trainingTags: ["calculation", "candidate-moves", "discipline"],
    sourceThemes: ["calculation_stability"],
    sourceLessonCategories: ["calculation_error", "critical_defense"],
    sourceReasonCodes: ["long_calculation", "critical_position", "high_eval_swing"],
  }),
  seed({
    conceptKey: "visualization_depth",
    conceptName: "Visualization Depth",
    conceptCategory: "meta",
    description: "Holds piece relationships accurately across future positions so tactical and endgame lines remain trustworthy.",
    relatedConcepts: ["calculation_stability", "skewer", "pin", "endgame_conversion"],
    prerequisiteConcepts: ["tactical_pattern_recognition"],
    difficultyBand: "advanced",
    trainingTags: ["visualization", "board-vision", "line-accuracy"],
    sourceThemes: ["visualization_depth"],
    sourceLessonCategories: ["calculation_error", "endgame_technique"],
    sourceReasonCodes: ["long_calculation", "late_blunder"],
  }),
];

function cloneConcept(concept: ConceptNode): ConceptNode {
  return {
    ...concept,
    parentConcepts: [...concept.parentConcepts],
    childConcepts: [...concept.childConcepts],
    relatedConcepts: [...concept.relatedConcepts],
    prerequisiteConcepts: [...concept.prerequisiteConcepts],
    trainingTags: [...concept.trainingTags],
    sourceThemes: [...concept.sourceThemes],
    sourceLessonCategories: [...concept.sourceLessonCategories],
    sourceReasonCodes: [...concept.sourceReasonCodes],
    sourceOpeningThemes: [...concept.sourceOpeningThemes],
    openingFamilies: concept.openingFamilies ? [...concept.openingFamilies] : undefined,
  };
}

export function buildConceptGraph(generatedAt: string = new Date().toISOString()): ConceptGraph {
  const concepts = CONCEPTS.map(cloneConcept);
  const conceptIndex = Object.fromEntries(concepts.map((concept) => [concept.conceptKey, concept]));
  const categories = ["tactical", "positional", "endgame", "opening", "meta"] as const;
  const categorySummaries = categories
    .map((category) => {
      const nodes = concepts.filter((concept) => concept.conceptCategory === category);
      return {
        category,
        conceptCount: nodes.length,
        concepts: nodes.map((node) => node.conceptKey),
      };
    })
    .filter((entry) => entry.conceptCount > 0);

  return {
    generatedAt,
    concepts,
    conceptIndex,
    categorySummaries,
  };
}

function keysFor(graph: ConceptGraph, field: "sourceLessonCategories" | "sourceReasonCodes" | "sourceOpeningThemes" | "sourceThemes", value: string): string[] {
  return graph.concepts
    .filter((concept) => {
      const list = concept[field] as string[];
      return list.includes(value);
    })
    .map((concept) => concept.conceptKey)
    .sort((a, b) => a.localeCompare(b));
}

export function mapLessonCategoryToConceptKeys(graph: ConceptGraph, category: LessonCategory): string[] {
  return keysFor(graph, "sourceLessonCategories", category);
}

export function mapReasonCodeToConceptKeys(graph: ConceptGraph, reasonCode: ReasonCode): string[] {
  return keysFor(graph, "sourceReasonCodes", reasonCode);
}

export function mapOpeningMistakeThemeToConceptKeys(graph: ConceptGraph, theme: OpeningMistakeTheme): string[] {
  return keysFor(graph, "sourceOpeningThemes", theme);
}

export function mapSourceThemeToConceptKeys(graph: ConceptGraph, theme: ConceptSourceTheme): string[] {
  return keysFor(graph, "sourceThemes", theme);
}


