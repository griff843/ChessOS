import { cn } from "@/lib/utils";
import { formatCategory } from "@/lib/utils";
import { Badge, DifficultyBadge } from "@/components/ui/badge";
import type { ExerciseView } from "@/lib/study-types";

interface ExerciseInfoProps {
  exercise: ExerciseView;
  className?: string;
}

export function ExerciseInfo({ exercise, className }: ExerciseInfoProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Index / total */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Exercise {exercise.index + 1} of {exercise.total}
        </span>
        <DifficultyBadge
          difficulty={exercise.difficultyEstimate as "easy" | "medium" | "hard"}
        />
      </div>

      {/* Side to move */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-3.5 w-3.5 rounded-full border",
            exercise.sideToMove === "white"
              ? "border-border bg-white"
              : "border-border bg-gray-900"
          )}
        />
        <span className="text-sm font-medium text-text-primary">
          {exercise.sideToMove === "white" ? "White" : "Black"} to move
        </span>
      </div>

      {/* Category + phase */}
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="accent">{formatCategory(exercise.lessonCategory)}</Badge>
        <Badge variant="muted">{exercise.phase}</Badge>
      </div>

      {/* Source */}
      <div className="text-xs text-text-muted">
        From {exercise.gameId}, ply {exercise.ply}
      </div>

      {/* Played move (the mistake) */}
      <div className="rounded-lg bg-surface px-3 py-2">
        <p className="text-xs text-text-muted">In the game, this was played:</p>
        <p className="mt-0.5 font-mono text-sm text-danger">{exercise.playedMoveSan}</p>
        <p className="mt-1 text-xs text-text-muted">Find the better move.</p>
      </div>
    </div>
  );
}
