import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCheck, Flame, PencilLine, Undo2 } from "lucide-react";

import { AppShell } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useHabit, useHabits } from "@/hooks/useHabits";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export default function HabitDetailPage() {
  const { habitId } = useParams();
  const navigate = useNavigate();
  const { data: habit, isLoading, isError } = useHabit(habitId);
  const { updateHabit, deleteHabit, checkIn, undoCheckIn } = useHabits();

  const [draft, setDraft] = useState({
    name: "",
    description: "",
    frequency: "daily",
    targetCount: "",
    reminderTime: "",
    color: "#7c3aed",
    icon: "☀️",
  });

  useEffect(() => {
    if (!habit) return;
    setDraft({
      name: habit.name ?? "",
      description: habit.description ?? "",
      frequency: habit.frequency ?? "daily",
      targetCount: habit.targetCount ?? "",
      reminderTime: habit.reminderTime ?? "",
      color: habit.color ?? "#7c3aed",
      icon: habit.icon ?? "☀️",
    });
  }, [habit]);

  if (isLoading) {
    return (
      <AppShell>
        <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-sm text-muted-foreground sm:px-6 sm:pt-12">Loading habit…</main>
      </AppShell>
    );
  }

  if (isError || !habit) {
    return (
      <AppShell>
        <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
          <Card>
            <CardHeader>
              <CardTitle>Habit not found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">This habit could not be loaded.</p>
              <Link to="/habits">
                <Button variant="outline">Back to habits</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </AppShell>
    );
  }

  const onSave = async () => {
    await updateHabit({
      habitId,
      updates: {
        name: draft.name,
        description: draft.description,
        frequency: draft.frequency,
        targetCount: draft.targetCount ? Number(draft.targetCount) : undefined,
        reminderTime: draft.reminderTime || null,
        color: draft.color || null,
        icon: draft.icon || null,
      },
    });
  };

  const onDelete = async () => {
    await deleteHabit(habitId);
    navigate("/habits");
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/habits" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to habits
          </Link>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => checkIn({ habitId, note: "" })}>
              <CheckCheck className="size-3.5" />
              Check in
            </Button>
            <Button size="sm" variant="outline" onClick={() => undoCheckIn(habitId)}>
              <Undo2 className="size-3.5" />
              Undo
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{habit.icon || "✨"}</span>
                {habit.name}
              </CardTitle>
              <CardDescription>{habit.description || "No description yet."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Current streak</div>
                  <div className="mt-1 flex items-center gap-2 font-medium"><Flame className="size-4" /> {habit.currentStreak ?? 0} days</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Longest streak</div>
                  <div className="mt-1 font-medium">{habit.longestStreak ?? 0} days</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Frequency</div>
                  <div className="mt-1 font-medium capitalize">{habit.frequency}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Completions</div>
                  <div className="mt-1 font-medium">{habit.totalCompletions ?? 0}</div>
                </div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Timeline</div>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <div>Last completion: {formatDate(habit.lastCompletionDate)}</div>
                  <div>Created: {formatDate(habit.createdAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PencilLine className="size-4" /> Edit habit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Name</label>
                <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Description</label>
                <textarea rows={3} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
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
                  <label className="mb-1.5 block text-sm font-medium">Target count</label>
                  <Input type="number" min="1" max="7" value={draft.targetCount} onChange={(event) => setDraft((current) => ({ ...current, targetCount: event.target.value }))} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Reminder</label>
                  <Input type="time" value={draft.reminderTime} onChange={(event) => setDraft((current) => ({ ...current, reminderTime: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Icon</label>
                  <Input value={draft.icon} onChange={(event) => setDraft((current) => ({ ...current, icon: event.target.value }))} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Color</label>
                <Input type="color" value={draft.color} onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))} className="h-10 px-1" />
              </div>

              <Button className="w-full" onClick={onSave}>Save updates</Button>
              <Button variant="destructive" className="w-full" onClick={onDelete}>Delete habit</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </AppShell>
  );
}
