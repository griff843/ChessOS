import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Star,
  RefreshCw,
  Trophy,
  type LucideIcon,
} from "lucide-react";

type InsightType = "strength" | "weakness" | "trend" | "review" | "milestone";

interface Insight {
  type: InsightType;
  message: string;
  priority: number;
}

const insightConfig: Record<InsightType, { icon: LucideIcon; color: string }> = {
  strength: { icon: Star, color: "text-success" },
  weakness: { icon: AlertTriangle, color: "text-danger" },
  trend: { icon: TrendingUp, color: "text-info" },
  review: { icon: RefreshCw, color: "text-warning" },
  milestone: { icon: Trophy, color: "text-accent" },
};

export function InsightList({ insights }: { insights: Insight[] }) {
  const sorted = [...insights].sort((a, b) => a.priority - b.priority);
  return (
    <div className="space-y-2">
      {sorted.map((insight, i) => {
        const config = insightConfig[insight.type];
        const Icon = config.icon;
        return (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg bg-surface-elevated px-4 py-3 transition-colors hover:bg-surface-hover"
          >
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.color)} />
            <p className="text-sm leading-relaxed text-text-secondary">{insight.message}</p>
          </div>
        );
      })}
    </div>
  );
}

interface FocusItemProps {
  rank: number;
  category: string;
  reason: string;
  score: number;
}

export function FocusList({ items }: { items: FocusItemProps[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.rank}
          className="flex items-center gap-3 rounded-lg bg-surface-elevated px-4 py-3"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-muted text-[11px] font-bold text-accent">
            {item.rank}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary">{item.category}</p>
            <p className="truncate text-xs text-text-muted">{item.reason}</p>
          </div>
          <span className="text-xs font-medium text-text-muted">
            {(item.score * 100).toFixed(0)}
          </span>
        </div>
      ))}
    </div>
  );
}
