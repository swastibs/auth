import { Check, ChevronRight, Clock3, MoreHorizontal, Trash2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dueTone, relativeTime } from "@/lib/relative-time";

const PRIORITY_ACCENT = {
  low: { stripe: "oklch(0.65 0.05 250)", glow: "oklch(0.65 0.05 250 / 0.05)" },
  medium: { stripe: "oklch(0.68 0.12 235)", glow: "oklch(0.68 0.12 235 / 0.05)" },
  high: { stripe: "oklch(0.72 0.18 45)", glow: "oklch(0.72 0.18 45 / 0.06)" },
  urgent: { stripe: "oklch(0.62 0.22 25)", glow: "oklch(0.62 0.22 25 / 0.07)" },
};

export function FocusTaskRow({ task, expanded, onToggleExpand, onComplete, onReopen, onDelete, busy }) {
  const accent = PRIORITY_ACCENT[task.priority] ?? PRIORITY_ACCENT.medium;
  const tone = dueTone(task.dueDate);
  const isDone = task.status === "done";

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ${
        expanded ? "border-foreground/30 shadow-lg" : "border-border/60 hover:border-foreground/20"
      } ${isDone ? "opacity-55" : ""}`}
      style={{ background: `linear-gradient(90deg, ${accent.glow}, transparent 60%)` }}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accent.stripe }} />

      <div className="flex cursor-pointer items-start gap-3 px-4 py-3" onClick={onToggleExpand}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (isDone) onReopen(task);
            else onComplete(task);
          }}
          disabled={busy}
          aria-label={isDone ? "Reopen task" : "Complete task"}
          className="physical-check mt-0.5 shrink-0"
          data-checked={isDone}
        >
          {isDone && <Check className="size-3.5" strokeWidth={3.5} />}
        </button>

        <div className="min-w-0 flex-1">
          <h3 className={`font-medium leading-snug ${isDone ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            {task.dueDate && (
              <span
                className={`inline-flex items-center gap-1 ${
                  tone === "overdue"
                    ? "text-destructive"
                    : tone === "today"
                      ? "text-[var(--accent-atomic)]"
                      : "text-muted-foreground"
                }`}
              >
                <Clock3 className="size-3" />
                {tone === "overdue" ? relativeTime(task.dueDate).replace(" ago", " late") : relativeTime(task.dueDate)}
              </span>
            )}

            {task.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <ChevronRight
          className={`mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </div>

      {expanded && (
        <div className="border-t border-border/50 bg-background/40 px-4 py-3">
          {task.description && <p className="mb-3 text-sm text-muted-foreground">{task.description}</p>}

          <div className="flex flex-wrap gap-2">
            {isDone ? (
              <Button size="sm" variant="outline" onClick={() => onReopen(task)} disabled={busy}>
                <Undo2 className="size-3.5" /> Reopen
              </Button>
            ) : (
              <Button size="sm" onClick={() => onComplete(task)} disabled={busy}>
                <Check className="size-3.5" /> Complete
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(task)}
              disabled={busy}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
