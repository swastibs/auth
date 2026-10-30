import { useEffect, useMemo, useState } from "react";
import { Command, Flame, ListTodo, LogOut, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";

export function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  const commands = useMemo(
    () => [
      {
        group: "Create",
        items: [
          { label: "New task", icon: Plus, action: () => navigate("/tasks?new=1") },
          { label: "New habit", icon: Flame, action: () => navigate("/habits?new=1") },
        ],
      },
      {
        group: "Go to",
        items: [
          { label: "Overview", icon: Command, action: () => navigate("/dashboard") },
          { label: "Tasks", icon: ListTodo, action: () => navigate("/tasks") },
          { label: "Habits", icon: Flame, action: () => navigate("/habits") },
        ],
      },
      {
        group: "Account",
        items: [{ label: "Sign out", icon: LogOut, action: logout }],
      },
    ],
    [logout, navigate],
  );

  const flat = useMemo(() => {
    const all = commands.flatMap((group) => group.items);
    if (!query.trim()) return all;
    const text = query.toLowerCase();
    return all.filter((item) => item.label.toLowerCase().includes(text));
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event) => {
      if (event.key === "Escape") {
        onOpenChange(false);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelected((current) => Math.min(current + 1, Math.max(flat.length - 1, 0)));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelected((current) => Math.max(current - 1, 0));
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const selectedItem = flat[selected];
        if (selectedItem) {
          selectedItem.action?.();
        }
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flat, onOpenChange, open, selected]);

  if (!open) return null;

  let visibleIndex = 0;

  return (
    <>
      <div className="palette-backdrop" onClick={() => onOpenChange(false)} />
      <div className="fixed left-1/2 top-[15vh] z-[70] w-full max-w-lg -translate-x-1/2">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelected(0);
              }}
              placeholder="Type a command…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd>esc</kbd>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {commands.map((group) => {
              const visible = group.items.filter(
                (item) => !query.trim() || item.label.toLowerCase().includes(query.toLowerCase()),
              );
              if (visible.length === 0) return null;

              return (
                <div key={group.group} className="mb-1">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.group}
                  </p>
                  {visible.map((item) => {
                    const Icon = item.icon;
                    const isSelected = selected === visibleIndex;
                    visibleIndex += 1;

                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          item.action?.();
                          onOpenChange(false);
                        }}
                        onMouseEnter={() => setSelected(visibleIndex - 1)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                          isSelected ? "bg-[color-mix(in_oklch,var(--accent-atomic)_10%,transparent)]" : ""
                        }`}
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {flat.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">No commands match “{query}”</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default CommandPalette;
