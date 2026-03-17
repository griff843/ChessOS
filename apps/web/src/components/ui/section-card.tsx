import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SectionCard({ title, subtitle, action, children, className, noPadding }: SectionCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface", className)}>
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className={cn(!noPadding && "p-5")}>{children}</div>
    </div>
  );
}
