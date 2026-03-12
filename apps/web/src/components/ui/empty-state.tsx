import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-8 py-16 text-center",
        className
      )}
    >
      {icon && <div className="mb-4 text-text-muted">{icon}</div>}
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-text-secondary">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function InlineEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-surface-elevated px-4 py-8 text-center">
      <p className="text-xs text-text-muted">{message}</p>
    </div>
  );
}
