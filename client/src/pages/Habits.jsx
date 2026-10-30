import { useMemo, useState } from "react";
import { Flame, Plus, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/shell/AppShell";
import { RitualGrid } from "@/components/habits/RitualGrid";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useHabits } from "@/hooks/useHabits";

const frequencyOptions = [
  { value: "all", label: "Any frequency" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom" },
];

export default function HabitsPage() {
  const [search, setSearch] = useState("");
  const [frequency, setFrequency] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    frequency: "daily",
    targetCount: "",
    reminderTime: "",
    color: "#7c3aed",
    icon: "☀️",
  });

  const filters = useMemo(
    () => ({
      search: search || undefined,
      frequency: frequency === "all" ? undefined : frequency,
      archived: showArchived,
      page: 1,
      limit: 50,
      sortBy: "currentStreak",
      sortOrder: "desc",
    }),
    [frequency, search, showArchived],
  );

  const { habits, stats, isLoading, error, createHabit, checkIn, undoCheckIn } = useHabits(filters);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!draft.name.trim()) {
      toast.error("A habit name is required.");
      return;
    }

    await createHabit({
      name: draft.name.trim(),
      description: draft.description.trim(),
      frequency: draft.frequency,
      targetCount: draft.frequency === "weekly" && draft.targetCount ? Number(draft.targetCount) : undefined,
      reminderTime: draft.reminderTime || undefined,
      color: draft.color || undefined,
      icon: draft.icon || undefined,
    });

    setDraft({
      name: "",
      description: "",
      frequency: "daily",
      targetCount: "",
      reminderTime: "",
      color: "#7c3aed",
      icon: "☀️",
    });
  };

  const checkedInIds = new Set(stats?.checkedInHabitIds ?? []);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-8 sm:pt-12">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {stats ? `${stats.checkedInToday ?? 0} checked in today · best ${stats.bestCurrentStreak ?? 0}d` : "Loading…"}
          </p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div>
              <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Ritual</h1>
              <p className="mt-1 text-sm text-muted-foreground">Your week, at a glance.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-[var(--accent-atomic)]" />
              {stats ? `${stats.activeHabits ?? 0} active` : "Build rhythm"}
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatPill label="Active habits" value={stats?.activeHabits ?? 0} />
          <StatPill label="Best streak" value={`${stats?.bestCurrentStreak ?? 0}d`} />
          <StatPill label="Checked in" value={stats?.checkedInToday ?? 0} />
          <StatPill label="Total completions" value={stats?.totalCompletions ?? 0} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="surface-card rounded-2xl p-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search habits…" className="pl-9" />
                </div>
                <select value={frequency} onChange={(event) => setFrequency(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground">
                  {frequencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setShowArchived((current) => !current)} className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground">
                  {showArchived ? "Hide archived" : "Show archived"}
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                Unable to load habits.
              </div>
            ) : null}

            {isLoading ? (
              <Skeleton className="h-64 w-full rounded-2xl" />
            ) : habits.length === 0 ? (
              <EmptyState
                icon={Flame}
                title="No rituals yet"
                description="Small things, done repeatedly, become who you are."
                action={
                  <Button onClick={() => setDraft((current) => ({ ...current, name: "" }))}>
                    <Plus className="size-4" /> Start your first ritual
                  </Button>
                }
              />
            ) : (
              <RitualGrid
                habits={habits}
                checkedInIds={checkedInIds}
                onCheckIn={async (habit) => { await checkIn({ habitId: habit._id, note: "" }); }}
                onUndo={async (habit) => { await undoCheckIn(habit._id); }}
                busyId={null}
              />
            )}
          </div>

          <div className="surface-card rounded-2xl p-4">
            <div className="mb-4 flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-lg bg-[color-mix(in_oklch,var(--accent-atomic)_12%,transparent)] text-[var(--accent-atomic)]">
                <Plus className="size-4" />
              </div>
              <div>
                <p className="font-heading text-xl font-semibold">New ritual</p>
                <p className="text-xs text-muted-foreground">Choose a pattern your week can repeat.</p>
              </div>
            </div>

            <form className="space-y-3" onSubmit={handleCreate}>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Name</label>
                <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Morning walk" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Description</label>
                <textarea rows={3} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" placeholder="What will you feel when this becomes automatic?" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Frequency</label>
                  <select value={draft.frequency} onChange={(event) => setDraft((current) => ({ ...current, frequency: event.target.value }))} className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Target</label>
                  <Input type="number" min="1" max="7" value={draft.targetCount} onChange={(event) => setDraft((current) => ({ ...current, targetCount: event.target.value }))} placeholder="3" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Reminder</label>
                  <Input type="time" value={draft.reminderTime} onChange={(event) => setDraft((current) => ({ ...current, reminderTime: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Icon</label>
                  <Input value={draft.icon} onChange={(event) => setDraft((current) => ({ ...current, icon: event.target.value }))} placeholder="☀️" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Color</label>
                <Input type="color" value={draft.color} onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))} className="h-10 px-1" />
              </div>

              <Button type="submit" className="w-full">
                <Plus className="size-4" /> Add ritual
              </Button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="surface-card rounded-xl px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
