import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "flat";
  className?: string;
}

export function MetricCard({ label, value, subtitle, icon, trend, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-5 transition-colors hover:bg-surface-hover",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
          {label}
        </span>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-text-primary">{value}</span>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium",
              trend === "up" && "text-success",
              trend === "down" && "text-danger",
              trend === "flat" && "text-text-muted"
            )}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-text-secondary">{subtitle}</p>}
    </div>
  );
}
