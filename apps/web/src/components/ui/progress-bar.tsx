import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  color?: "accent" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
  className?: string;
}

const colorMap = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercent,
  color = "accent",
  size = "sm",
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("w-full", className)}>
      {(label || showPercent) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && <span className="text-xs text-text-secondary">{label}</span>}
          {showPercent && <span className="text-xs font-medium text-text-primary">{pct.toFixed(0)}%</span>}
        </div>
      )}
      <div className={cn("w-full overflow-hidden rounded-full bg-surface-elevated", size === "sm" ? "h-1.5" : "h-2.5")}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", colorMap[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface SegmentedBarProps {
  segments: { value: number; color: string; label?: string }[];
  total: number;
  className?: string;
}

export function SegmentedBar({ segments, total, className }: SegmentedBarProps) {
  return (
    <div className={cn("flex h-2 w-full overflow-hidden rounded-full bg-surface-elevated", className)}>
      {segments.map((seg, i) => (
        <div
          key={i}
          className={cn("h-full transition-all duration-500", seg.color)}
          style={{ width: `${(seg.value / total) * 100}%` }}
          title={seg.label ? `${seg.label}: ${seg.value}` : `${seg.value}`}
        />
      ))}
    </div>
  );
}
