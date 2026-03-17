"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generateNewSession, refreshInsights } from "@/app/actions/generation";
import {
  LayoutDashboard,
  GraduationCap,
  ListChecks,
  BookOpen,
  Layers,
  Clock,
  Settings,
  Search,
  ArrowRight,
  Plus,
  RefreshCw,
  Loader2,
  Swords,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  group: string;
  icon: React.ReactNode;
  href?: string;
  action?: () => Promise<{ success: boolean; message: string }>;
  keywords?: string[];
}

const commands: Command[] = [
  // Navigate
  { id: "dashboard", label: "Dashboard", group: "Navigate", icon: <LayoutDashboard className="h-4 w-4" />, href: "/", keywords: ["home", "overview"] },
  { id: "games", label: "Games", group: "Navigate", icon: <Swords className="h-4 w-4" />, href: "/games", keywords: ["library", "review", "game", "diagnosis"] },
  { id: "coach", label: "Coach", group: "Navigate", icon: <GraduationCap className="h-4 w-4" />, href: "/coach", keywords: ["advice", "plan"] },
  { id: "review", label: "Review", group: "Navigate", icon: <ListChecks className="h-4 w-4" />, href: "/review", keywords: ["due", "overdue", "queue"] },
  { id: "repertoire", label: "Repertoire", group: "Navigate", icon: <BookOpen className="h-4 w-4" />, href: "/repertoire", keywords: ["openings", "lines", "drill"] },
  { id: "curriculum", label: "Curriculum", group: "Navigate", icon: <Layers className="h-4 w-4" />, href: "/curriculum", keywords: ["roadmap", "plan"] },
  { id: "sessions", label: "Sessions", group: "Navigate", icon: <Layers className="h-4 w-4" />, href: "/sessions", keywords: ["study", "browse"] },
  { id: "history", label: "History", group: "Navigate", icon: <Clock className="h-4 w-4" />, href: "/history", keywords: ["completed", "past"] },
  { id: "settings", label: "Settings", group: "Navigate", icon: <Settings className="h-4 w-4" />, href: "/settings", keywords: ["config", "artifacts"] },
  // Generate
  {
    id: "generate-session",
    label: "Generate New Session",
    group: "Generate",
    icon: <Plus className="h-4 w-4" />,
    keywords: ["create", "new", "session", "study"],
    action: async () => {
      const res = await generateNewSession();
      if (res.success) {
        return { success: true, message: `Session created (${res.exerciseCount} exercises)` };
      }
      return { success: false, message: res.error ?? "Failed to generate session" };
    },
  },
  {
    id: "refresh-insights",
    label: "Refresh Insights",
    group: "Generate",
    icon: <RefreshCw className="h-4 w-4" />,
    keywords: ["dashboard", "coach", "curriculum", "update", "refresh"],
    action: async () => {
      const res = await refreshInsights();
      if (res.success) {
        return { success: true, message: "Dashboard, coach, and curriculum updated" };
      }
      return { success: false, message: res.error ?? "Failed to refresh insights" };
    },
  },
  // Study
  { id: "browse-sessions", label: "Browse Sessions", group: "Study", icon: <Layers className="h-4 w-4" />, href: "/sessions", keywords: ["start", "begin"] },
  { id: "review-urgent", label: "Review Urgent Exercises", group: "Study", icon: <ListChecks className="h-4 w-4" />, href: "/review", keywords: ["overdue", "due"] },
];

interface Toast {
  type: "success" | "error";
  message: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [executing, setExecuting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Filter commands
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        c.keywords?.some((k) => k.includes(q))
    );
  }, [query]);

  // Group filtered commands
  const groups = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const cmd of filtered) {
      const list = map.get(cmd.group) ?? [];
      list.push(cmd);
      map.set(cmd.group, list);
    }
    return map;
  }, [filtered]);

  const flatList = useMemo(() => filtered, [filtered]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const execute = useCallback(
    async (cmd: Command) => {
      if (cmd.action) {
        setExecuting(true);
        close();
        try {
          const result = await cmd.action();
          setToast({ type: result.success ? "success" : "error", message: result.message });
          if (result.success) router.refresh();
        } catch (err) {
          setToast({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
        } finally {
          setExecuting(false);
        }
      } else if (cmd.href) {
        close();
        router.push(cmd.href);
      }
    },
    [close, router]
  );

  // Keyboard shortcut to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    function handleCustomEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleCustomEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleCustomEvent);
    };
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation inside palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatList.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (flatList[selectedIndex]) execute(flatList[selectedIndex]);
      }
    },
    [close, execute, flatList, selectedIndex]
  );

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  let flatIndex = 0;

  return (
    <>
      {/* Palette overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />

          {/* Palette */}
          <div
            className="relative w-full max-w-lg rounded-xl border border-border bg-surface shadow-2xl"
            onKeyDown={handleKeyDown}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
              <Search className="h-4 w-4 text-text-muted" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command..."
                className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
              <kbd className="rounded border border-border-subtle bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[320px] overflow-y-auto p-2">
              {flatList.length === 0 && (
                <div className="py-8 text-center text-xs text-text-muted">
                  No matching commands
                </div>
              )}
              {Array.from(groups.entries()).map(([group, cmds]) => (
                <div key={group}>
                  <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                    {group}
                  </div>
                  {cmds.map((cmd) => {
                    const idx = flatIndex++;
                    return (
                      <button
                        key={cmd.id}
                        data-index={idx}
                        onClick={() => execute(cmd)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                          idx === selectedIndex
                            ? "bg-accent/10 text-accent"
                            : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                        )}
                      >
                        <span className={cn(idx === selectedIndex ? "text-accent" : "text-text-muted")}>
                          {cmd.icon}
                        </span>
                        <span className="flex-1 font-medium">{cmd.label}</span>
                        {idx === selectedIndex && (
                          <ArrowRight className="h-3 w-3 text-accent" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Executing spinner (bottom-right) */}
      {executing && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          <span className="text-sm text-text-secondary">Running...</span>
        </div>
      )}

      {/* Toast notification (bottom-right) */}
      {toast && !executing && (
        <div
          className={cn(
            "fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg",
            toast.type === "success"
              ? "border-success/20 bg-success-muted text-success"
              : "border-danger/20 bg-danger-muted text-danger"
          )}
        >
          <span className="text-sm">{toast.message}</span>
        </div>
      )}
    </>
  );
}
