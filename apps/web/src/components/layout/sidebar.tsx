"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  GraduationCap,
  RefreshCw,
  Map,
  Play,
  Clock,
  Settings,
  Crown,
  Search,
  Upload,
  Swords,
  BookOpen,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/import", label: "Import & Analyze", icon: Upload },
  { href: "/games", label: "Games", icon: Swords },
  { href: "/coach", label: "Coach", icon: GraduationCap },
  { href: "/review", label: "Review Queue", icon: RefreshCw },
  { href: "/repertoire", label: "Repertoire", icon: BookOpen },
  { href: "/curriculum", label: "Curriculum", icon: Map },
  { href: "/sessions", label: "Sessions", icon: Play },
  { href: "/history", label: "History", icon: Clock },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
        <Crown className="h-5 w-5 text-accent" />
        <span className="text-sm font-bold tracking-tight text-text-primary">Chess OS</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent-muted text-accent"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-border px-3 py-3">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left text-xs">Search...</span>
          <kbd className="rounded border border-border-subtle bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
            Ctrl+K
          </kbd>
        </button>
        <p className="px-3 text-[10px] font-medium uppercase tracking-widest text-text-muted">
          Local | Deterministic | Private
        </p>
      </div>
    </aside>
  );
}

