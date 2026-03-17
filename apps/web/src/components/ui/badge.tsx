import { cn } from "@/lib/utils";
import type { MasteryState, TrendDirection, DifficultyEstimate, GradingTier } from "@/lib/types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "accent" | "muted";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-elevated text-text-secondary border-border",
  success: "bg-success-muted text-success border-success/20",
  warning: "bg-warning-muted text-warning border-warning/20",
  danger: "bg-danger-muted text-danger border-danger/20",
  info: "bg-info-muted text-info border-info/20",
  accent: "bg-accent-muted text-accent border-accent/20",
  muted: "bg-surface-hover text-text-muted border-border-subtle",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium leading-tight",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function MasteryBadge({ state }: { state: MasteryState }) {
  const config: Record<MasteryState, { label: string; variant: BadgeVariant }> = {
    unseen: { label: "Unseen", variant: "muted" },
    learning: { label: "Learning", variant: "info" },
    unstable: { label: "Unstable", variant: "warning" },
    improving: { label: "Improving", variant: "accent" },
    mastered: { label: "Mastered", variant: "success" },
  };
  const c = config[state];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export function TrendBadge({ direction }: { direction: TrendDirection }) {
  const config: Record<TrendDirection, { label: string; variant: BadgeVariant }> = {
    improving: { label: "↑ Improving", variant: "success" },
    worsening: { label: "↓ Worsening", variant: "danger" },
    stable: { label: "→ Stable", variant: "muted" },
    insufficient_data: { label: "— No data", variant: "muted" },
  };
  const c = config[direction];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export function DifficultyBadge({ difficulty }: { difficulty: DifficultyEstimate }) {
  const config: Record<DifficultyEstimate, { variant: BadgeVariant }> = {
    easy: { variant: "success" },
    medium: { variant: "warning" },
    hard: { variant: "danger" },
  };
  const c = config[difficulty];
  return <Badge variant={c.variant}>{difficulty}</Badge>;
}

export function GradingBadge({ tier }: { tier: GradingTier }) {
  const config: Record<GradingTier, { variant: BadgeVariant }> = {
    exact: { variant: "success" },
    acceptable: { variant: "info" },
    inaccuracy: { variant: "warning" },
    mistake: { variant: "danger" },
    blunder: { variant: "danger" },
    illegal: { variant: "muted" },
  };
  const c = config[tier];
  return <Badge variant={c.variant}>{tier}</Badge>;
}
