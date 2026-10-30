import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Command, Flame, LayoutDashboard, LogOut, Menu, Search, Sparkles, X, ListTodo } from "lucide-react";

import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { ShortcutsOverlay } from "@/components/shell/ShortcutsOverlay";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, kbd: "g d" },
  { to: "/tasks", label: "Tasks", icon: ListTodo, kbd: "g t" },
  { to: "/habits", label: "Habits", icon: Flame, kbd: "g h" },
];

export function AppShell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let gPressed = false;
    let gTimer = null;

    const onKey = (event) => {
      const tag = event.target?.tagName;
      const isTyping =
        tag === "INPUT" || tag === "TEXTAREA" || event.target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
        return;
      }

      if (!isTyping && event.key === "?" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if (!isTyping && !event.metaKey && !event.ctrlKey) {
        if (event.key === "g") {
          gPressed = true;
          clearTimeout(gTimer);
          gTimer = setTimeout(() => {
            gPressed = false;
          }, 1200);
          return;
        }

        if (gPressed) {
          if (event.key === "d") navigate("/dashboard");
          else if (event.key === "t") navigate("/tasks");
          else if (event.key === "h") navigate("/habits");
          gPressed = false;
          clearTimeout(gTimer);
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [navigate]);

  const initials = (user?.name?.[0] || user?.email?.[0] || "A").toUpperCase();

  return (
    <div className="ambient-surface min-h-screen">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-md lg:hidden">
        <button onClick={() => setMobileOpen((value) => !value)} aria-label="Menu" type="button">
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <Link to="/dashboard" className="font-heading text-base font-semibold">
          AtomicTask
        </Link>
        <button onClick={() => setPaletteOpen(true)} aria-label="Search" type="button" className="text-muted-foreground">
          <Search className="size-5" />
        </button>
      </div>

      <div className="flex">
        <aside
          className={`app-sidebar fixed inset-y-0 left-0 z-40 flex flex-col justify-between transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div>
            <div className="flex items-center gap-2 px-5 pb-4 pt-5">
              <div
                className="grid size-8 place-items-center rounded-lg"
                style={{ background: "var(--accent-atomic)", color: "var(--accent-atomic-foreground)" }}
              >
                <Sparkles className="size-4" />
              </div>
              <span className="font-heading text-base font-semibold">AtomicTask</span>
            </div>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="mx-3 flex w-[calc(100%-24px)] items-center gap-2 rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-background"
            >
              <Search className="size-3.5" />
              <span className="flex-1 text-left">Search…</span>
              <kbd>⌘K</kbd>
            </button>

            <nav className="mt-3 px-2">
              {NAV.map(({ to, label, icon: Icon, kbd }) => {
                const active = location.pathname === to || location.pathname.startsWith(`${to}/`);
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-[color-mix(in_oklch,var(--accent-atomic)_10%,transparent)] text-foreground"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" style={active ? { color: "var(--accent-atomic)" } : undefined} />
                    <span className="flex-1">{label}</span>
                    <kbd className="opacity-0 transition-opacity group-hover:opacity-100">{kbd}</kbd>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-border/50 p-3">
            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <div
                className="grid size-7 place-items-center rounded-full text-xs font-bold"
                style={{ background: "var(--accent-atomic)", color: "var(--accent-atomic-foreground)" }}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{user?.name || user?.email}</p>
                <p className="truncate text-[10px] text-muted-foreground">Level {user?.currentLevel ?? 1}</p>
              </div>
              <ThemeToggle />
            </div>

            <button
              type="button"
              onClick={logout}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-3.5" /> Sign out
            </button>

            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              className="mt-0.5 flex w-full items-center justify-between rounded-lg px-3 py-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <span>Keyboard shortcuts</span>
              <kbd>?</kbd>
            </button>
          </div>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
        )}

        <main className="min-h-screen flex-1">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ShortcutsOverlay open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}

export default AppShell;
