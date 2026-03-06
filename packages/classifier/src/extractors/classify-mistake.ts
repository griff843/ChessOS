import type { MistakeSeverity, MotifTag } from "@chess-os/chess-core";

export interface ClassifiedMistake {
  severity: MistakeSeverity;
  motifTags: MotifTag[];
  isMissedWin: boolean;
  isDefensiveMiss: boolean;
}

export function classifyMistake(evalLossCp: number): ClassifiedMistake {
  const severity: MistakeSeverity =
    evalLossCp >= 300 ? "blunder" : evalLossCp >= 100 ? "mistake" : "inaccuracy";

  return {
    severity,
    motifTags: ["unknown"],
    isMissedWin: false,
    isDefensiveMiss: false
  };
}
