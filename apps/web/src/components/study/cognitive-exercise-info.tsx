import { cn, formatCategory } from "@/lib/utils";
import { Badge, DifficultyBadge } from "@/components/ui/badge";
import { Brain, Eye, History, Target } from "lucide-react";
import type { ExerciseView } from "@/lib/study-types";

interface CognitiveExerciseInfoProps {
  exercise: ExerciseView;
  className?: string;
}

const typeConfig = {
  tactical: { icon: Target, label: "Find the Better Move", color: "text-accent" },
  recall: { icon: Eye, label: "Position Recall", color: "text-info" },
  visualization: { icon: Brain, label: "Visualization", color: "text-warning" },
  reconstruction: { icon: History, label: "Game Reconstruction", color: "text-success" },
};

export function CognitiveExerciseInfo({ exercise, className }: CognitiveExerciseInfoProps) {
  const config = typeConfig[exercise.exerciseType] ?? typeConfig.tactical;
  const Icon = config.icon;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Exercise {exercise.index + 1} of {exercise.total}
        </span>
        <DifficultyBadge difficulty={exercise.difficultyEstimate as "easy" | "medium" | "hard"} />
      </div>

      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", config.color)} />
        <span className={cn("text-sm font-semibold", config.color)}>{config.label}</span>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-3.5 w-3.5 rounded-full border",
            exercise.sideToMove === "white" ? "border-border bg-white" : "border-border bg-gray-900"
          )}
        />
        <span className="text-sm text-text-primary">
          {exercise.sideToMove === "white" ? "White" : "Black"} to move
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="accent">{formatCategory(exercise.lessonCategory)}</Badge>
        <Badge variant="muted">{exercise.phase}</Badge>
      </div>

      {exercise.exerciseType === "tactical" && exercise.playedMoveSan && (
        <div className="rounded-lg bg-surface px-3 py-2">
          <p className="text-xs text-text-muted">In the game, this was played:</p>
          <p className="mt-0.5 font-mono text-sm text-danger">{exercise.playedMoveSan}</p>
          <p className="mt-1 text-xs text-text-muted">Find the better move.</p>
        </div>
      )}

      {exercise.exerciseType === "recall" && (
        <div className="rounded-lg bg-surface px-3 py-2">
          <p className="text-xs text-text-muted">
            Memorize the position carefully, then reconstruct it from memory.
          </p>
        </div>
      )}

      {exercise.exerciseType === "visualization" && (
        <div className="rounded-lg bg-surface px-3 py-2">
          <p className="text-xs text-text-muted">
            Calculate the given moves mentally, then answer the question.
          </p>
        </div>
      )}

      {exercise.exerciseType === "reconstruction" && (
        <div className="rounded-lg bg-surface px-3 py-2">
          <p className="text-xs text-text-muted">What move did the master play in this position?</p>
        </div>
      )}

      {exercise.patternCategory && (
        <div className="rounded-lg bg-surface px-3 py-2">
          <p className="text-xs text-text-muted">Pattern category</p>
          <p className="mt-0.5 text-xs font-medium text-text-primary">
            {exercise.patternCategory.replace(/_/g, " ")}
          </p>
        </div>
      )}

      {exercise.rationale && (
        <div className="rounded-lg bg-surface px-3 py-2">
          <p className="text-xs text-text-muted">Selection rationale</p>
          <p className="mt-0.5 text-xs text-text-secondary">{exercise.rationale}</p>
        </div>
      )}
    </div>
  );
}
