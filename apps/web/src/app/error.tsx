"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <>
      <PageHeader title="Something went wrong" />
      <EmptyState
        icon={<AlertTriangle className="h-10 w-10" />}
        title="An unexpected error occurred"
        description={
          error.message ||
          "The page encountered an error. This might be caused by missing or malformed data."
        }
        action={
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >
              Go home
            </Link>
          </div>
        }
      />
    </>
  );
}
