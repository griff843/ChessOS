export default function GameDetailLoading() {
  return (
    <div className="animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="mb-4 flex items-center gap-1.5">
        <div className="h-3 w-12 rounded bg-surface-elevated" />
        <div className="h-3 w-2 rounded bg-surface-elevated" />
        <div className="h-3 w-20 rounded bg-surface-elevated" />
      </div>

      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-6 w-32 rounded bg-surface-elevated" />
        <div className="mt-2 h-4 w-64 rounded bg-surface-elevated" />
        <div className="mt-1 flex gap-3">
          <div className="h-3 w-20 rounded bg-surface-elevated" />
          <div className="h-3 w-24 rounded bg-surface-elevated" />
        </div>
      </div>

      {/* Coaching review skeleton */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="flex flex-col lg:flex-row">
          {/* Board placeholder */}
          <div className="flex items-center justify-center border-b border-border-subtle p-5 lg:border-b-0 lg:border-r">
            <div className="h-[340px] w-[340px] rounded bg-surface-elevated" />
          </div>
          {/* Narrative placeholder */}
          <div className="flex flex-1 flex-col gap-3 p-5">
            <div className="h-5 w-32 rounded bg-surface-elevated" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-surface-elevated" />
              <div className="h-4 w-5/6 rounded bg-surface-elevated" />
              <div className="h-4 w-4/6 rounded bg-surface-elevated" />
            </div>
            <div className="h-5 w-24 rounded bg-surface-elevated" />
            <div className="mt-4 h-10 w-44 rounded-lg bg-surface-elevated" />
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="border-t border-border-subtle px-5 py-3 flex gap-4">
          <div className="h-3 w-16 rounded bg-surface-elevated" />
          <div className="h-3 w-16 rounded bg-surface-elevated" />
          <div className="h-3 w-20 rounded bg-surface-elevated" />
          <div className="h-3 w-16 rounded bg-surface-elevated" />
        </div>
      </div>
    </div>
  );
}
