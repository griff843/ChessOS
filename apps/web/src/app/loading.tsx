import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <>
      {/* Page header skeleton */}
      <div className="mb-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      {/* Metric cards row */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Content sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <Skeleton className="mb-4 h-4 w-32" />
          <Skeleton className="h-[200px] w-full" />
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <Skeleton className="mb-4 h-4 w-32" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    </>
  );
}
