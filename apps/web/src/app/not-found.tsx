import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <PageHeader title="Page Not Found" />
      <EmptyState
        icon={<Search className="h-10 w-10" />}
        title="404 — Not found"
        description="The page you're looking for doesn't exist or has been moved."
        action={
          <Link
            href="/"
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            Back to Dashboard
          </Link>
        }
      />
    </>
  );
}
