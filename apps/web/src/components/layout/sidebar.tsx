"use client";

import { useEffect, useState } from "react";
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
  Menu,
  X,
} from "lucide-react";

const primaryNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/games", label: "Games", icon: Swords },
  { href: "/coach", label: "Coach", icon: GraduationCap },
  { href: "/repertoire", label: "Repertoire", icon: BookOpen },
  { href: "/history", label: "History", icon: Clock },
];

const secondaryNavItems = [
  { href: "/import", label: "Import & Analyze", icon: Upload },
  { href: "/curriculum", label: "Curriculum", icon: Map },
  { href: "/sessions", label: "Sessions", icon: Play },
  { href: "/review", label: "Review", icon: RefreshCw },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close on navigation
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-3 top-3 z-30 rounded-lg border border-border bg-surface p-2 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5 text-text-primary" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-border bg-surface transition-transform duration-200",
          "max-lg:-translate-x-full",
          isOpen && "max-lg:translate-x-0"
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-2.5">
            <Crown className="h-5 w-5 text-accent" />
            <span className="text-sm font-bold tracking-tight text-text-primary">Chess OS</span>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 text-text-muted hover:text-text-primary lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-0.5">
            {primaryNavItems.map((item) => {
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
          </div>
          <div className="my-3 border-t border-border-subtle" />
          <div className="space-y-0.5">
            {secondaryNavItems.map((item) => {
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
          </div>
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
          <p className="px-3 text-[10px] font-medium uppercase tracking-widest text-text-muted hidden sm:block">
            Local | Deterministic | Private
          </p>
          <p className="px-3 text-[10px] font-medium uppercase tracking-widest text-text-muted sm:hidden">
            Local | Private
          </p>
        </div>
      </aside>
    </>
  );
}
