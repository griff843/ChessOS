import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-surface-elevated",
        className
      )}
    />
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-5",
        className
      )}
    >
      <Skeleton className="mb-3 h-3 w-20" />
      <Skeleton className="h-7 w-16" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}

export function SkeletonRow({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg bg-surface-elevated px-4 py-3",
        className
      )}
    >
      <Skeleton className="h-4 w-4 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="mt-1.5 h-3 w-20" />
      </div>
      <Skeleton className="h-1.5 w-24 rounded-full" />
      <Skeleton className="h-3.5 w-10" />
    </div>
  );
}
