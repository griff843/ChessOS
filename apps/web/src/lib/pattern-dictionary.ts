export type CoachingPatternKey =
  | "hanging_piece"
  | "fork"
  | "pin"
  | "skewer"
  | "discovered_attack"
  | "back_rank"
  | "deflection"
  | "overload"
  | "zwischenzug"
  | "endgame_conversion";

export interface PatternDictionaryEntry {
  name: string;
  description: string;
  coachingText: string;
  hintTemplates: [string, string];
}

export const PATTERN_DICTIONARY: Record<
  CoachingPatternKey,
  PatternDictionaryEntry
> = {
  hanging_piece: {
    name: "Hanging piece",
    description: "An undefended or under-defended piece can be won directly.",
    coachingText:
      "Loose pieces are tactical targets. Before moving, scan for pieces that can be taken without an adequate reply.",
    hintTemplates: [
      "Start by asking which enemy piece is least defended.",
      "Compare attackers and defenders before committing to {userMove}.",
    ],
  },
  fork: {
    name: "Knight fork",
    description: "One move attacks two valuable targets at the same time.",
    coachingText:
      "Double attacks often appear when a piece can jump into the center with tempo.",
    hintTemplates: [
      "Look for one move that attacks two targets at once.",
      "Check whether the best move creates a double attack on king, queen, rook, or loose piece.",
    ],
  },
  pin: {
    name: "Pin",
    description: "A piece cannot move because a more valuable piece behind it would be exposed.",
    coachingText:
      "Pinned pieces defend less than they seem. Treat them as overloaded or frozen when calculating.",
    hintTemplates: [
      "Notice which defender is tied to a more valuable piece.",
      "If that pinned piece cannot move, what target becomes vulnerable?",
    ],
  },
  skewer: {
    name: "Skewer",
    description: "A valuable piece is attacked first and a lesser piece behind it falls next.",
    coachingText:
      "Long-range pieces create skewers when the front piece is forced away from a weaker piece behind it.",
    hintTemplates: [
      "Check files, ranks, and diagonals for lined-up pieces.",
      "If the front piece moves, what gets exposed behind it?",
    ],
  },
  discovered_attack: {
    name: "Discovered attack",
    description: "Moving one piece reveals an attack from another piece behind it.",
    coachingText:
      "When pieces are aligned, the strongest move is often the one that uncovers a second threat.",
    hintTemplates: [
      "Ask whether moving one piece opens a line for another attacker.",
      "Find the move that creates a threat with the mover and the uncovered piece together.",
    ],
  },
  back_rank: {
    name: "Back-rank weakness",
    description: "A king with no escape squares becomes vulnerable to mating or tactical threats.",
    coachingText:
      "Back-rank motifs appear when heavy pieces can invade and the king has no luft.",
    hintTemplates: [
      "Check the king's escape squares before choosing a quiet move.",
      "If the back rank is boxed in, look for forcing rook or queen moves.",
    ],
  },
  deflection: {
    name: "Deflection",
    description: "A defender is lured away from an important square or piece.",
    coachingText:
      "Strong tactical sequences often start by removing the one defender holding the position together.",
    hintTemplates: [
      "Identify the key defender in the position.",
      "How can you force that defender away so the real target collapses?",
    ],
  },
  overload: {
    name: "Overload",
    description: "One defending piece has too many jobs and cannot handle them all.",
    coachingText:
      "When one piece guards several threats, increase the pressure until one duty must be abandoned.",
    hintTemplates: [
      "Find the defender covering more than one critical square.",
      "Can the best move create an additional threat that this defender cannot meet?",
    ],
  },
  zwischenzug: {
    name: "Zwischenzug",
    description: "An in-between move changes the tactical sequence before the expected recapture.",
    coachingText:
      "Do not rush to automatic recaptures. Check forcing intermediate moves first.",
    hintTemplates: [
      "Pause before the obvious recapture and look for a forcing move.",
      "Checks, captures, and direct threats may come before the routine reply.",
    ],
  },
  endgame_conversion: {
    name: "Endgame conversion",
    description: "A winning endgame still requires precise technique to convert.",
    coachingText:
      "In endgames, improve king activity, restrict counterplay, and convert extra material methodically.",
    hintTemplates: [
      "In winning endgames, ask how to improve the king or create a passed pawn.",
      "Prefer the move that limits counterplay before grabbing something immediate.",
    ],
  },
};

