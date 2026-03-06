import type {
  ImportedGame,
  MistakeEvent,
  PositionSnapshot,
  TrainingItem
} from "@chess-os/chess-core";

export interface GameRecord extends ImportedGame {
  createdAt: string;
}

export interface PositionRecord extends PositionSnapshot {
  createdAt: string;
}

export interface MistakeRecord extends MistakeEvent {
  createdAt: string;
}

export interface TrainingItemRecord extends TrainingItem {
  createdAt: string;
  updatedAt: string;
}
